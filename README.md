# MQTT Siemens S7 Connector – Home Assistant Add-on

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

Dieses Repository stellt den **MQTT Siemens S7 Connector** als komfortabel konfigurierbares Home-Assistant-Add-on bereit. Das
Add-on verbindet Siemens-SPSen (LOGO!, S7‑1200/1500, S7‑300/400, ET200 usw.) mit Home Assistant über MQTT, bietet eine
umfangreiche Weboberfläche für die gesamte Einrichtung und bringt einen integrierten Testmodus inklusive PLC-Simulator mit.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Funktionsumfang](#funktionsumfang)
3. [Voraussetzungen](#voraussetzungen)
4. [Installation](#installation)
5. [Zugriff auf die Weboberfläche](#zugriff-auf-die-weboberfläche)
6. [Konfiguration Schritt für Schritt](#konfiguration-schritt-für-schritt)
7. [PLC-Erkennung & Dropdown-Presets](#plc-erkennung--dropdown-presets)
8. [Testmodus & Simulator](#testmodus--simulator)
9. [Dateiablage & Templates](#dateiablage--templates)
10. [Fehlerdiagnose & Logging](#fehlerdiagnose--logging)
11. [Weiterentwicklung & Beiträge](#weiterentwicklung--beiträge)
12. [Credits](#credits)

## Überblick

Der Connector basiert auf dem Open-Source-Projekt [mqtt-s7-connector von Tim Roemisch](https://github.com/timroemisch/mqtt-s7-
connector) und wurde für Home Assistant angepasst. Sämtliche Einstellungen der ursprünglichen `config.yaml` lassen sich direkt
in der integrierten GUI ändern – die manuelle Bearbeitung von Dateien ist nicht mehr erforderlich. Standardmäßig registriert das
Add-on Geräte und Entitäten über die Home-Assistant-API und aktualisiert deren Zustände direkt; auf Wunsch kann weiterhin ein
MQTT-Modus aktiviert werden, der Discovery-Topics an einen Broker sendet.

## Funktionsumfang

- **Direkte Home-Assistant-Anbindung**: Entitäten werden ohne MQTT-Broker über die Core-API angelegt und aktualisiert; der MQTT-Modus lässt sich optional zuschalten.
- **Geführte Ersteinrichtung**: Dropdown-gestützte Auswahl für MQTT-Basis, Discovery-Prefix sowie PLC-Port, Rack, Slot und TSAP.
- **Geführter Entitätsassistent**: Vorlagen für Lampen, Ventile, Garagentore, Sensoren u. v. m. mit automatischen MQTT-Topic- und
  SPS-Adressvorschlägen.
- **PLC-Adress-Scan**: Liest angeschlossene SPSen aus und bietet gefundene Ein-/Ausgänge direkt in der Oberfläche an.
- **Testmodus mit Simulator**: Eine virtuelle S7‑1200 simuliert digitale/analoge Signale, um Automationen ohne Hardware zu testen.
- **Konfigurations-Editor**: Bearbeiten und Speichern der `config.yaml` und optionaler Zusatzdateien aus dem `/config`-Verzeichnis.
- **Robuste Laufzeit**: Add-on bleibt auch ohne erreichbare SPS aktiv und versucht automatisch, die Verbindung neu aufzubauen.
- **Umfangreiche Dokumentation**: Schritt-für-Schritt-Anleitungen für TIA Portal, STEP 7, LOGO!Soft und MQTT-Integration.

## Voraussetzungen

- Home Assistant OS oder Supervised mit Zugriff auf den Add-on-Store.
- Eine Siemens-SPS (LOGO!, S7‑1200/1500, S7‑300/400, ET200, SINUMERIK) **oder** Nutzung des integrierten Testmodus.
- Optional: Ein erreichbarer MQTT-Broker (z. B. der Home Assistant MQTT-Server), falls der MQTT-Modus genutzt werden soll.
- Netzwerkzugriff von Home Assistant auf die SPS.

## Installation

1. Repository über `Einstellungen → Add-ons → Add-on-Speicher → Repository hinzufügen` mit der URL dieses Projekts einbinden.
2. Das Add-on **MQTT Siemens S7 Connector** installieren.
3. Starten; beim ersten Lauf legt das Add-on Beispieldateien (`config.example.yaml` / `.json`) und eine initiale
   `/config/config.yaml` an.

## Zugriff auf die Weboberfläche

- Die Konfigurations-GUI läuft im Container auf Port `8099` und ist per **Home Assistant Ingress** erreichbar.
- Über die Add-on-Seite in Home Assistant den Button **„Öffnen“** wählen. Alternativ kann bei freigegebenem Port die URL
  `http://<home-assistant>:8099/` verwendet werden.
- Die Oberfläche protokolliert jeden Zugriff im Home-Assistant-Log und zeigt, welche CSS-/JS-Ressourcen geladen werden.

## Konfiguration Schritt für Schritt

### 1. Allgemeine Einstellungen

- **Add-on-Status** und erkannte Version werden im Kopfbereich angezeigt.
- Log-Level, Update-Intervall, Discovery-Optionen sowie MQTT-Basis- und Gerätenamen lassen sich über Presets oder eigene Werte
  definieren.

### 2. Integrationsmodus

- Die Karte **„Integrationsmodus“** entscheidet, ob Zustände über die Home-Assistant-API oder über MQTT verteilt werden.
- **Home Assistant API (Standard)**: kein externer Broker erforderlich; das Add-on meldet Geräte/Entitäten direkt an und
  verarbeitet Befehle über den Websocket der Core-Instanz.
- **MQTT**: Discovery-Topics und Statusupdates werden an den hinterlegten Broker geschickt. Diese Option ist sinnvoll, wenn bereits ein bestehendes MQTT-Setup genutzt wird oder externe Systeme auf die Topics zugreifen sollen.
- Bei Bedarf kann eine individuelle API-Basis-URL bzw. ein Long-Lived-Token hinterlegt werden (z. B. für Testinstallationen außerhalb des Supervisors).

### 3. PLC-Verbindung

- Host/IP eintragen oder aus dem Scan auswählen.
- Dropdown-Presets erleichtern die Wahl von **Port**, **Rack**, **Slot** und **TSAP-IDs**:
  - `102 (S7-1200/1500, LOGO!)`, `200 (S7-200 über Gateway)`, `502 (Modbus/TCP)` u. a.
  - Rack 0–3 mit Hinweisen zu LOGO!, S7-1200/1500 und S7-300/400.
  - Slot 0–4 inkl. CPU/Kommunikationsprozessor-Beschriftung.
  - TSAP-Paare für LOGO!, S7-1200/1500, S7-300/400 und geschützte Verbindungen.
- Eigene Werte lassen sich jederzeit über das eingeblendete Eingabefeld definieren.

### 4. MQTT-Einstellungen

- Diese Karte wird nur benötigt, wenn der MQTT-Modus aktiv ist.
- Broker-Host, Benutzer und Passwort eintragen.
- Vorausgefüllte Presets für MQTT-Basis (`s7`, `homeassistant`, `automation`, `factory`, …) und Gerätekennungen (`plc`, `logo`,
  `station`, `testbench`, …) beschleunigen die Einrichtung.
- TLS-Optionen und Retain-Verhalten sind ebenfalls über Schalter verfügbar.

### 5. Entitäten mit dem Assistenten anlegen

1. **Entitätsrichtung wählen** (Eingang/Ausgang).
2. Entsprechende Blaupause auswählen (Lampe, Ventil, Garagentor, Sensor, Thermostat, Lüfter, Schloss, Taster, etc.).
3. Der Assistent schlägt daraufhin MQTT-Themen sowie passende SPS-Adressen vor und zeigt gefundene PLC-Adressen im Dropdown an.
4. Zusätzliche Optionen (Device-Class, Helligkeit, Temperaturgrenzen, …) werden automatisch gesetzt, können aber angepasst werden.

### 6. Dateien speichern

- Änderungen werden in der angezeigten Datei im `/config`-Verzeichnis gespeichert.
- Die GUI bestätigt den erfolgreichen Schreibvorgang und zeigt Zeitstempel sowie Dateigröße an.
- Über die Dateiliste lassen sich weitere Konfigurationsdateien erstellen oder löschen.

## PLC-Erkennung & Dropdown-Presets

- Die Schaltfläche **„SPS scannen“** löst eine Live-Abfrage aus. Gefundene Ein-/Ausgänge werden nach Bereich (I/Q/M/DB) gruppiert.
- Dropdowns zeigen Adressen sortiert mit Typkennzeichnung (z. B. `Q0.0 – Garagentor`, `DB10.DBX2.0 – Temperatur Freigabe`).
- Für MQTT-Topics sowie PLC-Parameter stehen umfangreiche Presets bereit; freie Eingaben sind jederzeit möglich.

## Testmodus & Simulator

- Über den Kartenbereich **„Testmodus“** lässt sich eine virtuelle S7‑1200 zuschalten.
- Der Simulator erzeugt typische digitale Eingänge, zählt analoge Werte hoch und reagiert auf MQTT-Kommandos der konfigurierten
  Entitäten.
- Das Intervall kann über Dropdowns (100–5000 ms) angepasst werden.

## Dateiablage & Templates

- Standard-Dateipfad: `/config/config.yaml`. Zusätzliche Dateien werden ebenfalls unter `/config` abgelegt.
- Das Add-on liefert Beispielvorlagen (`config.example.yaml` und `.json`), die im GUI geladen und als Ausgangspunkt genutzt
  werden können.

## Fehlerdiagnose & Logging

- GUI-Server protokolliert eingehende Requests, normalisierte Pfade und ausgelieferte Assets.
- PLC- und MQTT-Logs erscheinen im Add-on-Protokoll (`Loglevel` konfigurierbar).
- Bei Verbindungsproblemen versucht das Add-on automatisch, PLC und MQTT erneut zu verbinden; Fehlerhinweise werden im UI
  angezeigt.

## Weiterentwicklung & Beiträge

- Issues und Pull Requests sind willkommen. Fokus liegt aktuell auf Code-Bereinigung, zusätzlichen Entitätstypen und erweiterten
  Diagnosemöglichkeiten.
- Entwicklungs-Hinweise (z. B. Entfernen des `image`-Keys während lokaler Tests) sind weiterhin am Ende dieses Dokuments
  kommentiert hinterlegt.

## Credits

- [plcpeople / nodeS7](https://github.com/plcpeople/nodeS7)
- [mqttjs / MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Home Assistant Community Add-ons](https://github.com/hassio-addons/)
- [mqtt-s7-connector](https://github.com/timroemisch/mqtt-s7-connector) entwickelt von Tim Roemisch

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
