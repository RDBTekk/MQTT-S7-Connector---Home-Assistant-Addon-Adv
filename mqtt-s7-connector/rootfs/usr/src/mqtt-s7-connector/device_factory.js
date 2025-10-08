let sf = require('./service_functions.js');
let dev_light = require('./devices/light.js');
let dev_cover = require('./devices/cover.js');
let dev_sensor = require('./devices/sensor.js');
let dev_switch = require('./devices/switch.js');
let dev_climate = require('./devices/climate.js');
let dev_heater = require('./devices/heater.js');
let dev_button = require('./devices/button.js');
let dev_binCover = require('./devices/binaryCover.js');
let dev_number = require('./devices/number.js');
let dev_fan = require('./devices/fan.js');
let dev_lock = require('./devices/lock.js');

// noinspection JSValidateJSDoc
/**
 * Creates all the entity topics
 * @param {[]} 		entities 	array of entities set in the config file
 * @param {*}	 	plc				plc handler functions
 * @param {MqttClient} 	mqtt		mqtt handler MqttClient
 * @param {[]} 		config			array of config details
 * @param {string} 	mqtt_base		base name for the state topics
 */
module.exports = function deviceFactory(entities, plc, mqtt, config, mqtt_base) {
	let type = config["type"].toLowerCase();

	// check name
	let name = config["name"] || "unnamed entity";
	let mqtt_name;

	// if the attribute 'mqtt_name' isn't set,
	// we have to generate one
	if (config["mqtt"]) {
		mqtt_name = config["mqtt"];
	} else {
		let rawMqttName = name;
		if (config.device_name) {
			// Support the composition of device_name and (entity) name
			rawMqttName = config.device_name + " " + name;
		}
		mqtt_name = rawMqttName.toLowerCase().split(' ').join('_').split('/').join('_').split('-').join('_');
	}
	// check for double names if exists log a warning

	if (entities[mqtt_name] !== undefined) {
		sf.warning("Name: " + entities[mqtt_name] + " is used double! This can cause strange behaviour. Fix this in your config file!");
	}

	if (config["device_name"] !== undefined) {
		config["device_identifier"] = config["device_name"].toLowerCase().split(' ').join('_').split('/').join('_').split('-').join('_');
	}

	config["origin"] = {
		name: 	"MQTT-S7-Connector - Home Assistant addon",
		sw: 	global.addon_version,
		url: 	"https://github.com/dixi83/hassio-addons/tree/main/mqtt-s7-connector"
	};

	// save new values back to config,
	// so it can be processed in the new object
	config["name"] = name;
	config["mqtt"] = mqtt_name;
	config["mqtt_base"] = mqtt_base;

	switch (type) {
		case "light":
			return new dev_light(plc, mqtt, config);

		case "sensor":
			return new dev_sensor(plc, mqtt, config);

		case "switch":
			return new dev_switch(plc, mqtt, config);

		case "cover":
			return new dev_cover(plc, mqtt, config);

		case "climate":
			return new dev_climate(plc, mqtt, config);

		case "heater":
			return new dev_heater(plc, mqtt, config);

		case "button":
			return new dev_button(plc, mqtt, config);

		case "binarycover":
			return new dev_binCover(plc, mqtt, config);

		case "number":
			return new dev_number(plc, mqtt, config);

		case "fan":
			return new dev_fan(plc, mqtt, config);

		case "lock":
			return new dev_lock(plc, mqtt, config);

		default:
			sf.debug("Unknown entity type '" + type + "'");
	}


}
