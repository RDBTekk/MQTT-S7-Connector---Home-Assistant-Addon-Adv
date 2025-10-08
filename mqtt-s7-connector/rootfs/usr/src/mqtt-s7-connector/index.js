#!/usr/bin/env node
'use strict';

// imports
const mqtt_handler = require('./mqtt_handler');
const plc_handler = require('./plc');
const config_handler = require('./config_handler')
const sf = require('./service_functions');
const device_factory = require('./device_factory');
const validateConfig = require('./config_validator');

const config = config_handler.config();
validateConfig(config);
const mqtt = mqtt_handler.setup(config.mqtt, mqttMsgParser, initEntities);
const plc = plc_handler.setup(config.plc, initEntities);

let entities = [];

function initEntities() {
        if (mqtt_handler.isConnected() && plc_handler.isConnected()) {
                sf.debug("Initialize application");
                entities = [];

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
                        const topic_parts = topic.split('/');

                        // call a correct entity and ask for address from attribute
                        if (topic_parts[3] === "set") {
                                return entities[topic_parts[1]].get_plc_set_address(topic_parts[2]);
                        } else {
                                return entities[topic_parts[1]].get_plc_address(topic_parts[2]);
                        }
                });

                // parse config and create entities
                if (config.entities !== undefined) {

                        // create for each config entry an object
                        // and save it to the array
                        config.entities.forEach((entityConfig) => {
                                const newEntity = device_factory(entities, plc, mqtt, entityConfig, config.mqtt_base + "_" + config.mqtt_device_name);

                                // perform a discovery message
                                newEntity.discovery_topic = config.discovery_prefix;
                                newEntity.send_discover_msg();

                                // save the new entity in the array
                                // with the mqtt base as the index
                                entities[newEntity.mqtt_name] = newEntity;

                                sf.debug("New entity added: " + config.mqtt_base + "_" + config.mqtt_device_name + "/" + newEntity.mqtt_name);
                        });
                } else {
                        sf.error("No entities in config found !");
                }


		// start loop
		setInterval(() => {
			plc_update_loop();
		}, config.update_time);

		// discovery broadcast loop
		setInterval(() => {
                        for (const entityName in entities) {
                                entities[entityName].send_discover_msg();
                        }
                }, 300000); // 5 min

        } else {
                setTimeout(() => {
                        if (!mqtt_handler.isConnected() || !plc_handler.isConnected()) {
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
