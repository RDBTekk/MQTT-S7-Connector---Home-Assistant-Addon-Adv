**Please note:**
Configuration files now use the `entities` array instead of `devices`. Existing setups are migrated automatically during container startup.

## 1.0.10

- feat: add an optional PLC test mode that simulates a Siemens S7-1200 including digital and analog signals
- feat: extend the web UI so the simulator can be toggled and its state is shown in the dashboard
- feat: detect PLC inputs/outputs, list them in the GUI scan table, and offer the addresses as grouped dropdown options when editing entities
- feat: add a guided entity wizard with templates (Lampe, Ventil, Garagentor, Sensoren usw.) und automatischen MQTT-/Adressvorschlägen
- feat: ergänze vordefinierte Dropdowns für MQTT-Basis, Gerätenamen, Discovery-Prefix sowie PLC-Port/Rack/Slot und TSAP-IDs mit optionalen Freitextfeldern
- feat: liefere MQTT-Topic-Vorschläge pro Entität basierend auf Basis- und Gerätenamen, inklusive schneller Umschaltung auf eigene Werte

## 1.0.8

- fix(sensor): Missing unit_of_measurement in ha-discovery payload ( @psi-4ward )
- feat(sensor): Support more ha-discovery options ( @psi-4ward )
- fix: Value gets not published if it is 0 ( @psi-4ward )
- feat(device): Add support for "manufacturer" in device section ( @psi-4ward )
- feat(device): Generate more unique mqttNames when name and device_nam… ( @psi-4ward )
- feat(config): Add example how to configure a device with sensors ( @psi-4ward )

## 1.0.7

- Added `number` device

## 1.0.6

- updated git package from 2.43.4-r0 to 2.43.5-r0

## 1.0.5

- Updated start script, which I was forgotten...

## 1.0.4

- skipped some test versions
- updated javascript application to you can define devices now be combined in a MQTT device by setting the `device_name` property.
- origin info is now written to the dicovery topic.

## 1.0.1

- fixed `eval: line 71: unexpected EOF while looking for matching '"'`

## 1.0.0

- First release
