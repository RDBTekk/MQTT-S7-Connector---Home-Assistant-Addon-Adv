'use strict';

const sf = require('./service_functions');

let connected = false;

class HaTransport {
        constructor(config, onMessage, onReady) {
                this.config = config || {};
                this.onMessage = onMessage;
                this.onReady = onReady;

                const integration = this.config.integration || {};
                const haConfig = integration.homeassistant || {};

                this.token = process.env.SUPERVISOR_TOKEN || haConfig.access_token;

                const base = haConfig.base_url || 'http://supervisor/core/api';
                this.restBase = base.endsWith('/') ? base.slice(0, -1) : base;
                if (!this.restBase.endsWith('/api')) {
                        this.restBase = `${this.restBase}/api`;
                }
                this.wsBase = this.restBase.replace(/\/api$/, '/websocket').replace('http://', 'ws://').replace('https://', 'wss://');

                if (!this.token) {
                        throw new Error('Home Assistant access token missing for direct API mode.');
                }

                this.entities = new Map();
                this.topicToEntity = new Map();
                this.commandTopics = new Map();
                this.pendingCommandTopics = new Map();
                this.entityStates = new Map();
                this.entityAttributes = new Map();
                this.lastContextIds = new Map();
                this.entityCommandMeta = new Map();

                this.deviceInfo = null;
                this.configEntryId = null;
                this.deviceId = null;

                this.ws = null;
                this.wsConnected = false;
                this.messageId = 1;
                this.pendingMessages = new Map();

                this.ready = false;

                this.connectWebSocket();
        }

        isConnected() {
                return connected && this.ready;
        }

        setupDeviceInfo(entity) {
                if (this.deviceInfo) {
                        return;
                }

                this.deviceInfo = {
                        name: entity.config.device_name || `${this.config.mqtt_base || 's7'} PLC`,
                        identifiers: [[
                                'mqtt_s7_connector',
                                entity.config.device_identifier || `${entity.config.mqtt_base}_${entity.mqtt_name}`
                        ]],
                        manufacturer: entity.config.manufacturer || 'Siemens',
                        model: (this.config.plc && this.config.plc.model) || 'PLC',
                        sw_version: global.addon_version || 'unknown',
                };
        }

        registerEntity(entity) {
                try {
                        this.setupDeviceInfo(entity);
                } catch (error) {
                        sf.debug(`Failed to derive device info: ${error.message}`);
                }

                const domain = entity.ha_component || entity.type;
                const mqttName = entity.mqtt_name;
                const entityId = `${domain}.${mqttName}`.toLowerCase();

                const baseTopic = `${entity.config.mqtt_base}/${entity.mqtt_name}`;

                const baseAttributes = {
                        friendly_name: entity.name,
                };

                if (entity.config.unit_of_measurement) {
                        baseAttributes.unit_of_measurement = entity.config.unit_of_measurement;
                }

                if (entity.config.device_class) {
                        baseAttributes.device_class = entity.config.device_class;
                }

                if (entity.config.icon) {
                        baseAttributes.icon = entity.config.icon;
                }

                if (entity.config.origin) {
                        baseAttributes.attribution = `${entity.config.origin.name} ${entity.config.origin.sw}`;
                }

                this.entities.set(entityId, {
                        entity,
                        baseTopic,
                        domain,
                });

                this.entityStates.set(entityId, 'unknown');
                this.entityAttributes.set(entityId, { ...baseAttributes });

                const attributes = entity.attributes || {};

                Object.keys(attributes).forEach((key) => {
                        const attr = attributes[key];
                        if (!attr || !attr.full_mqtt_topic) {
                                return;
                        }

                        this.topicToEntity.set(attr.full_mqtt_topic, {
                                entityId,
                                attributeName: key,
                                attribute: attr,
                        });

                        const setTopic = `${attr.full_mqtt_topic}/set`;

                        if (attr.write_to_s7) {
                                this.commandTopics.set(setTopic, {
                                        entityId,
                                        attributeName: key,
                                        attribute: attr,
                                });
                        }

                        if (this.pendingCommandTopics.has(setTopic)) {
                                this.pendingCommandTopics.delete(setTopic);
                        }
                });

                const stateAttribute = attributes.state && attributes.state.write_to_s7 ? 'state' : Object.keys(attributes).find((key) => attributes[key] && attributes[key].write_to_s7);
                if (stateAttribute) {
                        const attr = attributes[stateAttribute];
                        const setTopic = `${attr.full_mqtt_topic}/set`;
                        this.entityCommandMeta.set(entityId, {
                                setTopic,
                                attribute: attr,
                                attributeName: stateAttribute,
                        });
                }

                this.ensureRegistrations(entityId).catch((error) => {
                        sf.debug(`Failed to register entity '${entityId}': ${error.message}`);
                });
        }

