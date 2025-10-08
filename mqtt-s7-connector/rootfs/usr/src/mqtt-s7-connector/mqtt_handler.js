const mqtt = require('mqtt');

let connected = false;
const isConnected = function () {
	return connected;
};

const setup = function (config, onMessage, initDevices) {

	// connect to mqtt
	const client = mqtt.connect(config["host"], {
		username: config["user"],
		password: config["password"],
		rejectUnauthorized: config["rejectUnauthorized"]
	});

	// successful connected :)
	client.on('connect', function () {
		console.log('MQTT Connected');
		connected = true;
		initDevices();
	});

	client.on('disconnect', function () {
		console.log('MQTT Disconnected');
		connected = false;
	});

	client.on('close', function () {
		console.log('MQTT Closed');
		connected = false;
	});

	// handle incoming messages
	client.on('message', function (topic, msg) {
		onMessage(topic, msg.toString());
	});

	return client;
};

module.exports = {
	setup: setup,
	isConnected: isConnected
}
