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
- Bearbeiten der Inhalte der referenzierten YAML- oder JSON-Konfigurationsdateien in einem integrierten Editor inkl. Beispielvorlagen.
- Umschalten zwischen direkter Home-Assistant-API-Anbindung (Standard) und optionalem MQTT-Modus inklusive Statusanzeige.
- Validierung der Eingaben sowie sofortiges Speichern direkt in die bestehende `config.yaml` des Add-ons und der ausgewählten Konfigurationsdateien.
- Aktivierbarer Testmodus, der eine virtuelle S7-1200 samt digitalen/analogen Ein- und Ausgängen simuliert.
- Live-Scan der angebundenen SPS, inklusive tabellarischer Auflistung der gefundenen Ein- und Ausgänge samt Quelle und Status.
- Komfortable Dropdown-Auswahl für alle SPS-Adressen: erkannte Adressen werden gruppiert angeboten, können aber bei Bedarf weiterhin manuell eingetragen werden.
- Geführter Entitäts-Assistent mit Vorlagen für typische Aktoren und Sensoren (Lampe, Ventil, Garagentor, Temperatursensor usw.) inklusive automatischer MQTT- und SPS-Adressvorschläge.
- Dropdown-basierte Auswahlfelder für MQTT-Basis, MQTT-Gerätenamen, Discovery-Prefix sowie PLC-Port/Rack/Slot und TSAP-IDs – eigene Werte lassen sich jederzeit über ein eingeblendetes Eingabefeld hinterlegen.
- Kontextabhängige MQTT-Topic-Vorschläge pro Entität, die aus Basis- und Gerätenamen generiert werden und bei Bedarf überschrieben werden können.

Der Dienst bleibt zudem aktiv, wenn aktuell keine PLC erreichbar ist. Die Verbindung wird im Hintergrund in regelmäßigen Abständen neu aufgebaut, sodass die Weboberfläche jederzeit für Anpassungen verfügbar bleibt.

Über den neuen Testmodus lässt sich der integrierte PLC-Simulator per Button ein- oder ausschalten. Solange die Simulation aktiv ist, erzeugt sie typische Eingangswerte und akzeptiert Schreibbefehle der konfigurierten Entitäten – ideal, um Automationen und MQTT-Flows zu prüfen, bevor eine echte SPS verbunden wird.

Die Oberfläche wird automatisch gestartet, sobald der Container läuft, und ist standardmäßig auf Port `8099` verfügbar (Ingress). Beim ersten Start legt das Add-on zusätzlich die Dateien `config.example.yaml` und `config.example.json` im `/config/`-Verzeichnis an und erstellt daraus bei Bedarf eine initiale `config.yaml`, sodass immer eine bearbeitbare Konfigurationsdatei vorhanden ist.

## Credits

- [plcpeople / nodeS7](https://github.com/plcpeople/nodeS7)
- [mqttjs / MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Home Assistant Community Addons](https://github.com/hassio-addons/)
- [mqtt-s7connector](https://github.com/timroemisch/mqtt-s7-connector) developed by Tim Roemisch

## TODO

- [x] add additional log levels to mqtt-s7-connector
- [x] add multi PLC connection support
- [x] config file and documentation json > yaml (yaml is easier then json)
- [x] rename object `devices` to `entities` (we are creating entities here not devices, **this will be a breaking update!**)
- [x] test and document support for Siemens LOGO! with tsap_id's [it should work](https://github.com/plcpeople/nodeS7/issues/37)
- [x] add screenshots and documentation for configuration in TIA portal, STEP 7 and LOGO!Soft
- [x] add more Home Assistant [entities](https://developers.home-assistant.io/docs/core/entity)
- [ ] code cleanup

Pull requests welcome!
