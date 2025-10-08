# MQTT S7 Connector - Home Assistant Addon

_MQTT Siemens S7 connector to integrate Siemens PLC's with Home Assistant_

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

This project integrates [mqtt-s7-connector developed by Tim Roemisch](https://github.com/timroemisch/mqtt-s7-connector) as an add-on for Home Assistant.

The [DOCS.md](./DOCS.md) file will contain everything you need to know to make the addon work with your Home Assistant installation and your Siemens PLC.

## Weboberfläche für die Add-on-Konfiguration

Dieses Add-on enthält nun eine integrierte Weboberfläche, über die sich alle verfügbaren Parameter der `config.yaml` bequem anpassen lassen. Die Oberfläche ist über Home Assistant per Ingress erreichbar und bietet folgende Funktionen:

- Auswahl des gewünschten Log-Levels.
- Bearbeiten der Liste der verwendeten Konfigurationsdateien.
- Visualisierung von Add-on-Metadaten, Konfigurationsstatus sowie Dateidetails (Existenz & letzte Änderung).
- Validierung der Eingaben sowie sofortiges Speichern direkt in die bestehende `config.yaml` des Add-ons.

Die Oberfläche wird automatisch gestartet, sobald der Container läuft, und ist standardmäßig auf Port `8099` verfügbar (Ingress). Die zugrunde liegende `config.yaml` wird bei Bedarf aus einer Vorlage erzeugt, sodass immer eine bearbeitbare Konfigurationsdatei vorhanden ist.

## Credits

- [plcpeople / nodeS7](https://github.com/plcpeople/nodeS7)
- [mqttjs / MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Home Assistant Community Addons](https://github.com/hassio-addons/)
- [mqtt-s7connector](https://github.com/timroemisch/mqtt-s7-connector) developed by Tim Roemisch

## TODO

- [x] add additional log levels to mqtt-s7-connector
- [x] add multi PLC connection support
- [x] config file and documentation json > yaml (yaml is easier then json)
- [ ] rename object `devices` to `enities` (we are creating entities here not devices, **this will be a breaking update!**)
- [ ] test and document support for Siemens LOGO! with tsap_id's [it should work](https://github.com/plcpeople/nodeS7/issues/37)
- [ ] add screenshots and documentation for configuration in TIA portal, STEP 7 and LOGO!Soft
- [ ] add more Home Assistant [entities](https://developers.home-assistant.io/docs/core/entity)
- [ ] code cleanup

Pull requests welcome!