        subscribe(topic) {
                if (!topic) {
                        return;
                }

                if (this.commandTopics.has(topic)) {
                        return;
                }

                this.pendingCommandTopics.set(topic, true);
        }

        unsubscribe(topic) {
                this.commandTopics.delete(topic);
                this.pendingCommandTopics.delete(topic);
        }

        async ensureRegistrations(entityId) {
                await this.waitUntilReady();

                await this.ensureConfigEntry();
                await this.ensureDevice();

                await this.ensureEntityRegistry(entityId);

                if (!this.entityAttributes.has(entityId)) {
                        return;
                }

                const attributes = this.entityAttributes.get(entityId);
                const state = this.entityStates.get(entityId) || 'unknown';

                await this.updateState(entityId, state, attributes);
        }

        async waitUntilReady() {
                if (this.ready) {
                        return;
                }

                await new Promise((resolve) => {
                        const check = () => {
                                if (this.ready) {
                                        resolve();
                                } else {
                                        setTimeout(check, 250);
                                }
                        };
                        check();
                });
        }

        async callRest(method, path, body) {
                const url = `${this.restBase}${path}`;

                const options = {
                        method,
                        headers: {
                                Authorization: `Bearer ${this.token}`,
                                'Content-Type': 'application/json',
                        },
                };

                if (body !== undefined) {
                        options.body = JSON.stringify(body);
                }

                const response = await fetch(url, options);
                if (!response.ok) {
                                const text = await response.text();
                                throw new Error(`Home Assistant API ${method} ${path} failed with ${response.status}: ${text}`);
                }

                if (response.status === 204) {
                        return null;
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                        return response.json();
                }

                return null;
        }

        async ensureConfigEntry() {
                if (this.configEntryId) {
                        return;
                }

                try {
                        const entries = await this.callRest('POST', '/config/config_entries/list', {});
                        if (Array.isArray(entries)) {
                                const existing = entries.find((entry) => entry.domain === 'mqtt_s7_connector' || entry.title === 'MQTT S7 Connector Add-on');
                                if (existing) {
                                        this.configEntryId = existing.entry_id;
                                        return;
                                }
                        }

                        const fallback = Array.isArray(entries) ? entries.find((entry) => entry.domain === 'homeassistant') : null;

                        if (fallback) {
                                this.configEntryId = fallback.entry_id;
                                return;
                        }

                        const created = await this.callRest('POST', '/config/config_entries/create', {
                                domain: 'mqtt_s7_connector',
                                data: {},
                                title: 'MQTT S7 Connector Add-on',
                        });

                        if (created && created.entry_id) {
                                this.configEntryId = created.entry_id;
                        }
                } catch (error) {
                        sf.debug(`Unable to ensure config entry: ${error.message}`);
                }
        }

        async ensureDevice() {
                if (this.deviceId || !this.deviceInfo) {
                        return;
                }

                try {
                        const devices = await this.callRest('POST', '/config/device_registry/list', {});
                        if (Array.isArray(devices)) {
                                const found = devices.find((device) => Array.isArray(device.identifiers) && device.identifiers.some((identifier) => Array.isArray(identifier) && identifier[0] === 'mqtt_s7_connector'));
                                if (found) {
                                        this.deviceId = found.id;
                                        return;
                                }
                        }

                        const payload = {
                                config_entry_id: this.configEntryId,
                                identifiers: this.deviceInfo.identifiers,
                                manufacturer: this.deviceInfo.manufacturer,
                                model: this.deviceInfo.model,
                                name: this.deviceInfo.name,
                                sw_version: this.deviceInfo.sw_version,
                        };

                        const created = await this.callRest('POST', '/config/device_registry/create', payload);
                        if (created && created.id) {
                                this.deviceId = created.id;
                        }
                } catch (error) {
                        sf.debug(`Unable to ensure device registry entry: ${error.message}`);
                }
        }

        async ensureEntityRegistry(entityId) {
                if (!entityId) {
                        return;
                }

                try {
                        const entities = await this.callRest('POST', '/config/entity_registry/list', {});
                        if (Array.isArray(entities)) {
                                const found = entities.find((entity) => entity.entity_id === entityId);
                                if (found) {
                                        return;
                                }
                        }

                        const domain = entityId.split('.')[0];
                        const uniqueId = entityId.replace('.', '_');

                        const payload = {
                                config_entry_id: this.configEntryId,
                                device_id: this.deviceId,
                                domain,
                                platform: 'mqtt_s7_connector',
                                unique_id: uniqueId,
                                entity_id: entityId,
                                original_name: entityId.split('.')[1],
                                suggested_object_id: entityId.split('.')[1],
                        };

                        await this.callRest('POST', '/config/entity_registry/create', payload);
                } catch (error) {
                        sf.debug(`Unable to ensure entity registry entry for ${entityId}: ${error.message}`);
                }
        }

