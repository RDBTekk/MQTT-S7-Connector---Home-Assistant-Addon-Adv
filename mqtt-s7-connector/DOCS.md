# MQTT S7 Connector - Home Assistant Addon

This project integrates [mqtt-s7connector developed by Tim Roemisch](https://github.com/timroemisch/mqtt-s7-connector) as an add-on for Home Assistant.

This documentation file is edited so it will contain everything you need to know to make it work with your Home Assistant installation and your Siemens PLC.

- [Purpose](#purpose)
- [Requirements:](#requirements)
- [How to install](#how-to-install)
- [Addon options](#addon-options)
  - [Single PLC](#single-plc)
  - [Multiple PLC's](#multiple-plcs)
  - [Test mode](#test-mode)
- [Configuration](#configuration)
  - [Log level](#log-level)
  - [Config File](#config-file)
    - [`plc` Object](#plc-object)
    - [`mqtt` Object](#mqtt-object)
    - [`entities` Object](#entities-object)
  - [Address formatting](#address-formatting)
  - [Device types and attributes](#device-types-and-attributes)
  - [Attribute Options](#attribute-options)
    - [`rw` option](#rw-option)
    - [`update_interval` option](#update_interval-option)
    - [`unit_of_measurement` option](#unit_of_measurement-option)
    - [`set_plc` option](#set_plc-option)
    - [`write_back` option](#write_back-option)
  - [Device name](#device-name)
- [Auto Discovery](#auto-discovery)
- [License](#license)

## Purpose

This tool can receive data over mqtt and can write it to a designated address on a plc and vice versa, enabling smart home data to be displayed in the Home Assistant.

## Requirements:

- Home Assistant installation (HAOS or Supervised, other installation methods do not support addons)
- a [MQTT broker](https://github.com/home-assistant/addons/tree/master/mosquitto)
- the Home Assistant [MQTT integration](https://www.home-assistant.io/integrations/mqtt/)
- Siemens PLC (S7-300,400,1200 or 1500) with an ethernet connection. I will add support for LOGO
- Access to the PLC program/software

## How to install

- Open your Home Assistant web interface
- Go to Settings > Add-ons
- In the lower right corner click "Add-on Store"
- At the top right, click the 3 dots and "Repositories"
- Now add `https://github.com/dixi83/hassio-addons` and click "Add" followed by "Close"
- Find the "MQTT Siemens S7 Connector" in the store and click "Install"

Or add the repo by clicking:

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdixi83%2Fhassio-addons)

## Addon options

### Log level

There are several log levels if there are problems changing the level to debug could help identify the problem. If you have issues and want support, please share switch to debug and share the log information.

`warning` is the recommended log level.

### Config files

Here you can add a config file for each PLC you want to connect with. Store the files inside the Home Assistant `/config` share (for example `\config\mqtt-s7-connector` when using Samba).

#### Single PLC

If you just need to connect to 1 PLC, use this configuration:

```yaml
log_level: warning
config_files:
  - config.yaml
```

#### Multiple PLC's

If you have multiple PLC's use this as an example:

```yaml
log_level: warning
config_files:
  - config_plc1.yaml
  - config_plc2.yaml
```

### Test mode

When you want to build automations or validate MQTT topics without a live controller, enable the test mode in the add-on options (or via the web GUI button). The simulator behaves like a Siemens S7-1200: it keeps the connector running, publishes changing digital inputs, cycles analog values, and accepts write commands from Home Assistant entities. This makes it possible to design dashboards and logic before the real PLC is wired up.

The option is stored as `test_mode: true` inside the add-on configuration. While the simulator is active the PLC host/port settings are ignored, so the container can start even if no hardware is reachable.

### PLC address discovery and GUI dropdowns

Use the **PLC scan** button in the ingress GUI to discover the connected controller. The add-on reads the configured input (`I`), output (`Q`) and marker (`M`) bytes (up to the `PLC_SCAN_BYTE_LIMIT`) and expands them into bit addresses. The results are presented in a table together with the byte, bit and data source.

All detected addresses are grouped by area and exposed to the entity editor as dropdown options. When you edit an entity field such as `state`, `plc` or `set_plc`, the dropdown offers every scanned address plus all addresses already referenced in your configuration. You can still enter custom addresses manually – select **Eigene Adresse…** to open a text field – but for most use cases you can simply pick the detected value.

If no PLC is reachable yet, trigger the scan once the hardware is online or enable the built-in test mode to generate simulated addresses.

## Configuration

After installing the add-on and running it for the first time the connector copies `config.example.yaml` and `config.example.json` into the Home Assistant `/config` share. Use these examples as templates: duplicate `config.example.yaml` to `/config/config.yaml` (or create additional files such as `/config/config_plc1.yaml`) and reference the filenames in your add-on configuration.

There are several ways to get access to this folder and files, e.g.:

- Samba share add-on
- File editor add-on
- Visual Studio server add-on

The below documentation is for the YAML config format, as this will be default and recommended for Home Assistant. For configuring the addon in JSON please refer to: [JSON docs](https://github.com/dixi83/mqtt-s7-connector/blob/master/CONFIG_JSON.md)

### Config File

The configuration file has to be located in the same directory as the installation and has to be named like `config_plc1.yaml` or `config_plc2.yaml` as long as it matches the config_file setting of the addon.

**An example of a correct configuration file is found in [`config.example.yaml`](https://github.com/dixi83/mqtt-s7-connector/blob/master/config.example.yaml).**

The **yaml** config file has to be valid YAML (You can check [here](https://www.yamllint.com/) if it´s correct)  
and it is separated in 3 sections:

- [`plc:`](#plc-object)
- [`mqtt:`](#mqtt-object)
- [`entities:`](#entities-object)

#### `plc` Object

_General setup of the connection to the plc_

In the most use cases you only have to change the host value to the correct ip

```yaml
plc:
  port: 102
  host: 192.168.0.1
  rack: 0
  slot: 2
  # Optional TSAP IDs for Siemens LOGO! and STEP7/TIA Portal connections
  # local_tsap_id: 0x0100
  # remote_tsap_id: 0x0300
  debug: false
  # Optional simulator controls
  # test_mode: true
  # simulation_interval: 1000
```

`local_tsap_id` and `remote_tsap_id` allow the add-on to talk to Siemens LOGO! or S7 controllers that expect explicit TSAP identifiers. The values can be expressed either as decimal integers or hexadecimal strings (for example `0x0100`). When the fields are omitted the connector behaves exactly like previous releases.

If you enable `test_mode`, the connector starts the integrated simulator instead of connecting to a physical PLC. In this case the host, port, rack and slot values are ignored, letting you run the add-on without any hardware.

#### `mqtt` Object

_general setup of the connection to the mqtt broker_

The URL/host value can be one of the following protocols: 'mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'.

If you are using a self-signed certificate, use the `rejectUnauthorized: false` option. Beware that you are exposing yourself to man in the middle attacks, so it is a configuration that is not recommended for production environments.
[More info](https://github.com/mqttjs/MQTT.js#mqttconnecturl-options)

```yaml
mqtt:
  host: mqtts://host.com:1234
  user: u
  password: p
  rejectUnauthorized: true
```

#### `entities` Object

_list of all registered entities_

the list of entities is implemented as an array in yaml.  
each entity entry lives inside this list and will be configured there.

Each entity requires at least a 'name' and a 'type'; all other attributes are optional

```yaml
entities:
  - name: Dimmable Light,
    type: light,
    state: DB56,X150.0,
    brightness: DB56,BYTE151
  - name: Dimmable Light 2,
    type: light,
    state: DB56,X150.1,
```

### Address formatting

This tool uses the NodeS7 Library and it uses the same address formatting.  
An example of correct formatted addresses is found at the [NodeS7 Repository](https://github.com/plcpeople/nodeS7#examples)

**Address examples:**  
DB56,X150.0 _(read from DB56 one bit at 150.0)_  
DB51,REAL216 _(read from DB51 four bytes starting from byte 216)_  
DB56,BYTE40 _(read from DB56 one byte at 40)_

**Supported data types**  
X = 1 Bit -> converted to true / false  
BYTE = 1 Byte (8 Bit) -> converted to Int  
REAL = 4 Bytes (32 Bit) -> converted to Float

For more information see the [NodeS7 Repository](https://github.com/plcpeople/nodeS7#examples)

### Entity types and attributes

The entity type categories mirror the [Home Assistant MQTT components](https://www.home-assistant.io/integrations/#search/mqtt).
**It is strongly recommended to look into the [example configuration file](https://github.com/timroemisch/mqtt-s7-connector/blob/master/config.example.json) !!**

Current list of supported entity types with key attributes:

- `light`
  - `state` _(X)_ &mdash; on/off state of the entity
  - `brightness` _(BYTE)_ &mdash; value between 0-255

- `sensor`
  - `state` _(X/BYTE/REAL)_ &mdash; sensor reading (_read-only by default_)

- `switch`
  - `state` _(X)_ &mdash; on/off state of the entity

- `button`
  - `state` _(X)_ &mdash; write-only trigger bit used to emulate momentary buttons

- `number`
  - `state` _(BYTE/REAL/INT)_ &mdash; numeric value exposed through a slider or input box

- `climate`
  - `target_temperature` _(REAL)_
  - `current_temperature` _(REAL)_ (_read-only by default; updates every 15 minutes unless configured otherwise_)

- `heater`
  - `target_temperature` _(REAL)_
  - `current_temperature` _(REAL)_ (_read-only by default_)
  - Optional tuning keys such as `min_temp`, `max_temp`, and `temp_step`

- `cover`
  - `targetPosition` _(BYTE)_
  - `tiltAngle` _(BYTE)_
  - `currentPosition` _(BYTE)_ (_read-only by default_)
  - `currentTiltAngle` _(BYTE)_ (_read-only by default_)
  - `trigger` _(X)_ &mdash; internal helper bit toggled whenever a movement command is issued

- `binarycover`
  - `targetPosition` _(X)_
  - `currentPosition` _(X)_ (_read-only by default_)

- `fan`
  - `state` _(X)_ &mdash; on/off state of the fan
  - `percentage` _(BYTE)_ &mdash; fan speed in percent (0-100 by default)
  - `preset_mode` _(BYTE/STRING)_ &mdash; optional preset selector for modes such as *eco* or *boost*

- `lock`
  - `state` _(X)_ &mdash; locked/unlocked flag for doors, gates or valves

These entity definitions can be combined with Home Assistant metadata such as `device_name`, `device_class`, `value_template` or `command_template` to fine-tune discovery behaviour.

### Attribute Options

A "simple" device has just the plc address as the value of the attributes,  
however it's possible to configure each attribute individually by assigning an object instead of a string to it.

Simple Attribute:

```yaml
state: DB56,X150.0
```

Rewritten Attribute:

```yaml
state:
  plc: DB56,X150.0
```

Now after rewriting it's possible to add more options inside the brackets of the attribute.

**Available options:**

#### `rw` option

Changes the read / write permissions

|     | Read PLC | Write PLC | Subscribe MQTT | Publish MQTT |
| --- | -------- | --------- | -------------- | ------------ |
| r   | ✅       | ❌        | ❌             | ✅           |
| w   | ❌       | ✅        | ✅             | ❌           |
| rw  | ✅       | ✅        | ✅             | ✅           |

```yaml
state:
  plc: DB56,X150.0,
  rw: r
```

#### `update_interval` option

By default, (without this option) each attribute will send an update over mqtt after it changes, but this option will disable it and set an interval for updates.  
The time is set in ms

```yaml
state:
  plc: DB56,BYTE234,
  update_interval: 1000
```

#### `unit_of_measurement` option

This is only for Home Assistant. It will add an additional unit of measurement to the data.

```yaml
state:
  plc: DB56,REAL10,
  unit_of_measurement: km/h
```

#### `set_plc` option

By default, attributes have only one address, but if you define "set_plc"  
the attribute will read from "plc" and write to "set_plc"

```yaml
state:
  plc: DB56,X150.0,
  set_plc: DB56,X150.1
```

#### `write_back` option

When using both `plc_address` and `plc_set_address`, setting `write_back` to `true`
will automatically write any changes read from `plc_address` to `plc_set_address`.

```yaml
state:
  plc: DB56,X150.0,
  set_plc: DB56,X150.1,
  write_back: true
```

### Device name

If your device has multiple sensors/lights/switches etc., you can set for each item the `device_name` propertie for items that belong together. E.g. a device as multiple a garage door has 2 switches 1 for lockimng it and 1 open/closing the door and even a temperature sensor for the motor. This could look like this:

```
  - name: Garage door open/close
    type: binarycover
    currentPosition: DB56,X0.0
    targetPosition: DB56,X0.1
    device_name: Garage door
  - name: Garage door lock
    type: switch
    state: DB56,X0.3
    device_name: Garage door
  - name: Motor temperature
    type: sensor
    state: DB56,REAL2
    device_name: Garage door
```

![garage door example result](images/HA-device.png)

## Engineering tool quick-start

### TIA Portal

1. Öffne im Projektbaum **Geräte & Netze** und ermittle unter *Online & Diagnose* den verwendeten Rack/Slot der CPU.
2. Lege unter *PLC-Verbindungen* eine neue Verbindung vom Typ „anderer Station“ an und setze den **Remote-TSAP** z. B. auf `03.00`.
3. Trage den **Local-TSAP** `01.00` für den MQTT-S7-Connector ein und aktiviere den Kommunikationspartner.
4. Lade die Hardwarekonfiguration neu auf die CPU, damit die geänderten TSAP-Werte wirksam werden.

### STEP 7 Classic

1. Öffne NetPro, füge über *Einfügen > Neue Verbindung* eine „S7-Verbindung“ zu einem externen Partner hinzu.
2. Weise der Verbindung die CPU zu und setze **Local-TSAP** `01.00` sowie **Remote-TSAP** `03.00` (hexadezimal).
3. Speichere und übersetze die Hardwarekonfiguration und lade sie anschließend auf die Steuerung.
4. Nach dem Laden zeigt NetPro den Status der Verbindung als „Wird betrieben“ – die TSAP IDs sind aktiv.

### LOGO!Soft Comfort

1. Öffne *Tools > Ethernet-Verbindungen* und füge eine neue Verbindung vom Typ „S7 Kommunikation“ hinzu.
2. Wähle den relevanten Funktions- oder Datenbaustein, dessen Werte mit Home Assistant synchronisiert werden sollen.
3. Setze den **Local-TSAP** auf `01.00` und den **Remote-TSAP** auf `03.00`; aktiviere bei Bedarf zyklisches Schreiben.
4. Übertrage die Konfiguration in die LOGO! und prüfe im Verbindungsmonitor, ob der Status „Verbunden“ angezeigt wird.

## Auto Discovery

This tool will send for each device an auto-discovery message over mqtt in the correct format defined by Home Assistant.

The default mqtt topic is `homeassistant`, if for some reason this needs to be changed than it can be changed in the config file. (See the [example](https://github.com/dixi83/mqtt-s7-connector/blob/master/config.example.yaml#L9))

## License

[Licensed under ISC](LICENSE)  
Copyright (c) 2021 Tim Römisch
