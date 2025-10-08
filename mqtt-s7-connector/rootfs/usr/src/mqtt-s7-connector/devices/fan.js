let device = require('../device.js');

module.exports = class devFan extends device {
        constructor(plc, mqtt, config, mqtt_base) {
                super(plc, mqtt, config, mqtt_base);

                if (config.state) {
                        this.create_attribute(config.state, 'X', 'state');
                }

                if (config.percentage) {
                        this.create_attribute(config.percentage, '', 'percentage');
                }

                if (config.preset_mode) {
                        this.create_attribute(config.preset_mode, '', 'preset_mode');
                }
        }

        send_discover_msg() {
                const toNumber = (value, fallback) => {
                        const parsed = Number(value);
                        return Number.isFinite(parsed) ? parsed : fallback;
                };

                const info = {
                        name: this.name,
                        payload_on: 'true',
                        payload_off: 'false',
                        state_on: 'true',
                        state_off: 'false',
                        speed_range_min: toNumber(this.config.speed_range_min, 0),
                        speed_range_max: toNumber(this.config.speed_range_max, 100),
                };

                if (this.attributes['state']) {
                        if (this.attributes['state'].write_to_s7) {
                                info.command_topic = this.attributes['state'].full_mqtt_topic + '/set';
                        }
                        if (this.attributes['state'].publish_to_mqtt) {
                                info.state_topic = this.attributes['state'].full_mqtt_topic;
                        }
                }

                if (this.attributes['percentage']) {
                        if (this.attributes['percentage'].write_to_s7) {
                                info.percentage_command_topic = this.attributes['percentage'].full_mqtt_topic + '/set';
                        }
                        if (this.attributes['percentage'].publish_to_mqtt) {
                                info.percentage_state_topic = this.attributes['percentage'].full_mqtt_topic;
                        }
                        if (this.config.percentage_value_template) {
                                info.percentage_value_template = this.config.percentage_value_template;
                        }
                        if (this.config.percentage_command_template) {
                                info.percentage_command_template = this.config.percentage_command_template;
                        }
                }

                if (this.attributes['preset_mode']) {
                        if (this.attributes['preset_mode'].write_to_s7) {
                                info.preset_mode_command_topic = this.attributes['preset_mode'].full_mqtt_topic + '/set';
                        }
                        if (this.attributes['preset_mode'].publish_to_mqtt) {
                                info.preset_mode_state_topic = this.attributes['preset_mode'].full_mqtt_topic;
                        }
                        if (Array.isArray(this.config.preset_modes)) {
                                info.preset_modes = this.config.preset_modes;
                        }
                        if (this.config.preset_mode_command_template) {
                                info.preset_mode_command_template = this.config.preset_mode_command_template;
                        }
                        if (this.config.preset_mode_value_template) {
                                info.preset_mode_value_template = this.config.preset_mode_value_template;
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