        async updateState(entityId, state, attributes) {
                try {
                        const payload = {
                                state: state != null ? state.toString() : 'unknown',
                                attributes: attributes || {},
                        };

                        const response = await this.callRest('POST', `/states/${entityId}`, payload);
                        if (response && response.context && response.context.id) {
                                this.lastContextIds.set(entityId, response.context.id);
                        }
                } catch (error) {
                        sf.debug(`Failed to publish Home Assistant state for ${entityId}: ${error.message}`);
                }
        }

        publish(topic, payload) {
                if (!topic) {
                        return;
                }

                const mapping = this.topicToEntity.get(topic);
                if (!mapping) {
                        return;
                }

                const entityId = mapping.entityId;
                const attributeName = mapping.attributeName;
                const attribute = mapping.attribute;

                const value = this.convertValue(attribute, payload);

                if (attributeName === 'state') {
                        const haState = this.toHaState(entityId, value);
                        this.entityStates.set(entityId, haState);
                } else {
                        const attrs = this.entityAttributes.get(entityId) || {};
                        attrs[attributeName] = value;
                        this.entityAttributes.set(entityId, attrs);
                }

                const attributes = this.entityAttributes.get(entityId) || {};
                const state = this.entityStates.get(entityId) || 'unknown';

                this.updateState(entityId, state, attributes);
        }

        reset() {
                this.entities.clear();
                this.topicToEntity.clear();
                this.commandTopics.clear();
                this.pendingCommandTopics.clear();
                this.entityStates.clear();
                this.entityAttributes.clear();
                this.entityCommandMeta.clear();
                this.deviceInfo = null;
                this.deviceId = null;
        }

        convertValue(attribute, value) {
                if (value === undefined || value === null) {
                        return value;
                }

                let processed = value;

                if (typeof processed === 'string') {
                        const lower = processed.toLowerCase();
                        if (attribute.type === 'X') {
                                if (lower === 'true' || lower === 'on' || lower === '1') {
                                        processed = true;
                                } else if (lower === 'false' || lower === 'off' || lower === '0') {
                                        processed = false;
                                }
                        } else if (attribute.type === 'REAL' || attribute.type === 'INT' || attribute.type === 'DINT') {
                                const numeric = Number(processed);
                                if (!Number.isNaN(numeric)) {
                                        processed = numeric;
                                }
                        }
                }

                return processed;
        }

        toHaState(entityId, value) {
                const meta = this.entities.get(entityId);
                if (!meta) {
                        return value === true ? 'on' : value === false ? 'off' : value;
                }

                const { domain } = meta;

                switch (domain) {
                        case 'switch':
                        case 'light':
                        case 'fan':
                                if (value === true || value === 'true' || value === 'on' || value === 1) {
                                        return 'on';
                                }
                                if (value === false || value === 'false' || value === 'off' || value === 0) {
                                        return 'off';
                                }
                                return value;
                        case 'lock':
                                if (value === true || value === 'true' || value === 'unlocked') {
                                        return 'unlocked';
                                }
                                if (value === false || value === 'false' || value === 'locked') {
                                        return 'locked';
                                }
                                return value;
                        case 'cover':
                        case 'binarycover':
                                if (value === true || value === 'true' || value === 'open') {
                                        return 'open';
                                }
                                if (value === false || value === 'false' || value === 'closed') {
                                        return 'closed';
                                }
                                return value;
                        default:
                                return value;
                }
        }

        connectWebSocket() {
                try {
                        let WebSocketImpl = global.WebSocket;
                        if (!WebSocketImpl) {
                                try {
                                        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
                                        WebSocketImpl = require('ws');
                                } catch (wsError) {
                                        sf.debug('WebSocket implementation not available for Home Assistant API mode.');
                                        return;
                                }
                        }
                        this.ws = new WebSocketImpl(this.wsBase, {
                                headers: {
                                        Authorization: `Bearer ${this.token}`,
                                },
                        });

                        this.ws.onopen = () => {
                                this.wsConnected = true;
                        };

                        this.ws.onerror = (error) => {
                                sf.debug(`Home Assistant websocket error: ${error.message || error}`);
                        };

                        this.ws.onclose = () => {
                                this.wsConnected = false;
                                connected = false;
                                this.ready = false;
                                setTimeout(() => {
                                        this.connectWebSocket();
                                }, 5000);
                        };

                        this.ws.onmessage = (message) => {
                                this.handleWsMessage(message);
                        };
                } catch (error) {
                        sf.debug(`Unable to initialize Home Assistant websocket: ${error.message}`);
                }
        }

