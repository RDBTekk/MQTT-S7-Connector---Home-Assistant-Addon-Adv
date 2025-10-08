let device = require('../device.js');

module.exports = class devLock extends device {
        constructor(plc, mqtt, config, mqtt_base) {
                super(plc, mqtt, config, mqtt_base);

                if (config.state) {
                        this.create_attribute(config.state, 'X', 'state');
                }
        }

        send_discover_msg() {
                const info = {
                        name: this.name,
                        payload_lock: 'true',
                        payload_unlock: 'false',
                        state_locked: 'true',
                        state_unlocked: 'false',
                };

                if (this.attributes['state']) {
                        if (this.attributes['state'].write_to_s7) {
                                info.command_topic = this.attributes['state'].full_mqtt_topic + '/set';
                        }
                        if (this.attributes['state'].publish_to_mqtt) {
                                info.state_topic = this.attributes['state'].full_mqtt_topic;
                        }
                }

                ['device_class', 'value_template', 'command_template', 'name'].forEach((key) => {
                        if (this.config[key]) {
                                info[key] = this.config[key];
                        }
                });

                super.send_discover_msg(info);
        }
};
