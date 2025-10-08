require("../service_functions.js");
let device = require("../device.js");

module.exports = class devButton extends device {
  constructor(plc, mqtt, config) {
        super(plc, mqtt, config);

    // binary state
    if(config.state) {
      this.create_attribute(config.state, "X", "state");
      this.attributes["state"].set_RW("w"); // write-only
    }

  }

  rec_mqtt_data(attr, data) {
    // If a "PRESS" state gets published to MQTT,
    // we will set the configured state Bit to 1 for the press_duration time
    if(data === 'PRESS') {
      this.attributes["state"].rec_mqtt_data("true", e => e && console.error);
      setTimeout(() => {
        this.attributes["state"].rec_mqtt_data("false", e => e && console.error);
      }, this.config["press_duration"] || 500);
    }
  }

  send_discover_msg() {
    let info = {
      name: this.name,
      command_topic: this.attributes["state"].full_mqtt_topic + "/set",
    };

    // Support home-assistant discover options
    // https://www.home-assistant.io/integrations/mqtt/
    [
      'device_class',
      'value_template',
      'command_template',
      'name',
    ].forEach((key) => {
      if(this.config[key]) {
        info[key] = this.config[key];
      }
    });

    super.send_discover_msg(info);
  }


}