        sendWs(payload) {
                if (!this.wsConnected || !this.ws || this.ws.readyState !== 1) {
                        return;
                }

                const message = { id: this.messageId++, ...payload };

                if (payload.type && payload.type !== 'auth') {
                        this.pendingMessages.set(message.id, message);
                }

                this.ws.send(JSON.stringify(message));
        }

        handleWsMessage(message) {
                if (!message || !message.data) {
                        return;
                }

                try {
                        const data = JSON.parse(message.data);

                        if (data.type === 'auth_required') {
                                this.sendWs({ type: 'auth', access_token: this.token });
                                return;
                        }

                        if (data.type === 'auth_ok') {
                                connected = true;
                                this.ready = true;
                                this.sendWs({ type: 'subscribe_events', event_type: 'state_changed' });
                                if (typeof this.onReady === 'function') {
                                        this.onReady();
                                }
                                return;
                        }

                        if (data.type === 'auth_invalid') {
                                sf.debug('Home Assistant websocket authentication failed.');
                                return;
                        }

                        if (data.type === 'event' && data.event && data.event.data) {
                                this.handleStateChangeEvent(data.event);
                                return;
                        }
                } catch (error) {
                        sf.debug(`Failed to process websocket message: ${error.message}`);
                }
        }

        handleStateChangeEvent(event) {
                if (!event || !event.data) {
                        return;
                }

                const entityId = event.data.entity_id;
                if (!entityId || !this.entities.has(entityId)) {
                        return;
                }

                const contextId = event.context && event.context.id;
                const lastContext = this.lastContextIds.get(entityId);

                if (contextId && lastContext && contextId === lastContext) {
                        return;
                }

                const meta = this.entityCommandMeta.get(entityId);
                if (!meta || !meta.setTopic) {
                        return;
                }

                const newState = event.data.new_state;
                if (!newState) {
                        return;
                }

                const payloadValue = this.extractCommandValue(newState, meta);
                if (payloadValue === undefined) {
                        return;
                }

                const payload = this.fromHaState(payloadValue, meta.attribute);

                if (typeof this.onMessage === 'function') {
                        this.onMessage(meta.setTopic, payload);
                }
        }

        extractCommandValue(newState, meta) {
                if (!newState) {
                        return undefined;
                }

                const attributes = newState.attributes || {};
                const attributeName = meta && meta.attributeName;

                if (attributeName && attributeName !== 'state' && Object.prototype.hasOwnProperty.call(attributes, attributeName)) {
                        return attributes[attributeName];
                }

                if (attributeName === 'state' && newState.state !== undefined) {
                        return newState.state;
                }

                if (attributeName && Object.prototype.hasOwnProperty.call(attributes, attributeName)) {
                        return attributes[attributeName];
                }

                if (newState.state !== undefined) {
                        return newState.state;
                }

                return undefined;
        }

        fromHaState(state, attribute) {
                if (state === undefined || state === null) {
                        return 'unknown';
                }

                if (typeof state === 'number') {
                        if (Number.isNaN(state)) {
                                return 'unknown';
                        }
                        return state.toString();
                }

                if (typeof state === 'boolean') {
                        return state ? 'true' : 'false';
                }

                const lower = String(state).toLowerCase();
                if (lower === 'on' || lower === 'off') {
                        return lower === 'on' ? 'true' : 'false';
                }
                if (lower === 'open' || lower === 'closed') {
                        return lower === 'open' ? 'true' : 'false';
                }
                if (lower === 'locked' || lower === 'unlocked') {
                        return lower === 'locked' ? 'false' : 'true';
                }

                if (attribute && attribute.type === 'X') {
                        if (lower === 'true' || lower === '1') {
                                return 'true';
                        }
                        if (lower === 'false' || lower === '0') {
                                return 'false';
                        }
                }

                return state.toString();
        }
}

const instanceWrapper = {
        instance: null,
};

const setup = (config, onMessage, onReady) => {
        instanceWrapper.instance = new HaTransport(config, onMessage, onReady);
        return instanceWrapper.instance;
};

const isConnected = () => {
        if (!instanceWrapper.instance) {
                return false;
        }

        return instanceWrapper.instance.isConnected();
};

module.exports = {
        setup,
        isConnected,
};

