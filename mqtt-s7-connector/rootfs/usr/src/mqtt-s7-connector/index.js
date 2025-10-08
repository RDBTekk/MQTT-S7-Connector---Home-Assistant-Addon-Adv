#!/usr/bin/env node
'use strict';

// imports
const mqtt_handler = require('./mqtt_handler');
const ha_handler = require('./ha_handler');
const plc_handler = require('./plc');
const config_handler = require('./config_handler')
const sf = require('./service_functions');
const device_factory = require('./device_factory');
const validateConfig = require('./config_validator');

const config = config_handler.config();
validateConfig(config);
const integrationMode = (config.integration && config.integration.mode) ? config.integration.mode : 'homeassistant';
let transport = null;

if (integrationMode === 'mqtt') {
        transport = mqtt_handler.setup(config.mqtt, mqttMsgParser, initEntities);
} else {
        transport = ha_handler.setup(config, mqttMsgParser, initEntities);
}

const plc = plc_handler.setup(config.plc, initEntities);

let entities = {};
let plcUpdateInterval = null;
let discoveryInterval = null;

function initEntities() {
        const integrationReady = integrationMode === 'mqtt' ? mqtt_handler.isConnected() : ha_handler.isConnected();

        if (integrationReady && plc_handler.isConnected()) {
                sf.debug("Initialize application");
                entities = {};

                if (transport && typeof transport.reset === 'function') {
                        transport.reset();
                }

                if (plcUpdateInterval) {
                        clearInterval(plcUpdateInterval);
                        plcUpdateInterval = null;
                }

                if (discoveryInterval) {
                        clearInterval(discoveryInterval);
                        discoveryInterval = null;
                }

		// set default config values if they arent set
		config.update_time = config.update_time || 1000; // 1 second
		config.temperature_interval = config.temperature_interval || 300000; // 300 seconds or 5 minutes

		config.mqtt_base = config.mqtt_base || "s7";
		config.mqtt_device_name = config.mqtt_device_name || "plc";
		config.retain_messages = config.retain_messages || false;

		config.discovery_prefix = config.discovery_prefix || "homeassistant";
		config.discovery_retain = config.discovery_retain || false;

		// namespace translation
                plc.setTranslationCB((topic) => {
                        if (typeof topic !== 'string') {
                                return topic;
                        }

                        const topic_parts = topic.split('/');
                        if (topic_parts.length < 3) {
                                return topic;
                        }

                        const entity = entities[topic_parts[1]];
                        if (!entity) {
                                sf.debug("Translation requested for unknown entity '" + topic_parts[1] + "'");
                                return null;
                        }

                        const attributeName = topic_parts[2];

                        if (topic_parts[3] === "set") {
                                return entity.get_plc_set_address(attributeName);
                        }

                        return entity.get_plc_address(attributeName);
                });

                // parse config and create entities
                if (config.entities !== undefined) {

                        // create for each config entry an object
                        // and save it to the array
                        config.entities.forEach((entityConfig) => {
                                const newEntity = device_factory(entities, plc, transport, entityConfig, config.mqtt_base + "_" + config.mqtt_device_name);

                                // save the new entity before PLC subscriptions are registered
                                entities[newEntity.mqtt_name] = newEntity;

                                newEntity.discovery_topic = config.discovery_prefix;
                                newEntity.registerPlcSubscriptions();
                                newEntity.send_discover_msg();

                                sf.debug("New entity added: " + config.mqtt_base + "_" + config.mqtt_device_name + "/" + newEntity.mqtt_name);
                        });
                } else {
                        sf.error("No entities in config found !");
                }


		// start loop
                plcUpdateInterval = setInterval(() => {
                        plc_update_loop();
                }, config.update_time);

                // discovery broadcast loop
                discoveryInterval = setInterval(() => {
                        for (const entityName in entities) {
                                entities[entityName].send_discover_msg();
                        }
                }, 300000); // 5 min

        } else {
        setTimeout(() => {
                const transportReady = integrationMode === 'mqtt'
                        ? mqtt_handler.isConnected()
                        : ha_handler.isConnected();

                if (!transportReady || !plc_handler.isConnected()) {
                        sf.error("Connection Timeout");
                }
        }, 5000)
        }
}

function mqttMsgParser(topic, msg) {
        const topic_parts = topic.split('/');

        // check if the topic is in the mqtt_base
        if (topic_parts[0] === config.mqtt_base + "_" + config.mqtt_device_name) {
                const entity = topic_parts[1];
                const attribute = topic_parts[2];

                // if entity exists
                if (entities[entity]) {

                        // give all data to an entity
                        entities[entity].rec_mqtt_data(attribute, msg);
                }
        }
}


function plc_update_loop() {
        plc.readAllItems((err, readings) => {
                if (err) {
                        sf.debug("Error while reading from PLC !");
                        return;
                }

                // publish all data
                for (const topic in readings) {
                        const topic_parts = topic.split('/');
                        const entity = topic_parts[1];
                        const attribute = topic_parts[2];

                        // if entity exists
                        if (entities[entity]) {
                                // give all data to an entity
                                entities[entity].rec_s7_data(attribute, readings[topic]);
                        }
                }

        });
}
