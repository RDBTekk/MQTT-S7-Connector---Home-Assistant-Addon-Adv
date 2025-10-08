console.info('[config-gui] app.js bootstrap start');

const elements = {
  form: document.getElementById('config-form'),
  logLevelSelect: document.getElementById('logLevel'),
  configTableBody: document.getElementById('configTableBody'),
  addFileButton: document.getElementById('addFile'),
  statusField: document.getElementById('status'),
  rowTemplate: document.getElementById('config-row-template'),
  addonName: document.querySelector('.js-addon-name'),
  addonNameSecondary: document.querySelector('.js-addon-name-secondary'),
  addonDescription: document.querySelector('.js-addon-description'),
  addonVersion: document.querySelector('.js-addon-version'),
  addonVersionSecondary: document.querySelector('.js-addon-version-secondary'),
  addonSlug: document.querySelector('.js-addon-slug'),
  addonSlugSecondary: document.querySelector('.js-addon-slug-secondary'),
  addonStatus: document.querySelector('.js-addon-status'),
  configPath: document.querySelector('.js-config-path'),
  configUpdatedPrimary: document.querySelector('.js-config-updated'),
  configUpdatedSecondary: document.querySelector('.js-config-updated-secondary'),
  configCount: document.querySelector('.js-config-count'),
  configStatusBadge: document.querySelector('.js-config-status-badge'),
  editorCard: document.getElementById('fileEditorCard'),
  editorSubtitle: document.querySelector('.js-editor-subtitle'),
  editorFileName: document.querySelector('.js-editor-filename'),
  editorFileStatus: document.querySelector('.js-editor-file-status'),
  editorUpdated: document.querySelector('.js-editor-updated'),
  editorTextarea: document.getElementById('fileEditorContent'),
  editorSaveButton: document.getElementById('fileEditorSave'),
  editorReloadButton: document.getElementById('fileEditorReload'),
  editorExampleButton: document.getElementById('fileEditorExample'),
  editorStatus: document.getElementById('fileEditorStatus'),
  testModeToggle: document.getElementById('testModeToggle'),
  testModeStatus: document.getElementById('testModeStatus'),
  testModeBadge: document.querySelector('.js-testmode-badge'),
  testModeSummary: document.querySelector('.js-testmode-summary'),
  generalUpdateTime: document.getElementById('generalUpdateTime'),
  generalTemperatureInterval: document.getElementById('generalTemperatureInterval'),
  generalMqttBase: document.getElementById('generalMqttBase'),
  generalMqttBaseCustom: document.getElementById('generalMqttBaseCustom'),
  generalMqttDevice: document.getElementById('generalMqttDevice'),
  generalMqttDeviceCustom: document.getElementById('generalMqttDeviceCustom'),
  generalDiscoveryPrefix: document.getElementById('generalDiscoveryPrefix'),
  generalDiscoveryPrefixCustom: document.getElementById('generalDiscoveryPrefixCustom'),
  generalRetainMessages: document.getElementById('generalRetainMessages'),
  generalDiscoveryRetain: document.getElementById('generalDiscoveryRetain'),
  integrationCard: document.getElementById('integrationCard'),
  integrationMode: document.getElementById('integrationMode'),
  integrationHaBaseUrl: document.getElementById('integrationHaBaseUrl'),
  integrationHaToken: document.getElementById('integrationHaToken'),
  integrationModeStatus: document.getElementById('integrationModeStatus'),
  integrationHaFields: document.querySelectorAll('[data-integration-mode="homeassistant"]'),
  plcHost: document.getElementById('plcHost'),
  plcPort: document.getElementById('plcPort'),
  plcPortCustom: document.getElementById('plcPortCustom'),
  plcRack: document.getElementById('plcRack'),
  plcRackCustom: document.getElementById('plcRackCustom'),
  plcSlot: document.getElementById('plcSlot'),
  plcSlotCustom: document.getElementById('plcSlotCustom'),
  plcLocalTsap: document.getElementById('plcLocalTsap'),
  plcLocalTsapCustom: document.getElementById('plcLocalTsapCustom'),
  plcRemoteTsap: document.getElementById('plcRemoteTsap'),
  plcRemoteTsapCustom: document.getElementById('plcRemoteTsapCustom'),
  plcSimulationInterval: document.getElementById('plcSimulationInterval'),
  plcSimulationIntervalCustom: document.getElementById('plcSimulationIntervalCustom'),
  plcTestMode: document.getElementById('plcTestMode'),
  mqttHost: document.getElementById('mqttHost'),
  mqttUser: document.getElementById('mqttUser'),
  mqttPassword: document.getElementById('mqttPassword'),
  mqttRejectUnauthorized: document.getElementById('mqttRejectUnauthorized'),
  mqttCard: document.getElementById('mqttCard'),
  scanTriggerButton: document.getElementById('scanTrigger'),
  scanRefreshButton: document.getElementById('scanRefresh'),
  scanStatus: document.getElementById('scanStatus'),
  scanMeta: document.querySelector('.js-scan-meta'),
  scanTableBody: document.getElementById('scanTableBody'),
  entityList: document.getElementById('entityList'),
  entityTemplate: document.getElementById('entity-template'),
  addEntityButton: document.getElementById('addEntity'),
  entityWizard: document.getElementById('entityWizard'),
  entityWizardForm: document.getElementById('entityWizardForm'),
  entityWizardDirection: document.getElementById('entityWizardDirection'),
  entityWizardCategory: document.getElementById('entityWizardCategory'),
  entityWizardName: document.getElementById('entityWizardName'),
  entityWizardTopic: document.querySelector('.js-wizard-topic'),
  entityWizardAddressHint: document.querySelector('.js-wizard-address-hint'),
  entityWizardDescription: document.querySelector('.js-wizard-description'),
  entityWizardCancel: document.getElementById('entityWizardCancel'),
  entityWizardConfirm: document.getElementById('entityWizardConfirm'),
  entityWizardClose: document.getElementById('entityWizardClose'),
  entityWizardBackdrop: document.querySelector('[data-close="entityWizard"]'),
};

const rowDetails = new WeakMap();
let activeRow = null;
let activeFileName = null;
let activeFileExists = false;
let editorDirty = false;
let editorTemplate = null;
let lastLoadedContent = '';
let testModeEnabled = false;
let entityConfigData = null;
let entityConfigMeta = null;
let entityConfigDirty = false;
let detectionData = null;
let addressOptions = { groups: [], flat: [] };
let generalBindingsInitialized = false;
let plcBindingsInitialized = false;
let mqttBindingsInitialized = false;
let integrationBindingsInitialized = false;
let currentIntegrationMode = 'homeassistant';
const entityFieldRefs = new Map();
let generalPresetControllers = {};
let plcPresetControllers = {};
const wizardState = { direction: 'output', blueprintId: null };

const ADDRESS_CUSTOM_VALUE = '__custom__';

const ENTITY_TYPES = [
  'binarycover',
  'climate',
  'heater',
  'cover',
  'light',
  'number',
  'sensor',
  'switch',
  'button',
  'fan',
  'lock',
];

const ADDRESS_PATTERN = /^(?:DB\d+,[A-Z]+[0-9.,]+|[IQM][A-Z0-9.,]+)$/i;
const ENTITY_CONFIG_ENDPOINT = 'api/entity-config';
const PLC_SCAN_ENDPOINT = 'api/plc/scan';
const CUSTOM_SELECT_VALUE = '__custom__';

const MQTT_BASE_PRESETS = [
  { value: 's7', label: 's7 (Standard)' },
  { value: 's7/linie1', label: 's7/linie1 (Mehrlinien-Anlage)' },
  { value: 'homeassistant', label: 'homeassistant' },
  { value: 'automation', label: 'automation' },
  { value: 'building', label: 'building' },
  { value: 'factory', label: 'factory' },
  { value: 'demo', label: 'demo' },
];

const MQTT_DEVICE_PRESETS = [
  { value: 'plc', label: 'plc' },
  { value: 'logo', label: 'logo' },
  { value: 'controller', label: 'controller' },
  { value: 'station', label: 'station' },
  { value: 'line', label: 'line' },
  { value: 'panel', label: 'panel' },
  { value: 'testbench', label: 'testbench' },
];

const DISCOVERY_PREFIX_PRESETS = [
  { value: 'homeassistant', label: 'homeassistant (Standard)' },
  { value: 'ha', label: 'ha' },
  { value: 'automation', label: 'automation' },
  { value: 'industry', label: 'industry' },
  { value: 'building', label: 'building' },
];

const PLC_PORT_PRESETS = [
  { value: '102', label: '102 (S7-1200/1500, LOGO!)' },
  { value: '200', label: '200 (S7-200 über Gateway)' },
  { value: '502', label: '502 (Modbus/TCP Gateway)' },
  { value: '10201', label: '10201 (SINUMERIK / RFC1006)' },
  { value: '1102', label: '1102 (S7-1500 geschützter Zugriff)' },
  { value: '1200', label: '1200 (Simulations/Testport)' },
];

const PLC_RACK_PRESETS = [
  { value: '0', label: '0 (LOGO!, S7-1200/1500)' },
  { value: '1', label: '1 (S7-300/400 Standard-Rack)' },
  { value: '2', label: '2 (Erweiterungsrack/ET200)' },
  { value: '3', label: '3 (Zusatz-Rack)' },
];

const PLC_SLOT_PRESETS = [
  { value: '0', label: '0 (LOGO! CPU)' },
  { value: '1', label: '1 (S7-1200/1500 CPU)' },
  { value: '2', label: '2 (S7-300/400 CPU)' },
  { value: '3', label: '3 (Kommunikationsprozessor)' },
  { value: '4', label: '4 (Telecontrol/CP)' },
];

const PLC_SIM_PRESETS = [
  { value: '100', label: '100 (Sehr schnell)' },
  { value: '250', label: '250' },
  { value: '500', label: '500' },
  { value: '1000', label: '1000' },
  { value: '2000', label: '2000' },
  { value: '5000', label: '5000 (gemächlich)' },
];

const PLC_TSAP_PRESETS = [
  { value: '0x0100', label: '0x0100 (LOGO! lokal)' },
  { value: '0x0200', label: '0x0200 (LOGO! Remote-Partner)' },
  { value: '0x0300', label: '0x0300 (LOGO! Fernwartung)' },
  { value: '0x1000', label: '0x1000 (S7-1200 Rack0/Slot1)' },
  { value: '0x1200', label: '0x1200 (S7-300 Rack0/Slot2)' },
  { value: '0x2400', label: '0x2400 (S7-400 Rack0/Slot3)' },
  { value: '0x4000', label: '0x4000 (S7-1500 geschützter Partner)' },
];

const ENTITY_WIZARD_BLUEPRINTS = [
  {
    id: 'light',
    direction: 'output',
    label: 'Lampe',
    description: 'Schaltbare Leuchte mit optionaler Helligkeitsregelung.',
    type: 'light',
    defaultName: 'Lampe',
    mqttHint: 'light',
    addressFields: {
      state: { label: 'Schaltzustand', patterns: [/^Q/i, /^DB/i] },
      brightness: { label: 'Helligkeit (optional)', patterns: [/^DB/i, /^M/i], optional: true },
    },
  },
  {
    id: 'switch',
    direction: 'output',
    label: 'Schalter',
    description: 'Universeller Aktor für Relais, Pumpen oder einfache Verbraucher.',
    type: 'switch',
    defaultName: 'Schalter',
    mqttHint: 'switch',
    addressFields: {
      state: { label: 'Schaltzustand', patterns: [/^Q/i, /^DB/i] },
    },
  },
  {
    id: 'valve',
    direction: 'output',
    label: 'Ventil',
    description: 'Steuert Ventile oder hydraulische Aktoren.',
    type: 'switch',
    defaultName: 'Ventil',
    mqttHint: 'valve',
    extras: { device_class: 'valve' },
    addressFields: {
      state: { label: 'Ventilstatus', patterns: [/^Q/i, /^DB/i] },
    },
  },
  {
    id: 'garage',
    direction: 'output',
    label: 'Garagentor',
    description: 'Binärer Torantrieb mit Auf-/Zu-Steuerung.',
    type: 'binarycover',
    defaultName: 'Garagentor',
    mqttHint: 'garage',
    extras: { device_class: 'garage' },
    addressFields: {
      targetPosition: { label: 'Ansteuerung', patterns: [/^Q/i, /^DB/i] },
      currentPosition: { label: 'Status', patterns: [/^I/i, /^DB/i] },
    },
  },
  {
    id: 'fan',
    direction: 'output',
    label: 'Ventilator',
    description: 'Lüfter mit Drehzahl- oder Modussteuerung.',
    type: 'fan',
    defaultName: 'Ventilator',
    mqttHint: 'fan',
    extras: { preset_modes: ['eco', 'boost', 'night'] },
    addressFields: {
      state: { label: 'Ein/Aus', patterns: [/^Q/i, /^DB/i] },
      percentage: { label: 'Drehzahl (optional)', patterns: [/^DB/i, /^M/i], optional: true },
    },
  },
  {
    id: 'temperature',
    direction: 'input',
    label: 'Temperatursensor',
    description: 'Analoger Temperaturwert aus der SPS.',
    type: 'sensor',
    defaultName: 'Temperatur',
    mqttHint: 'temperature',
    extras: { device_class: 'temperature', unit_of_measurement: '°C' },
    addressFields: {
      state: { label: 'Temperatur', patterns: [/^I/i, /^DB/i, /^M/i] },
    },
  },
  {
    id: 'humidity',
    direction: 'input',
    label: 'Feuchtigkeitssensor',
    description: 'Misst relative Luftfeuchtigkeit.',
    type: 'sensor',
    defaultName: 'Feuchte',
    mqttHint: 'humidity',
    extras: { device_class: 'humidity', unit_of_measurement: '%' },
    addressFields: {
      state: { label: 'Feuchtigkeit', patterns: [/^I/i, /^DB/i, /^M/i] },
    },
  },
  {
    id: 'status',
    direction: 'input',
    label: 'Statuskontakt',
    description: 'Digitaler Eingang, z. B. Fenster- oder Türkontakt.',
    type: 'sensor',
    defaultName: 'Status',
    mqttHint: 'status',
    extras: { device_class: 'door' },
    addressFields: {
      state: { label: 'Status', patterns: [/^I/i, /^DB/i] },
    },
  },
  {
    id: 'button',
    direction: 'input',
    label: 'Taster',
    description: 'Virtueller Taster für Tasten oder Trittmatten.',
    type: 'button',
    defaultName: 'Taster',
    mqttHint: 'button',
    addressFields: {
      state: { label: 'Tasteradresse', patterns: [/^I/i, /^DB/i] },
    },
  },
];

function setStatus(message, type = 'info') {
  if (!elements.statusField) return;
  elements.statusField.textContent = message;
  elements.statusField.dataset.type = type;
}

function setTestModeStatus(message, type = 'info') {
  if (!elements.testModeStatus) return;
  elements.testModeStatus.textContent = message;
  elements.testModeStatus.dataset.type = type;
}

function setEditorStatus(message, type = 'info') {
  if (!elements.editorStatus) return;
  elements.editorStatus.textContent = message;
  elements.editorStatus.dataset.type = type;
}

function setScanStatus(message, type = 'info') {
  if (!elements.scanStatus) return;
  elements.scanStatus.textContent = message || '';
  elements.scanStatus.dataset.type = type;
}

function toggleCustomField(input, show, value = '') {
  if (!input) {
    return;
  }

  const normalized = value !== undefined && value !== null ? String(value) : '';
  input.value = normalized;
  input.classList.toggle('is-visible', Boolean(show));
  input.disabled = !show;
  input.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function setupPresetField(select, customInput, options, onChange, config = {}) {
  if (!select) {
    return null;
  }

  const normalizedOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const placeholder = config.placeholder === undefined ? 'Bitte wählen' : config.placeholder;
  const customLabel = config.customLabel || 'Eigener Wert…';

  const rebuildOptions = () => {
    const fragment = document.createDocumentFragment();
    if (placeholder !== false) {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = placeholder || 'Bitte wählen';
      fragment.appendChild(placeholderOption);
    }

    normalizedOptions.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label || option.value;
      fragment.appendChild(opt);
    });

    const customOption = document.createElement('option');
    customOption.value = CUSTOM_SELECT_VALUE;
    customOption.textContent = customLabel;
    fragment.appendChild(customOption);

    select.innerHTML = '';
    select.appendChild(fragment);
  };

  rebuildOptions();
  toggleCustomField(customInput, false);

  const controller = {
    setValue(value) {
      const normalized = value === undefined || value === null ? '' : String(value);
      const match = normalizedOptions.find((option) => option.value === normalized);
      if (match) {
        select.value = match.value;
        toggleCustomField(customInput, false);
        if (customInput) {
          customInput.value = '';
        }
      } else if (normalized) {
        select.value = CUSTOM_SELECT_VALUE;
        toggleCustomField(customInput, true, normalized);
      } else {
        select.value = '';
        toggleCustomField(customInput, false);
        if (customInput) {
          customInput.value = '';
        }
      }
    },
  };

  select.addEventListener('change', (event) => {
    const selected = event.target.value;
    if (selected === CUSTOM_SELECT_VALUE) {
      toggleCustomField(customInput, true, customInput ? customInput.value : '');
      if (customInput) {
        window.requestAnimationFrame(() => {
          customInput.focus();
          customInput.select();
        });
      }
      if (typeof onChange === 'function' && (!customInput || !customInput.value)) {
        onChange(null);
      }
      return;
    }

    toggleCustomField(customInput, false);
    if (typeof onChange === 'function') {
      onChange(selected ? selected : null);
    }
  });

  if (customInput) {
    customInput.addEventListener('input', (event) => {
      const raw = event.target.value.trim();
      if (typeof onChange === 'function') {
        onChange(raw ? raw : null);
      }
    });

    customInput.addEventListener('blur', (event) => {
      if (!event.target.value.trim()) {
        toggleCustomField(customInput, false);
        if (select.value === CUSTOM_SELECT_VALUE) {
          select.value = '';
        }
        if (typeof onChange === 'function') {
          onChange(null);
        }
      }
    });
  }

  return controller;
}

function slugify(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function getBaseDeviceTopic() {
  const base = slugify(getRootValue(['mqtt_base'], 's7')) || 's7';
  const device = slugify(getRootValue(['mqtt_device_name'], 'plc')) || 'plc';
  return `${base}_${device}`;
}

function getBlueprintsForDirection(direction) {
  const normalized = direction === 'input' ? 'input' : 'output';
  return ENTITY_WIZARD_BLUEPRINTS.filter((blueprint) => blueprint.direction === normalized);
}

function getBlueprintById(id) {
  if (!id) {
    return null;
  }
  return ENTITY_WIZARD_BLUEPRINTS.find((blueprint) => blueprint.id === id) || null;
}

function pickSuggestedAddress(patterns, direction) {
  if (!Array.isArray(addressOptions.flat) || addressOptions.flat.length === 0) {
    return '';
  }

  const searchPatterns = [];
  if (Array.isArray(patterns)) {
    patterns.forEach((pattern) => {
      if (pattern instanceof RegExp) {
        searchPatterns.push(pattern);
      } else if (typeof pattern === 'string') {
        searchPatterns.push(new RegExp(pattern, 'i'));
      }
    });
  }

  const fallbackPatterns =
    direction === 'input'
      ? [/^I/i, /^DB/i, /^M/i]
      : [/^Q/i, /^DB/i, /^M/i];
  searchPatterns.push(...fallbackPatterns);

  for (const regex of searchPatterns) {
    for (const address of addressOptions.flat) {
      if (regex.test(String(address))) {
        return String(address);
      }
    }
  }

  return '';
}

function buildBlueprintAddressSummary(blueprint) {
  if (!blueprint || !blueprint.addressFields) {
    return 'SPS-Adressen werden passend vorgeschlagen.';
  }

  const previews = [];
  Object.entries(blueprint.addressFields).forEach(([key, meta]) => {
    const suggestion = pickSuggestedAddress(meta?.patterns || [], blueprint.direction);
    if (suggestion) {
      previews.push(`${meta?.label || key}: ${suggestion}`);
    }
  });

  if (previews.length > 0) {
    return `Vorschläge: ${previews.join(', ')}`;
  }

  if (!addressOptions.flat || addressOptions.flat.length === 0) {
    return 'Noch keine SPS-Adressen gefunden – Felder bleiben leer.';
  }

  return 'SPS-Adressen werden passend vorgeschlagen.';
}

function generateEntityMqttSuggestions(index, entity) {
  const suggestions = [];
  const seen = new Set();
  const baseTopic = getBaseDeviceTopic();

  const pushCandidate = (candidate) => {
    if (!candidate) {
      return;
    }
    const value = slugify(candidate);
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    const label = baseTopic ? `${value} – ${baseTopic}/${value}` : value;
    suggestions.push({ value, label });
  };

  if (entity?.mqtt) {
    pushCandidate(entity.mqtt);
  }

  const nameSlug = slugify(entity?.name);
  const typeSlug = slugify(entity?.type);

  pushCandidate(nameSlug);
  pushCandidate(`${typeSlug || 'entity'}_${index + 1}`);
  pushCandidate(`${typeSlug || 'entity'}_${nameSlug || index + 1}`);

  const deviceSlug = slugify(getRootValue(['mqtt_device_name'], 'plc'));
  if (deviceSlug && nameSlug) {
    pushCandidate(`${deviceSlug}_${nameSlug}`);
  }

  if (suggestions.length === 0) {
    pushCandidate(`entity_${index + 1}`);
  }

  return suggestions;
}

function populateMqttSelectOptions(select, customInput, index, entity, currentValue) {
  if (!select) {
    return;
  }

  const options = generateEntityMqttSuggestions(index, entity);
  const fragment = document.createDocumentFragment();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Automatisch vorschlagen';
  fragment.appendChild(placeholder);

  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label || option.value;
    fragment.appendChild(opt);
  });

  const customOption = document.createElement('option');
  customOption.value = CUSTOM_SELECT_VALUE;
  customOption.textContent = 'Eigenes Topic…';
  fragment.appendChild(customOption);

  select.innerHTML = '';
  select.appendChild(fragment);

  const normalized = currentValue === undefined || currentValue === null ? '' : String(currentValue);
  const match = options.find((option) => option.value === normalized);
  if (match) {
    select.value = match.value;
    toggleCustomField(customInput, false);
  } else if (normalized) {
    select.value = CUSTOM_SELECT_VALUE;
    toggleCustomField(customInput, true, normalized);
  } else {
    select.value = '';
    toggleCustomField(customInput, false);
    if (customInput) {
      customInput.value = '';
    }
  }
}

function updateEntityMqttSuggestions(index) {
  const ref = entityFieldRefs.get(Number(index));
  if (!ref || !ref.mqtt) {
    return;
  }

  const entity = getEntityAt(index);
  if (!entity) {
    return;
  }

  const currentValue = getEntityValue(index, ['mqtt'], entity.mqtt || '');
  populateMqttSelectOptions(ref.mqtt.select, ref.mqtt.customInput, index, entity, currentValue);
}

function refreshAllMqttSuggestions() {
  entityFieldRefs.forEach((_, key) => {
    updateEntityMqttSuggestions(Number(key));
  });
  updateEntityWizardPreview();
}

function markEntityConfigDirty() {
  entityConfigDirty = true;
  setStatus('Änderungen noch nicht gespeichert.', 'warning');
}

function clearEntityConfigDirty() {
  entityConfigDirty = false;
}

function ensureEntityConfig() {
  if (!entityConfigData || typeof entityConfigData !== 'object') {
    entityConfigData = {};
  }
  return entityConfigData;
}

function getRootValue(path, fallback) {
  let current = entityConfigData;
  for (let i = 0; i < path.length; i += 1) {
    if (!current || typeof current !== 'object') {
      return fallback;
    }
    current = current[path[i]];
  }
  return current === undefined ? fallback : current;
}

function setRootValue(path, value) {
  const root = ensureEntityConfig();
  let target = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {};
    }
    target = target[key];
  }
  target[path[path.length - 1]] = value;
  markEntityConfigDirty();
}

function deleteRootValue(path) {
  if (!entityConfigData) {
    return;
  }

  const stack = [];
  let target = entityConfigData;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!target || typeof target !== 'object' || !(key in target)) {
      return;
    }
    stack.push({ parent: target, key });
    target = target[key];
  }

  const lastKey = path[path.length - 1];
  if (target && Object.prototype.hasOwnProperty.call(target, lastKey)) {
    delete target[lastKey];
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const { parent, key } = stack[i];
      if (parent[key] && typeof parent[key] === 'object' && Object.keys(parent[key]).length === 0) {
        delete parent[key];
      } else {
        break;
      }
    }
    markEntityConfigDirty();
  }
}

function ensureEntitiesArray() {
  const root = ensureEntityConfig();
  if (!Array.isArray(root.entities)) {
    root.entities = [];
  }
  return root.entities;
}

function getEntityAt(index) {
  const entities = ensureEntitiesArray();
  if (!entities[index] || typeof entities[index] !== 'object') {
    entities[index] = {};
  }
  return entities[index];
}

function getEntityValue(index, path, fallback) {
  const entity = Array.isArray(entityConfigData?.entities)
    ? entityConfigData.entities[index]
    : undefined;
  if (!entity || typeof entity !== 'object') {
    return fallback;
  }
  let current = entity;
  for (let i = 0; i < path.length; i += 1) {
    if (!current || typeof current !== 'object') {
      return fallback;
    }
    current = current[path[i]];
  }
  return current === undefined ? fallback : current;
}

function deleteEntityValue(index, path) {
  const entity = getEntityAt(index);
  const stack = [];
  let target = entity;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!target || typeof target !== 'object' || !(key in target)) {
      return;
    }
    stack.push({ parent: target, key });
    target = target[key];
  }

  const lastKey = path[path.length - 1];
  if (target && Object.prototype.hasOwnProperty.call(target, lastKey)) {
    delete target[lastKey];
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const { parent, key } = stack[i];
      if (parent[key] && typeof parent[key] === 'object' && Object.keys(parent[key]).length === 0) {
        delete parent[key];
      } else {
        break;
      }
    }
    markEntityConfigDirty();
  }
}

function setEntityValue(index, path, value) {
  const entity = getEntityAt(index);
  let target = entity;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {};
    }
    target = target[key];
  }
  target[path[path.length - 1]] = value;
  markEntityConfigDirty();
}

function isAddressValue(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return ADDRESS_PATTERN.test(value.trim());
}

function shouldSuggestAddressField(key, path = []) {
  if (!key) {
    return false;
  }

  const normalized = String(key).toLowerCase();
  if (normalized === 'state' || normalized === 'plc' || normalized === 'set_plc') {
    return true;
  }

  if (normalized.endsWith('_plc') || normalized.endsWith('_address')) {
    return true;
  }

  if (normalized.includes('position') || normalized.includes('temperature') || normalized.includes('humidity')) {
    return true;
  }

  if (normalized.includes('pressure') || normalized.includes('flow') || normalized.includes('power')) {
    return true;
  }

  if (normalized.includes('energy') || normalized.includes('voltage') || normalized.includes('current')) {
    return true;
  }

  if (normalized.includes('percentage') || normalized.includes('angle') || normalized.includes('trigger')) {
    return true;
  }

  if (Array.isArray(path) && path.length > 0) {
    const firstSegment = String(path[0]).toLowerCase();
    if (firstSegment === 'state' || firstSegment === 'plc' || firstSegment.endsWith('_plc')) {
      return true;
    }
  }

  return false;
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function humanizeKey(key) {
  if (!key) {
    return '';
  }
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildOptionsFromSections(sections = []) {
  const groups = [];
  const flat = [];
  const seen = new Set();

  sections.forEach((section) => {
    if (!section || !Array.isArray(section.addresses) || section.addresses.length === 0) {
      return;
    }

    const localSeen = new Set();
    const options = [];

    section.addresses.forEach((entry) => {
      if (!entry || !entry.address) {
        return;
      }
      const address = String(entry.address);
      if (!localSeen.has(address)) {
        localSeen.add(address);
        options.push({ value: address, label: address });
      }
      if (!seen.has(address)) {
        seen.add(address);
        flat.push(address);
      }
    });

    if (options.length > 0) {
      groups.push({ id: section.id, label: section.label || section.id || 'Bereich', options });
    }
  });

  return { groups, flat };
}

function applyDetectionOptions(scan) {
  if (scan && scan.options) {
    addressOptions = {
      groups: Array.isArray(scan.options.groups) ? scan.options.groups : [],
      flat: Array.isArray(scan.options.flat) ? scan.options.flat : [],
    };
  } else if (scan && Array.isArray(scan.sections)) {
    addressOptions = buildOptionsFromSections(scan.sections);
  } else {
    addressOptions = { groups: [], flat: [] };
  }

  renderEntities();
}

function renderScanTable(scan) {
  if (!elements.scanTableBody) {
    return;
  }

  elements.scanTableBody.innerHTML = '';

  if (!scan || !Array.isArray(scan.sections) || scan.sections.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = scan && scan.status === 'error'
      ? scan.error || 'Scan fehlgeschlagen.'
      : 'Noch keine Daten verfügbar.';
    row.appendChild(cell);
    elements.scanTableBody.appendChild(row);
    if (elements.scanMeta) {
      elements.scanMeta.textContent = scan && scan.generated_at ? `Stand: ${formatDate(scan.generated_at)}` : 'Kein Scan durchgeführt';
    }
    return;
  }

  scan.sections.forEach((section) => {
    const headerRow = document.createElement('tr');
    headerRow.className = 'section-row';
    const headerCell = document.createElement('td');
    headerCell.colSpan = 5;
    headerCell.textContent = section.label || section.id || 'Bereich';
    headerRow.appendChild(headerCell);
    elements.scanTableBody.appendChild(headerRow);

    (section.addresses || []).forEach((entry) => {
      const row = document.createElement('tr');

      const addressCell = document.createElement('td');
      addressCell.textContent = entry.address || '–';
      row.appendChild(addressCell);

      const areaCell = document.createElement('td');
      areaCell.textContent = entry.byte || entry.area || '–';
      row.appendChild(areaCell);

      const bitCell = document.createElement('td');
      bitCell.textContent = typeof entry.bit === 'number' ? entry.bit : '–';
      row.appendChild(bitCell);

      const valueCell = document.createElement('td');
      const valueSpan = document.createElement('span');
      valueSpan.className = 'plc-scan__value';
      if (typeof entry.value === 'boolean') {
        valueSpan.dataset.state = entry.value ? 'true' : 'false';
        valueSpan.textContent = entry.value ? 'High' : 'Low';
      } else if (entry.value !== undefined && entry.value !== null) {
        valueSpan.textContent = String(entry.value);
      } else {
        valueSpan.textContent = '–';
      }
      valueCell.appendChild(valueSpan);
      row.appendChild(valueCell);

      const sourceCell = document.createElement('td');
      sourceCell.textContent = entry.entity || entry.path || section.label || '–';
      row.appendChild(sourceCell);

      elements.scanTableBody.appendChild(row);
    });
  });

  if (elements.scanMeta) {
    elements.scanMeta.textContent = scan.generated_at
      ? `Stand: ${formatDate(scan.generated_at)}`
      : 'Scan durchgeführt';
  }
}

function createEntitySection(title) {
  const section = document.createElement('section');
  section.className = 'entity-section';
  if (title) {
    const heading = document.createElement('h4');
    heading.className = 'entity-section__title';
    heading.textContent = title;
    section.appendChild(heading);
  }
  return section;
}

function createTypeField(index, value, titleEl, subtitleEl) {
  const field = document.createElement('div');
  field.className = 'entity-field';
  const label = document.createElement('label');
  label.textContent = 'Typ';
  const select = document.createElement('select');
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = 'Bitte wählen';
  select.appendChild(placeholderOption);
  ENTITY_TYPES.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    if (type === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  select.addEventListener('change', (event) => {
    const nextValue = event.target.value;
    if (nextValue) {
      setEntityValue(index, ['type'], nextValue);
    } else {
      deleteEntityValue(index, ['type']);
    }
    if (subtitleEl) {
      subtitleEl.textContent = nextValue ? `Typ: ${nextValue}` : 'Typ nicht gesetzt';
    }
    updateEntityMqttSuggestions(index);
  });
  field.appendChild(label);
  field.appendChild(select);
  return field;
}

function createTextField(index, path, labelText, value = '', onChange = null, options = {}) {
  if (options.address) {
    return createAddressField(index, path, labelText, value);
  }

  if (options.mqttTopic) {
    return createMqttField(index, path, labelText, value, options);
  }

  const field = document.createElement('div');
  field.className = 'entity-field';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  if (options.placeholder) {
    input.placeholder = options.placeholder;
  }
  input.addEventListener('input', (event) => {
    const next = event.target.value.trim();
    if (next.length > 0 || options.allowEmpty) {
      setEntityValue(index, path, next);
    } else {
      deleteEntityValue(index, path);
    }
    if (typeof onChange === 'function') {
      onChange(next);
    }
  });
  field.appendChild(label);
  field.appendChild(input);
  return field;
}

function createMqttField(index, path, labelText, value = '', options = {}) {
  const field = document.createElement('div');
  field.className = 'entity-field';

  const label = document.createElement('label');
  label.textContent = labelText;
  field.appendChild(label);

  const controls = document.createElement('div');
  controls.className = 'input-combo';

  const select = document.createElement('select');
  select.className = 'input-combo__select';

  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'input-combo__custom';
  customInput.placeholder = 'Eigenes MQTT Topic';

  controls.appendChild(select);
  controls.appendChild(customInput);
  field.appendChild(controls);

  const entity = options.entity || getEntityAt(index);
  populateMqttSelectOptions(select, customInput, index, entity, value);

  select.addEventListener('change', (event) => {
    const selected = event.target.value;
    if (selected === CUSTOM_SELECT_VALUE) {
      deleteEntityValue(index, path);
      toggleCustomField(customInput, true, customInput ? customInput.value : '');
      window.requestAnimationFrame(() => {
        customInput.focus();
        customInput.select();
      });
      return;
    }

    if (!selected) {
      deleteEntityValue(index, path);
      toggleCustomField(customInput, false);
      return;
    }

    setEntityValue(index, path, selected);
    toggleCustomField(customInput, false);
  });

  customInput.addEventListener('input', (event) => {
    const raw = event.target.value.trim();
    if (raw) {
      const slug = slugify(raw);
      setEntityValue(index, path, slug || raw);
    } else {
      deleteEntityValue(index, path);
    }
  });

  customInput.addEventListener('blur', (event) => {
    if (!event.target.value.trim()) {
      toggleCustomField(customInput, false);
      if (select.value === CUSTOM_SELECT_VALUE) {
        select.value = '';
      }
    }
  });

  const numericIndex = Number(index);
  const ref = entityFieldRefs.get(numericIndex) || {};
  ref.mqtt = { select, customInput };
  entityFieldRefs.set(numericIndex, ref);

  return field;
}

function addressExists(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return addressOptions.flat.includes(value);
}

function populateAddressSelect(select, currentValue) {
  const fragment = document.createDocumentFragment();
  const hasOptions = Array.isArray(addressOptions.groups) && addressOptions.groups.length > 0;
  const normalizedValue = typeof currentValue === 'string' ? currentValue : currentValue ? String(currentValue) : '';
  let hasMatch = false;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = hasOptions
    ? 'Adresse auswählen'
    : 'Keine Adressen gefunden – manuell eingeben';
  if (!normalizedValue || !addressExists(normalizedValue)) {
    placeholder.selected = normalizedValue === '';
  }
  fragment.appendChild(placeholder);

  addressOptions.groups.forEach((group) => {
    if (!group || !Array.isArray(group.options) || group.options.length === 0) {
      return;
    }
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label || group.id || 'Bereich';
    group.options.forEach((optionData) => {
      if (!optionData || !optionData.value) {
        return;
      }
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label || optionData.value;
      if (optionData.value === normalizedValue) {
        option.selected = true;
        hasMatch = true;
      }
      optgroup.appendChild(option);
    });
    fragment.appendChild(optgroup);
  });

  const customOption = document.createElement('option');
  customOption.value = ADDRESS_CUSTOM_VALUE;
  customOption.textContent = 'Eigene Adresse…';
  if (normalizedValue && !hasMatch) {
    customOption.selected = true;
  }
  fragment.appendChild(customOption);

  select.innerHTML = '';
  select.appendChild(fragment);
}

function updateCustomInputState(input, value, { focus = false, forceShow = false } = {}) {
  if (!input) {
    return;
  }

  const normalized = typeof value === 'string' ? value : value ? String(value) : '';
  const shouldShow = forceShow || (normalized && !addressExists(normalized));
  input.value = shouldShow ? normalized : '';
  input.classList.toggle('is-visible', shouldShow);
  input.disabled = !shouldShow;
  input.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');

  if (shouldShow && focus) {
    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }
}

function createAddressField(index, path, labelText, value = '') {
  const field = document.createElement('div');
  field.className = 'entity-field entity-field--address';

  const label = document.createElement('label');
  const safePath = Array.isArray(path) ? path.join('-') : String(path);
  const fieldId = `entity-${index}-${safePath.replace(/[^a-z0-9_-]+/gi, '-') || 'address'}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  label.textContent = labelText;
  label.htmlFor = fieldId;

  const controls = document.createElement('div');
  controls.className = 'entity-address-controls';

  const select = document.createElement('select');
  select.className = 'entity-address-select';
  select.id = fieldId;
  select.dataset.entityIndex = String(index);
  select.dataset.path = JSON.stringify(path || []);

  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'entity-address-custom';
  customInput.placeholder = 'Adresse eingeben (z. B. Q0.0)';
  customInput.dataset.entityIndex = select.dataset.entityIndex;
  customInput.dataset.path = select.dataset.path;

  const currentValue = typeof value === 'string' ? value : value ? String(value) : '';
  populateAddressSelect(select, currentValue);
  updateCustomInputState(customInput, currentValue, { forceShow: false });

  select.addEventListener('change', (event) => {
    const choice = event.target.value;
    if (choice === ADDRESS_CUSTOM_VALUE) {
      const existing = getEntityValue(index, path, '');
      if (!existing || addressExists(existing)) {
        deleteEntityValue(index, path);
      }
      updateCustomInputState(customInput, existing, {
        focus: true,
        forceShow: true,
      });
      return;
    }

    if (!choice) {
      deleteEntityValue(index, path);
      updateCustomInputState(customInput, '');
      return;
    }

    setEntityValue(index, path, choice);
    updateCustomInputState(customInput, choice);
  });

  customInput.addEventListener('input', (event) => {
    const next = event.target.value.trim();
    if (next) {
      setEntityValue(index, path, next);
      if (addressExists(next)) {
        populateAddressSelect(select, next);
        updateCustomInputState(customInput, next);
      }
    } else {
      deleteEntityValue(index, path);
      populateAddressSelect(select, '');
      updateCustomInputState(customInput, '', { forceShow: true });
    }
  });

  customInput.addEventListener('blur', (event) => {
    const next = event.target.value.trim();
    if (!next) {
      updateCustomInputState(customInput, '', { forceShow: false });
      populateAddressSelect(select, '');
      return;
    }

    if (addressExists(next)) {
      populateAddressSelect(select, next);
      updateCustomInputState(customInput, next);
    }
  });

  controls.appendChild(select);
  controls.appendChild(customInput);

  field.appendChild(label);
  field.appendChild(controls);

  if (
    (!addressOptions.flat || addressOptions.flat.length === 0) &&
    Array.isArray(path) &&
    path.join('.') === 'state'
  ) {
    const hint = document.createElement('p');
    hint.className = 'entity-address-hint';
    hint.textContent =
      'Noch keine SPS-Adressen gefunden. Starte einen Scan oder gib einen Wert manuell ein.';
    field.appendChild(hint);
  }

  return field;
}

function createNumberField(index, path, labelText, value, options = {}) {
  const field = document.createElement('div');
  field.className = 'entity-field';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  if (options.min !== undefined) {
    input.min = options.min;
  }
  if (options.max !== undefined) {
    input.max = options.max;
  }
  if (options.step !== undefined) {
    input.step = options.step;
  }
  if (value !== undefined && value !== null && value !== '') {
    input.value = value;
  }
  input.addEventListener('input', (event) => {
    if (event.target.value === '') {
      deleteEntityValue(index, path);
      return;
    }
    const numeric = options.integer ? normalizeInteger(event.target.value) : normalizeNumber(event.target.value);
    if (numeric !== null) {
      setEntityValue(index, path, numeric);
    }
  });
  field.appendChild(label);
  field.appendChild(input);
  return field;
}

function createBooleanField(index, path, labelText, value) {
  const field = document.createElement('div');
  field.className = 'entity-field entity-field--checkbox';
  const label = document.createElement('label');
  label.className = 'checkbox';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(value);
  input.addEventListener('change', (event) => {
    setEntityValue(index, path, event.target.checked);
  });
  label.appendChild(input);
  label.appendChild(document.createTextNode(labelText));
  field.appendChild(label);
  return field;
}

function createArrayField(index, path, labelText, value) {
  const field = document.createElement('div');
  field.className = 'entity-field';
  const label = document.createElement('label');
  label.textContent = labelText;
  const textarea = document.createElement('textarea');
  if (Array.isArray(value)) {
    textarea.value = value.join('\n');
  } else if (value && typeof value === 'string') {
    textarea.value = value;
  }
  textarea.addEventListener('input', (event) => {
    const lines = event.target.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length > 0) {
      setEntityValue(index, path, lines);
    } else {
      deleteEntityValue(index, path);
    }
  });
  field.appendChild(label);
  field.appendChild(textarea);
  return field;
}

function createFieldForValue(index, key, value, path, titleEl, subtitleEl) {
  const label = humanizeKey(key);
  if (typeof value === 'string') {
    if (isAddressValue(value) || shouldSuggestAddressField(key, path)) {
      return createAddressField(index, path, label, value);
    }
    return createTextField(index, path, label, value);
  }
  if (typeof value === 'number') {
    return createNumberField(index, path, label, value);
  }
  if (typeof value === 'boolean') {
    return createBooleanField(index, path, label, value);
  }
  if (Array.isArray(value)) {
    return createArrayField(index, path, label, value);
  }
  if (value && typeof value === 'object') {
    return createObjectSection(index, key, value, path, titleEl, subtitleEl);
  }
  if (value === null || value === undefined) {
    if (shouldSuggestAddressField(key, path)) {
      return createAddressField(index, path, label, '');
    }
    return createTextField(index, path, label, '');
  }
  return createTextField(index, path, label, String(value));
}

function createObjectSection(index, key, value, parentPath, titleEl, subtitleEl) {
  const section = createEntitySection(humanizeKey(key));
  const grid = document.createElement('div');
  grid.className = 'entity-grid';
  let hasGridContent = false;

  Object.entries(value || {}).forEach(([nestedKey, nestedValue]) => {
    const field = createFieldForValue(index, nestedKey, nestedValue, parentPath.concat(nestedKey), titleEl, subtitleEl);
    if (!field) {
      return;
    }
    if (field.classList && field.classList.contains('entity-section')) {
      section.appendChild(field);
    } else {
      grid.appendChild(field);
      hasGridContent = true;
    }
  });

  if (hasGridContent) {
    section.appendChild(grid);
  }

  return section;
}

function getIntegrationModeValue() {
  const mode = getRootValue(['integration', 'mode'], 'homeassistant');
  return typeof mode === 'string' && mode.length > 0 ? mode : 'homeassistant';
}

function updateIntegrationUiState(mode) {
  currentIntegrationMode = mode || 'homeassistant';
  const haMode = currentIntegrationMode !== 'mqtt';

  if (elements.integrationHaFields && elements.integrationHaFields.forEach) {
    elements.integrationHaFields.forEach((field) => {
      if (field && field.classList) {
        field.classList.toggle('is-hidden', !haMode);
      }
    });
  }

  if (elements.mqttCard) {
    elements.mqttCard.classList.toggle('card--disabled', haMode);
    elements.mqttCard.setAttribute('aria-disabled', haMode ? 'true' : 'false');
    const inputs = elements.mqttCard.querySelectorAll('input, select, textarea, button');
    inputs.forEach((input) => {
      if (!input) {
        return;
      }
      input.disabled = haMode;
    });
  }

  if (elements.integrationModeStatus) {
    elements.integrationModeStatus.dataset.type = haMode ? 'info' : 'warning';
    elements.integrationModeStatus.textContent = haMode
      ? 'MQTT ist deaktiviert. Zustände und Befehle laufen direkt über die Home Assistant API.'
      : 'MQTT-Modus aktiv: Discovery-Topics und Statusmeldungen werden an den Broker gesendet.';
  }
}

function populateIntegrationSettings() {
  const mode = getIntegrationModeValue();
  if (elements.integrationMode) {
    elements.integrationMode.value = mode;
  }

  if (elements.integrationHaBaseUrl) {
    const baseUrl = getRootValue(['integration', 'homeassistant', 'base_url'], '') || '';
    elements.integrationHaBaseUrl.value = baseUrl;
  }

  if (elements.integrationHaToken) {
    const token = getRootValue(['integration', 'homeassistant', 'access_token'], '') || '';
    elements.integrationHaToken.value = token;
  }

  updateIntegrationUiState(mode);
}

function bindIntegrationSettings() {
  if (integrationBindingsInitialized) {
    return;
  }

  if (elements.integrationMode) {
    elements.integrationMode.addEventListener('change', (event) => {
      const value = event.target.value || 'homeassistant';
      setRootValue(['integration', 'mode'], value);
      updateIntegrationUiState(value);
      populateMqttSettings();
    });
  }

  if (elements.integrationHaBaseUrl) {
    elements.integrationHaBaseUrl.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      if (value) {
        setRootValue(['integration', 'homeassistant', 'base_url'], value);
      } else {
        deleteRootValue(['integration', 'homeassistant', 'base_url']);
      }
    });
  }

  if (elements.integrationHaToken) {
    elements.integrationHaToken.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      if (value) {
        setRootValue(['integration', 'homeassistant', 'access_token'], value);
      } else {
        deleteRootValue(['integration', 'homeassistant', 'access_token']);
      }
    });
  }

  integrationBindingsInitialized = true;
}

function populateGeneralSettings() {
  if (!elements.generalUpdateTime) {
    return;
  }

  populateIntegrationSettings();

  const updateTime = getRootValue(['update_time'], '');
  elements.generalUpdateTime.value = updateTime !== undefined && updateTime !== null ? updateTime : '';

  const temperatureInterval = getRootValue(['temperature_interval'], '');
  elements.generalTemperatureInterval.value =
    temperatureInterval !== undefined && temperatureInterval !== null ? temperatureInterval : '';

  const mqttBaseValue = getRootValue(['mqtt_base'], '') || '';
  if (generalPresetControllers.mqttBase?.setValue) {
    generalPresetControllers.mqttBase.setValue(mqttBaseValue);
  } else if (elements.generalMqttBase) {
    elements.generalMqttBase.value = mqttBaseValue;
  }

  const mqttDeviceValue = getRootValue(['mqtt_device_name'], '') || '';
  if (generalPresetControllers.mqttDevice?.setValue) {
    generalPresetControllers.mqttDevice.setValue(mqttDeviceValue);
  } else if (elements.generalMqttDevice) {
    elements.generalMqttDevice.value = mqttDeviceValue;
  }

  const discoveryPrefixValue = getRootValue(['discovery_prefix'], '') || '';
  if (generalPresetControllers.discoveryPrefix?.setValue) {
    generalPresetControllers.discoveryPrefix.setValue(discoveryPrefixValue);
  } else if (elements.generalDiscoveryPrefix) {
    elements.generalDiscoveryPrefix.value = discoveryPrefixValue;
  }
  elements.generalRetainMessages.checked = Boolean(getRootValue(['retain_messages'], false));
  elements.generalDiscoveryRetain.checked = Boolean(getRootValue(['discovery_retain'], false));

  refreshAllMqttSuggestions();
}

function populatePlcSettings() {
  if (!elements.plcHost) {
    return;
  }

  elements.plcHost.value = getRootValue(['plc', 'host'], '') || '';

  const port = getRootValue(['plc', 'port'], '');
  if (plcPresetControllers.port?.setValue) {
    plcPresetControllers.port.setValue(port !== undefined && port !== null ? port : '');
  } else if (elements.plcPort) {
    elements.plcPort.value = port !== undefined && port !== null ? port : '';
  }

  const rack = getRootValue(['plc', 'rack'], '');
  if (plcPresetControllers.rack?.setValue) {
    plcPresetControllers.rack.setValue(rack !== undefined && rack !== null ? rack : '');
  } else if (elements.plcRack) {
    elements.plcRack.value = rack !== undefined && rack !== null ? rack : '';
  }

  const slot = getRootValue(['plc', 'slot'], '');
  if (plcPresetControllers.slot?.setValue) {
    plcPresetControllers.slot.setValue(slot !== undefined && slot !== null ? slot : '');
  } else if (elements.plcSlot) {
    elements.plcSlot.value = slot !== undefined && slot !== null ? slot : '';
  }

  const localTsap = getRootValue(['plc', 'local_tsap_id'], '') || '';
  if (plcPresetControllers.localTsap?.setValue) {
    plcPresetControllers.localTsap.setValue(localTsap);
  } else if (elements.plcLocalTsap) {
    elements.plcLocalTsap.value = localTsap;
  }

  const remoteTsap = getRootValue(['plc', 'remote_tsap_id'], '') || '';
  if (plcPresetControllers.remoteTsap?.setValue) {
    plcPresetControllers.remoteTsap.setValue(remoteTsap);
  } else if (elements.plcRemoteTsap) {
    elements.plcRemoteTsap.value = remoteTsap;
  }

  const simulationInterval = getRootValue(['plc', 'simulation_interval'], '');
  if (plcPresetControllers.simulationInterval?.setValue) {
    plcPresetControllers.simulationInterval.setValue(
      simulationInterval !== undefined && simulationInterval !== null ? simulationInterval : '',
    );
  } else if (elements.plcSimulationInterval) {
    elements.plcSimulationInterval.value =
      simulationInterval !== undefined && simulationInterval !== null ? simulationInterval : '';
  }

  elements.plcTestMode.checked = Boolean(getRootValue(['plc', 'test_mode'], false));
}

function populateMqttSettings() {
  if (!elements.mqttHost) {
    return;
  }

  const mode = getIntegrationModeValue();
  const disabled = mode !== 'mqtt';

  elements.mqttHost.value = getRootValue(['mqtt', 'host'], '') || '';
  elements.mqttHost.disabled = disabled;

  if (elements.mqttUser) {
    elements.mqttUser.value = getRootValue(['mqtt', 'user'], '') || '';
    elements.mqttUser.disabled = disabled;
  }

  if (elements.mqttPassword) {
    elements.mqttPassword.value = getRootValue(['mqtt', 'password'], '') || '';
    elements.mqttPassword.disabled = disabled;
  }

  if (elements.mqttRejectUnauthorized) {
    elements.mqttRejectUnauthorized.checked = Boolean(getRootValue(['mqtt', 'rejectUnauthorized'], false));
    elements.mqttRejectUnauthorized.disabled = disabled;
  }

  updateIntegrationUiState(mode);
}

function renderEntities() {
  if (!elements.entityList) {
    return;
  }

  entityFieldRefs.clear();

  const entities = Array.isArray(entityConfigData?.entities) ? entityConfigData.entities : [];
  elements.entityList.innerHTML = '';

  if (entities.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Keine Entitäten konfiguriert. Füge über den Button oben eine neue Entität hinzu.';
    elements.entityList.appendChild(empty);
    refreshAllMqttSuggestions();
    return;
  }

  entities.forEach((entity, index) => {
    const cardFragment = createEntityCard(entity || {}, index);
    elements.entityList.appendChild(cardFragment);
  });

  refreshAllMqttSuggestions();
}

function createEntityCard(entity, index) {
  const template = elements.entityTemplate;
  let card;
  let fragment;
  if (template && template.content) {
    fragment = template.content.cloneNode(true);
    card = fragment.querySelector('.entity-card');
  } else {
    card = document.createElement('article');
    card.className = 'entity-card';
    fragment = card;
  }

  const titleEl = card.querySelector('.entity-card__title');
  const subtitleEl = card.querySelector('.entity-card__subtitle');

  if (titleEl) {
    titleEl.textContent = entity.name || `Entität ${index + 1}`;
  }

  if (subtitleEl) {
    subtitleEl.textContent = entity.type ? `Typ: ${entity.type}` : 'Typ nicht gesetzt';
  }

  const duplicateButton = card.querySelector('.js-entity-duplicate');
  if (duplicateButton) {
    duplicateButton.addEventListener('click', () => duplicateEntity(index));
  }

  const removeButton = card.querySelector('.js-entity-remove');
  if (removeButton) {
    removeButton.addEventListener('click', () => removeEntity(index));
  }

  const addFieldButton = card.querySelector('.js-entity-add-field');
  if (addFieldButton) {
    addFieldButton.addEventListener('click', () => addEntityField(index));
  }

  const content = card.querySelector('.js-entity-content') || card;
  content.innerHTML = '';

  const generalSection = createEntitySection('Allgemein');
  const generalGrid = document.createElement('div');
  generalGrid.className = 'entity-grid';
  generalSection.appendChild(generalGrid);

  generalGrid.appendChild(createTypeField(index, entity.type || '', titleEl, subtitleEl));
  generalGrid.appendChild(
    createTextField(index, ['name'], 'Name', entity.name || '', (next) => {
      if (titleEl) {
        titleEl.textContent = next || `Entität ${index + 1}`;
      }
      updateEntityMqttSuggestions(index);
    }),
  );
  generalGrid.appendChild(createTextField(index, ['device_name'], 'Gerätename', entity.device_name || ''));
  generalGrid.appendChild(
    createTextField(index, ['mqtt'], 'MQTT Topic', entity.mqtt || '', null, { mqttTopic: true, entity }),
  );
  generalGrid.appendChild(createTextField(index, ['manufacturer'], 'Hersteller', entity.manufacturer || ''));
  content.appendChild(generalSection);

  const addressSection = createEntitySection('SPS Zuordnung');
  const addressGrid = document.createElement('div');
  addressGrid.className = 'entity-grid';
  let hasAddressFields = false;

  const propertySection = createEntitySection('Weitere Felder');
  const propertyGrid = document.createElement('div');
  propertyGrid.className = 'entity-grid';
  let hasPropertyFields = false;

  const nestedSections = [];

  Object.entries(entity).forEach(([key, value]) => {
    if (['type', 'name', 'device_name', 'mqtt', 'manufacturer'].includes(key)) {
      return;
    }
    const field = createFieldForValue(index, key, value, [key], titleEl, subtitleEl);
    if (!field) {
      return;
    }
    if (field.classList && field.classList.contains('entity-section')) {
      nestedSections.push(field);
      return;
    }
    if (typeof value === 'string' && isAddressValue(value)) {
      addressGrid.appendChild(field);
      hasAddressFields = true;
      return;
    }
    propertyGrid.appendChild(field);
    hasPropertyFields = true;
  });

  if (!hasAddressFields) {
    addressGrid.appendChild(
      createAddressField(index, ['state'], 'Zustand (Adresse)', entity.state || ''),
    );
    hasAddressFields = true;
  }

  if (hasAddressFields) {
    addressSection.appendChild(addressGrid);
    content.appendChild(addressSection);
  }

  if (hasPropertyFields) {
    propertySection.appendChild(propertyGrid);
    content.appendChild(propertySection);
  }

  nestedSections.forEach((section) => {
    content.appendChild(section);
  });

  return fragment || card;
}

function addEntity(blueprintId = null) {
  if (elements.entityWizard) {
    openEntityWizard(blueprintId);
    return;
  }

  const entities = ensureEntitiesArray();
  const nextIndex = entities.length + 1;
  entities.push({
    type: 'sensor',
    name: `Entität ${nextIndex}`,
  });
  markEntityConfigDirty();
  renderEntities();
}

function duplicateEntity(index) {
  const entities = ensureEntitiesArray();
  const source = entities[index];
  if (!source) {
    return;
  }
  const clone = JSON.parse(JSON.stringify(source));
  clone.name = `${clone.name || `Entität ${index + 1}`} Kopie`;
  entities.splice(index + 1, 0, clone);
  markEntityConfigDirty();
  renderEntities();
}

function removeEntity(index) {
  const entities = ensureEntitiesArray();
  if (!entities[index]) {
    return;
  }
  if (!window.confirm('Soll diese Entität wirklich entfernt werden?')) {
    return;
  }
  entities.splice(index, 1);
  markEntityConfigDirty();
  renderEntities();
}

function addEntityField(index) {
  const input = window.prompt('Neues Feld hinzufügen (z. B. state oder state.set_plc):');
  if (!input) {
    return;
  }
  const segments = input
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return;
  }

  const entity = getEntityAt(index);
  let cursor = entity;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  const finalKey = segments[segments.length - 1];
  if (Object.prototype.hasOwnProperty.call(cursor, finalKey)) {
    window.alert('Dieses Feld existiert bereits.');
    return;
  }

  setEntityValue(index, segments, '');
  renderEntities();
}

function populateWizardCategoryOptions(direction, preferredId = null) {
  if (!elements.entityWizardCategory) {
    return null;
  }

  const blueprints = getBlueprintsForDirection(direction);
  const fragment = document.createDocumentFragment();

  blueprints.forEach((blueprint) => {
    const option = document.createElement('option');
    option.value = blueprint.id;
    option.textContent = blueprint.label || blueprint.id;
    fragment.appendChild(option);
  });

  elements.entityWizardCategory.innerHTML = '';
  elements.entityWizardCategory.appendChild(fragment);

  const fallbackId =
    preferredId && blueprints.some((bp) => bp.id === preferredId)
      ? preferredId
      : blueprints[0]?.id || '';

  if (fallbackId) {
    elements.entityWizardCategory.value = fallbackId;
  }

  wizardState.blueprintId = fallbackId || null;
  return getBlueprintById(fallbackId);
}

function getSelectedBlueprint() {
  const currentId = elements.entityWizardCategory?.value || wizardState.blueprintId;
  return getBlueprintById(currentId);
}

function openEntityWizard(preselectedId = null) {
  if (!elements.entityWizard) {
    const entities = ensureEntitiesArray();
    const nextIndex = entities.length + 1;
    entities.push({
      type: 'sensor',
      name: `Entität ${nextIndex}`,
    });
    markEntityConfigDirty();
    renderEntities();
    return;
  }

  const targetBlueprint = preselectedId ? getBlueprintById(preselectedId) : null;
  const direction = targetBlueprint?.direction || wizardState.direction || 'output';
  wizardState.direction = direction;

  if (elements.entityWizardForm) {
    elements.entityWizardForm.reset();
  }

  if (elements.entityWizardDirection) {
    elements.entityWizardDirection.value = direction;
  }

  const blueprint = populateWizardCategoryOptions(direction, targetBlueprint?.id || null);

  const entities = ensureEntitiesArray();
  const defaultName =
    targetBlueprint?.defaultName ||
    blueprint?.defaultName ||
    blueprint?.label ||
    `Entität ${entities.length + 1}`;

  if (elements.entityWizardName) {
    elements.entityWizardName.value = defaultName;
    elements.entityWizardName.dataset.touched = '';
  }

  updateEntityWizardPreview();

  elements.entityWizard.classList.add('is-open');
  elements.entityWizard.setAttribute('aria-hidden', 'false');

  window.requestAnimationFrame(() => {
    elements.entityWizardName?.focus();
    elements.entityWizardName?.select();
  });
}

function closeEntityWizard() {
  if (!elements.entityWizard) {
    return;
  }
  elements.entityWizard.classList.remove('is-open');
  elements.entityWizard.setAttribute('aria-hidden', 'true');
}

function updateEntityWizardPreview() {
  if (!elements.entityWizard) {
    return;
  }

  const blueprint = getSelectedBlueprint();
  if (blueprint) {
    wizardState.blueprintId = blueprint.id;
  }

  if (elements.entityWizardDescription) {
    elements.entityWizardDescription.textContent =
      blueprint?.description || 'Wähle eine Vorlage, um passende Felder zu erhalten.';
  }

  const entities = Array.isArray(entityConfigData?.entities) ? entityConfigData.entities : [];
  const entityCount = entities.length;
  const nameInput = elements.entityWizardName;
  const rawName = nameInput ? nameInput.value.trim() : '';

  const mqttCandidates = [
    slugify(rawName),
    slugify(blueprint?.mqttHint ? `${blueprint.mqttHint}_${entityCount + 1}` : ''),
    slugify(`${blueprint?.type || 'entity'}_${entityCount + 1}`),
  ];
  const mqttName = mqttCandidates.find((candidate) => candidate) || `entity_${entityCount + 1}`;
  const baseTopic = getBaseDeviceTopic();

  if (elements.entityWizardTopic) {
    elements.entityWizardTopic.textContent = mqttName
      ? baseTopic
        ? `${baseTopic}/${mqttName}`
        : mqttName
      : '–';
  }

  if (elements.entityWizardAddressHint) {
    elements.entityWizardAddressHint.textContent = buildBlueprintAddressSummary(blueprint);
  }
}

function createEntityFromBlueprint() {
  const blueprint = getSelectedBlueprint();
  if (!blueprint) {
    const entities = ensureEntitiesArray();
    const nextIndex = entities.length + 1;
    entities.push({ type: 'sensor', name: `Entität ${nextIndex}` });
    markEntityConfigDirty();
    renderEntities();
    closeEntityWizard();
    return;
  }

  const entities = ensureEntitiesArray();
  const entityIndex = entities.length;
  const rawName = elements.entityWizardName?.value?.trim();
  const name =
    rawName ||
    blueprint.defaultName ||
    blueprint.label ||
    `Entität ${entityIndex + 1}`;

  const newEntity = { type: blueprint.type, name };

  if (blueprint.addressFields) {
    Object.entries(blueprint.addressFields).forEach(([key, meta]) => {
      const suggestion = pickSuggestedAddress(meta?.patterns || [], blueprint.direction);
      if (suggestion) {
        newEntity[key] = suggestion;
      } else if (!meta?.optional) {
        newEntity[key] = '';
      }
    });
  }

  if (blueprint.extras) {
    Object.entries(blueprint.extras).forEach(([extraKey, extraValue]) => {
      newEntity[extraKey] = Array.isArray(extraValue) ? [...extraValue] : extraValue;
    });
  }

  const mqttCandidates = [
    slugify(rawName),
    slugify(`${blueprint.mqttHint || blueprint.type || 'entity'}_${entityIndex + 1}`),
    slugify(`${blueprint.type || 'entity'}_${entityIndex + 1}`),
  ];
  newEntity.mqtt = mqttCandidates.find((candidate) => candidate) || `entity_${entityIndex + 1}`;

  entities.push(newEntity);
  markEntityConfigDirty();
  renderEntities();
  refreshAllMqttSuggestions();
  closeEntityWizard();

  window.requestAnimationFrame(() => {
    const cards = elements.entityList?.querySelectorAll('.entity-card');
    if (cards && cards[cards.length - 1]) {
      cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function bindGeneralSettings() {
  if (generalBindingsInitialized) {
    return;
  }

  if (elements.generalUpdateTime) {
    elements.generalUpdateTime.addEventListener('input', (event) => {
      if (event.target.value === '') {
        deleteRootValue(['update_time']);
        return;
      }
      const numeric = normalizeInteger(event.target.value);
      if (numeric !== null) {
        setRootValue(['update_time'], numeric);
      }
    });
  }

  if (elements.generalTemperatureInterval) {
    elements.generalTemperatureInterval.addEventListener('input', (event) => {
      if (event.target.value === '') {
        deleteRootValue(['temperature_interval']);
        return;
      }
      const numeric = normalizeInteger(event.target.value);
      if (numeric !== null) {
        setRootValue(['temperature_interval'], numeric);
      }
    });
  }

  if (elements.generalMqttBase && !generalPresetControllers.mqttBase) {
    generalPresetControllers.mqttBase = setupPresetField(
      elements.generalMqttBase,
      elements.generalMqttBaseCustom,
      MQTT_BASE_PRESETS,
      (value) => {
        if (value) {
          setRootValue(['mqtt_base'], value);
        } else {
          deleteRootValue(['mqtt_base']);
        }
        refreshAllMqttSuggestions();
      },
      { placeholder: 'Basis auswählen', customLabel: 'Eigene Basis…' },
    );
  }

  if (elements.generalMqttDevice && !generalPresetControllers.mqttDevice) {
    generalPresetControllers.mqttDevice = setupPresetField(
      elements.generalMqttDevice,
      elements.generalMqttDeviceCustom,
      MQTT_DEVICE_PRESETS,
      (value) => {
        if (value) {
          setRootValue(['mqtt_device_name'], value);
        } else {
          deleteRootValue(['mqtt_device_name']);
        }
        refreshAllMqttSuggestions();
      },
      { placeholder: 'Gerätenamen wählen', customLabel: 'Eigener Gerätename…' },
    );
  }

  if (elements.generalDiscoveryPrefix && !generalPresetControllers.discoveryPrefix) {
    generalPresetControllers.discoveryPrefix = setupPresetField(
      elements.generalDiscoveryPrefix,
      elements.generalDiscoveryPrefixCustom,
      DISCOVERY_PREFIX_PRESETS,
      (value) => {
        if (value) {
          setRootValue(['discovery_prefix'], value);
        } else {
          deleteRootValue(['discovery_prefix']);
        }
      },
      { placeholder: 'Prefix auswählen', customLabel: 'Eigenes Prefix…' },
    );
  }

  if (elements.generalRetainMessages) {
    elements.generalRetainMessages.addEventListener('change', (event) => {
      setRootValue(['retain_messages'], event.target.checked);
    });
  }

  if (elements.generalDiscoveryRetain) {
    elements.generalDiscoveryRetain.addEventListener('change', (event) => {
      setRootValue(['discovery_retain'], event.target.checked);
    });
  }

  generalBindingsInitialized = true;
}

function bindPlcSettings() {
  if (plcBindingsInitialized) {
    return;
  }

  if (elements.plcHost) {
    elements.plcHost.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      if (value) {
        setRootValue(['plc', 'host'], value);
      } else {
        deleteRootValue(['plc', 'host']);
      }
    });
  }

  if (elements.plcPort && !plcPresetControllers.port) {
    plcPresetControllers.port = setupPresetField(
      elements.plcPort,
      elements.plcPortCustom,
      PLC_PORT_PRESETS,
      (value) => {
        if (value === null) {
          deleteRootValue(['plc', 'port']);
          return;
        }
        const numeric = normalizeInteger(value);
        if (numeric !== null) {
          setRootValue(['plc', 'port'], numeric);
        }
      },
      { placeholder: 'Port wählen', customLabel: 'Eigener Port…' },
    );
  }

  if (elements.plcRack && !plcPresetControllers.rack) {
    plcPresetControllers.rack = setupPresetField(
      elements.plcRack,
      elements.plcRackCustom,
      PLC_RACK_PRESETS,
      (value) => {
        if (value === null) {
          deleteRootValue(['plc', 'rack']);
          return;
        }
        const numeric = normalizeInteger(value);
        if (numeric !== null) {
          setRootValue(['plc', 'rack'], numeric);
        }
      },
      { placeholder: 'Rack wählen', customLabel: 'Eigenes Rack…' },
    );
  }

  if (elements.plcSlot && !plcPresetControllers.slot) {
    plcPresetControllers.slot = setupPresetField(
      elements.plcSlot,
      elements.plcSlotCustom,
      PLC_SLOT_PRESETS,
      (value) => {
        if (value === null) {
          deleteRootValue(['plc', 'slot']);
          return;
        }
        const numeric = normalizeInteger(value);
        if (numeric !== null) {
          setRootValue(['plc', 'slot'], numeric);
        }
      },
      { placeholder: 'Slot wählen', customLabel: 'Eigener Slot…' },
    );
  }

  if (elements.plcLocalTsap && !plcPresetControllers.localTsap) {
    plcPresetControllers.localTsap = setupPresetField(
      elements.plcLocalTsap,
      elements.plcLocalTsapCustom,
      PLC_TSAP_PRESETS,
      (value) => {
        if (value) {
          setRootValue(['plc', 'local_tsap_id'], value.trim());
        } else {
          deleteRootValue(['plc', 'local_tsap_id']);
        }
      },
      { placeholder: 'Lokale TSAP wählen', customLabel: 'Eigene TSAP…' },
    );
  }

  if (elements.plcRemoteTsap && !plcPresetControllers.remoteTsap) {
    plcPresetControllers.remoteTsap = setupPresetField(
      elements.plcRemoteTsap,
      elements.plcRemoteTsapCustom,
      PLC_TSAP_PRESETS,
      (value) => {
        if (value) {
          setRootValue(['plc', 'remote_tsap_id'], value.trim());
        } else {
          deleteRootValue(['plc', 'remote_tsap_id']);
        }
      },
      { placeholder: 'Remote TSAP wählen', customLabel: 'Eigene TSAP…' },
    );
  }

  if (elements.plcSimulationInterval && !plcPresetControllers.simulationInterval) {
    plcPresetControllers.simulationInterval = setupPresetField(
      elements.plcSimulationInterval,
      elements.plcSimulationIntervalCustom,
      PLC_SIM_PRESETS,
      (value) => {
        if (value === null) {
          deleteRootValue(['plc', 'simulation_interval']);
          return;
        }
        const numeric = normalizeInteger(value);
        if (numeric !== null) {
          setRootValue(['plc', 'simulation_interval'], numeric);
        }
      },
      { placeholder: 'Intervall wählen', customLabel: 'Eigenes Intervall…' },
    );
  }

  if (elements.plcTestMode) {
    elements.plcTestMode.addEventListener('change', (event) => {
      setRootValue(['plc', 'test_mode'], event.target.checked);
    });
  }

  plcBindingsInitialized = true;
}

function bindMqttSettings() {
  if (mqttBindingsInitialized) {
    return;
  }

  if (elements.mqttHost) {
    elements.mqttHost.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      if (value) {
        setRootValue(['mqtt', 'host'], value);
      } else {
        deleteRootValue(['mqtt', 'host']);
      }
    });
  }

  if (elements.mqttUser) {
    elements.mqttUser.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      if (value) {
        setRootValue(['mqtt', 'user'], value);
      } else {
        deleteRootValue(['mqtt', 'user']);
      }
    });
  }

  if (elements.mqttPassword) {
    elements.mqttPassword.addEventListener('input', (event) => {
      const value = event.target.value.trim();
      if (value) {
        setRootValue(['mqtt', 'password'], value);
      } else {
        deleteRootValue(['mqtt', 'password']);
      }
    });
  }

  if (elements.mqttRejectUnauthorized) {
    elements.mqttRejectUnauthorized.addEventListener('change', (event) => {
      setRootValue(['mqtt', 'rejectUnauthorized'], event.target.checked);
    });
  }

  mqttBindingsInitialized = true;
}

function clearRowSelection() {
  if (!elements.configTableBody) {
    return;
  }

  elements.configTableBody.querySelectorAll('.config-row').forEach((row) => {
    row.dataset.selected = 'false';
  });
}

function selectRow(row) {
  clearRowSelection();
  if (row) {
    row.dataset.selected = 'true';
  }
  activeRow = row;
}

function refreshEditorStatusLabel() {
  if (!elements.editorFileStatus) {
    return;
  }

  if (!activeFileName) {
    elements.editorFileStatus.textContent = 'Keine Datei ausgewählt';
  } else if (editorDirty) {
    elements.editorFileStatus.textContent = 'Änderungen nicht gespeichert';
  } else if (activeFileExists) {
    elements.editorFileStatus.textContent = 'Gespeichert';
  } else {
    elements.editorFileStatus.textContent = 'Noch nicht gespeichert';
  }
}

function resetEditor(message = 'Keine Datei ausgewählt') {
  activeFileName = null;
  activeFileExists = false;
  editorDirty = false;
  editorTemplate = null;
  lastLoadedContent = '';
  selectRow(null);

  if (elements.editorTextarea) {
    elements.editorTextarea.value = '';
    elements.editorTextarea.disabled = true;
  }
  if (elements.editorSaveButton) {
    elements.editorSaveButton.disabled = true;
  }
  if (elements.editorReloadButton) {
    elements.editorReloadButton.disabled = true;
  }
  if (elements.editorExampleButton) {
    elements.editorExampleButton.disabled = true;
  }
  if (elements.editorFileName) {
    elements.editorFileName.textContent = '–';
  }
  if (elements.editorUpdated) {
    elements.editorUpdated.textContent = '–';
  }

  refreshEditorStatusLabel();
  setEditorStatus(message, 'info');
}

function setEditorDirty(isDirty) {
  editorDirty = Boolean(isDirty);
  if (elements.editorSaveButton) {
    elements.editorSaveButton.disabled = !editorDirty || !activeFileName;
  }
  refreshEditorStatusLabel();
}

function updateEditorMeta(detail = {}) {
  if (typeof detail.exists === 'boolean') {
    activeFileExists = detail.exists;
  }

  if (detail.name) {
    activeFileName = detail.name;
  }

  if (elements.editorFileName) {
    elements.editorFileName.textContent = activeFileName || detail.name || '–';
  }

  if (elements.editorUpdated) {
    elements.editorUpdated.textContent = detail.modified_at ? formatDate(detail.modified_at) : '–';
  }

  refreshEditorStatusLabel();
}

function formatDate(isoString) {
  if (!isoString) {
    return '–';
  }
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return '–';
    }
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return '–';
  }
}

function updateBadge(element, { text, variant }) {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.dataset.variant = variant;
}

function updateMetadata(metadata = {}, system = {}) {
  if (elements.addonName) {
    elements.addonName.textContent = metadata.name || 'MQTT S7 Connector';
  }
  if (elements.addonNameSecondary) {
    elements.addonNameSecondary.textContent = metadata.name || 'MQTT S7 Connector';
  }
  if (elements.addonDescription) {
    elements.addonDescription.textContent =
      metadata.description ||
      'Verwalte die Konfiguration des MQTT Siemens S7 Connectors direkt im Browser.';
  }
  if (elements.addonVersion) {
    elements.addonVersion.textContent = metadata.version || '–';
  }
  if (elements.addonVersionSecondary) {
    elements.addonVersionSecondary.textContent = metadata.version || '–';
  }
  if (elements.addonSlug) {
    elements.addonSlug.textContent = metadata.slug || '–';
  }
  if (elements.addonSlugSecondary) {
    elements.addonSlugSecondary.textContent = metadata.slug || '–';
  }
  if (elements.configPath) {
    const displayPath =
      system.config_path ||
      (system.config_relative_path && system.config_directory
        ? `${String(system.config_directory).replace(/\/+$/, '')}/${system.config_relative_path}`
        : null) ||
      system.options_path ||
      '–';
    elements.configPath.textContent = displayPath;
  }
  if (elements.editorSubtitle) {
    if (system.config_directory) {
      elements.editorSubtitle.textContent = `Dateien im Verzeichnis ${system.config_directory}`;
    } else {
      elements.editorSubtitle.textContent =
        'Wähle eine Config-Datei aus der Liste, um den Inhalt anzupassen.';
    }
  }
  const formattedDate = formatDate(system.last_modified);
  if (elements.configUpdatedPrimary) {
    elements.configUpdatedPrimary.textContent = formattedDate;
  }
  if (elements.configUpdatedSecondary) {
    elements.configUpdatedSecondary.textContent = formattedDate;
  }
  if (elements.configCount) {
    elements.configCount.textContent = `${system.total_files ?? 0}`;
  }

  if (elements.configStatusBadge) {
    if (system.config_exists) {
      updateBadge(elements.configStatusBadge, {
        text: 'Konfiguration gefunden',
        variant: 'success',
      });
    } else {
      updateBadge(elements.configStatusBadge, {
        text: 'Konfiguration fehlt',
        variant: 'warning',
      });
    }
  }

  if (elements.addonStatus) {
    if (system.config_exists) {
      updateBadge(elements.addonStatus, {
        text: 'Bereit',
        variant: 'success',
      });
    } else {
      updateBadge(elements.addonStatus, {
        text: 'Unvollständig',
        variant: 'warning',
      });
    }
  }
}

function updateTestModeUI(enabled) {
  testModeEnabled = Boolean(enabled);

  if (elements.testModeToggle) {
    elements.testModeToggle.textContent = testModeEnabled ? 'Testmodus deaktivieren' : 'Testmodus aktivieren';
    elements.testModeToggle.dataset.active = testModeEnabled ? 'true' : 'false';
    elements.testModeToggle.setAttribute('aria-pressed', testModeEnabled ? 'true' : 'false');
  }

  if (elements.testModeBadge) {
    elements.testModeBadge.textContent = testModeEnabled ? 'Aktiv' : 'Inaktiv';
    elements.testModeBadge.dataset.variant = testModeEnabled ? 'success' : 'muted';
  }

  if (elements.testModeSummary) {
    elements.testModeSummary.textContent = testModeEnabled ? 'Aktiv' : 'Inaktiv';
    elements.testModeSummary.dataset.variant = testModeEnabled ? 'success' : 'info';
  }

  setTestModeStatus('', 'info');
}

function applyDetailToRow(row, detail = {}) {
  const statusElement = row.querySelector('.js-config-row-status');
  const modifiedElement = row.querySelector('.js-config-modified');
  const currentDetail = {
    name: detail.name || row.dataset.originalName || '',
    exists: Boolean(detail.exists),
    modified_at: detail.modified_at || null,
  };
  rowDetails.set(row, currentDetail);

  if (currentDetail.name) {
    row.dataset.originalName = currentDetail.name;
  }

  let label = 'Neu';
  let variant = 'info';

  if (currentDetail.name && currentDetail.exists) {
    label = 'Gefunden';
    variant = 'success';
  } else if (currentDetail.name) {
    label = 'Nicht gefunden';
    variant = 'warning';
  }

  if (statusElement) {
    statusElement.textContent = label;
    statusElement.dataset.variant = variant;
  }

  if (modifiedElement) {
    if (currentDetail.exists && currentDetail.modified_at) {
      modifiedElement.textContent = formatDate(currentDetail.modified_at);
    } else if (currentDetail.name) {
      modifiedElement.textContent = currentDetail.exists ? formatDate(currentDetail.modified_at) : 'Noch nicht vorhanden';
    } else {
      modifiedElement.textContent = '–';
    }
  }
}

function markRowDirty(row, value) {
  const statusElement = row.querySelector('.js-config-row-status');
  const modifiedElement = row.querySelector('.js-config-modified');
  const originalValue = row.dataset.originalName || '';

  if (!statusElement || !modifiedElement) {
    return;
  }

  if (!value && originalValue) {
    statusElement.textContent = 'Wird entfernt';
    statusElement.dataset.variant = 'warning';
  } else if (!value && !originalValue) {
    statusElement.textContent = 'Neu';
    statusElement.dataset.variant = 'info';
  } else if (value === originalValue) {
    applyDetailToRow(row, rowDetails.get(row));
    return;
  } else if (!originalValue) {
    statusElement.textContent = 'Neu';
    statusElement.dataset.variant = 'info';
  } else {
    statusElement.textContent = 'Geändert';
    statusElement.dataset.variant = 'info';
  }

  modifiedElement.textContent = 'Nach dem Speichern verfügbar';
}

function ensureAtLeastOneRow() {
  if (!elements.configTableBody) {
    return;
  }
  if (!elements.configTableBody.querySelector('tr')) {
    createRow();
  }
}

function createRow(detail) {
  if (!elements.rowTemplate || !elements.configTableBody) {
    return;
  }

  const fragment = elements.rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.config-row');
  const input = fragment.querySelector('.js-config-input');
  const removeButton = fragment.querySelector('.js-remove');
  const editButton = fragment.querySelector('.js-edit');

  const value = detail?.name || '';
  if (row) {
    row.dataset.originalName = value;
    row.dataset.selected = 'false';
  }

  if (input) {
    input.value = value;
    input.addEventListener('input', (event) => {
      const trimmedValue = event.target.value.trim();
      if (editButton) {
        editButton.disabled = trimmedValue.length === 0;
      }

      const wasActive = row === activeRow;
      markRowDirty(row, trimmedValue);

      if (wasActive && trimmedValue !== activeFileName) {
        const hasName = trimmedValue.length > 0;
        resetEditor(hasName ? 'Dateiname geändert – Datei neu laden.' : 'Dateiname entfernt.');
        if (hasName) {
          selectRow(row);
          updateEditorMeta({ name: trimmedValue, exists: false, modified_at: null });
          setEditorStatus('Dateiname geändert – Datei neu laden.', 'info');
        }
      }
    });
  }

  if (removeButton) {
    removeButton.addEventListener('click', () => {
      const wasActive = row === activeRow;
      if (row) {
        row.remove();
      }
      if (wasActive) {
        resetEditor('Datei wurde aus der Liste entfernt.');
      }
      ensureAtLeastOneRow();
    });
  }

  if (editButton) {
    editButton.disabled = value.trim().length === 0;
    editButton.addEventListener('click', () => {
      const targetValue = input ? input.value.trim() : value.trim();
      if (!targetValue) {
        setEditorStatus('Bitte zuerst einen Dateinamen eingeben.', 'error');
        return;
      }
      openEditor(row, targetValue);
    });
  }

  if (row) {
    applyDetailToRow(row, detail);
  }

  elements.configTableBody.appendChild(fragment);
}

function populateConfigFiles(configFiles = [], details = []) {
  if (!elements.configTableBody) {
    return;
  }

  const mappedDetails = new Map();
  details.forEach((detail) => {
    if (detail && detail.name) {
      mappedDetails.set(detail.name, detail);
    }
  });

  elements.configTableBody.innerHTML = '';
  const uniqueFiles = Array.from(new Set(configFiles.filter((name) => typeof name === 'string')));

  if (uniqueFiles.length === 0) {
    createRow();
    return;
  }

  uniqueFiles.forEach((file) => {
    createRow(mappedDetails.get(file) || { name: file });
  });
}

function populateLogLevels(logLevels = [], currentLevel) {
  if (!elements.logLevelSelect) {
    return;
  }
  elements.logLevelSelect.innerHTML = '';
  logLevels.forEach((level) => {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = level;
    if (level === currentLevel) {
      option.selected = true;
    }
    elements.logLevelSelect.appendChild(option);
  });
}

function collectConfigFiles() {
  if (!elements.configTableBody) {
    return [];
  }
  const values = Array.from(
    elements.configTableBody.querySelectorAll('.js-config-input') || []
  )
    .map((input) => input.value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(values));
}

async function postConfigUpdate(body) {
  const response = await fetch('api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error('Ungültige Antwort vom Server erhalten.');
    }
  }

  if (!response.ok) {
    throw new Error(payload.message || 'Server hat die Aktualisierung abgelehnt.');
  }

  applyConfigData(payload);
  return payload;
}

async function openEditor(row, fileName) {
  const target = (fileName || '').trim();
  if (!target) {
    setEditorStatus('Bitte zuerst einen Dateinamen eingeben.', 'error');
    return;
  }

  selectRow(row);
  setEditorStatus('Lade Datei…', 'info');

  if (elements.editorTextarea) {
    elements.editorTextarea.disabled = true;
  }

  try {
    const response = await fetch(`api/files/${encodeURIComponent(target)}`);
    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error('Ungültige Antwort vom Server erhalten.');
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || 'Datei konnte nicht geladen werden.');
    }

    const resolvedName = typeof payload.name === 'string' && payload.name.length > 0 ? payload.name : target;
    activeFileName = resolvedName;
    editorTemplate = payload.template || null;
    lastLoadedContent = payload.content || '';

    updateEditorMeta({
      name: resolvedName,
      exists: Boolean(payload.exists),
      modified_at: payload.modified_at || null,
    });

    if (elements.editorTextarea) {
      elements.editorTextarea.value = lastLoadedContent;
      elements.editorTextarea.disabled = false;
      elements.editorTextarea.focus();
    }

    if (elements.editorExampleButton) {
      elements.editorExampleButton.disabled = !editorTemplate;
    }

    if (elements.editorReloadButton) {
      elements.editorReloadButton.disabled = false;
    }

    setEditorDirty(false);

    if (payload.exists) {
      setEditorStatus('Datei geladen.', 'info');
    } else {
      setEditorStatus('Neue Datei – noch nicht gespeichert.', 'warning');
    }

    if (row && row.isConnected) {
      applyDetailToRow(row, payload);
    }
  } catch (error) {
    console.error(error);
    editorTemplate = null;
    lastLoadedContent = '';
    activeFileName = null;
    activeFileExists = false;
    if (elements.editorTextarea) {
      elements.editorTextarea.value = '';
      elements.editorTextarea.disabled = true;
    }
    setEditorDirty(false);
    refreshEditorStatusLabel();
    setEditorStatus(error.message || 'Fehler beim Laden der Datei.', 'error');
  }
}

async function saveActiveFile() {
  if (!activeFileName || !elements.editorTextarea) {
    setEditorStatus('Keine Datei ausgewählt.', 'error');
    return;
  }

  setEditorStatus('Speichere Datei…', 'info');

  try {
    const response = await fetch(`api/files/${encodeURIComponent(activeFileName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: elements.editorTextarea.value }),
    });

    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error('Ungültige Antwort beim Speichern erhalten.');
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || 'Fehler beim Speichern der Datei.');
    }

    const detail = payload.detail || { name: activeFileName, exists: true };

    lastLoadedContent = elements.editorTextarea.value;
    setEditorDirty(false);
    updateEditorMeta({
      name: detail.name || activeFileName,
      exists: true,
      modified_at: detail.modified_at || null,
    });

    if (activeRow && activeRow.isConnected) {
      applyDetailToRow(activeRow, detail);
    }

    setEditorStatus('Datei gespeichert.', 'success');
  } catch (error) {
    console.error(error);
    setEditorStatus(error.message || 'Fehler beim Speichern der Datei.', 'error');
  }
}

function applyConfigData(payload) {
  resetEditor();
  populateLogLevels(payload.log_levels || [], payload.log_level);
  populateConfigFiles(payload.config_files || [], payload.config_file_details || []);
  updateMetadata(payload.metadata || {}, payload.system || {});
  updateTestModeUI(payload.test_mode);
}

async function fetchEntityConfig() {
  if (!elements.entityList) {
    return;
  }

  try {
    const response = await fetch(ENTITY_CONFIG_ENDPOINT);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'PLC-Konfiguration konnte nicht geladen werden.');
    }

    entityConfigData = payload.config || {};
    entityConfigMeta = { path: payload.path, modified_at: payload.modified_at };
    clearEntityConfigDirty();

    bindIntegrationSettings();
    bindGeneralSettings();
    bindPlcSettings();
    bindMqttSettings();

    populateGeneralSettings();
    populatePlcSettings();
    populateMqttSettings();
    renderEntities();

    detectionData = payload.last_scan || null;
    applyDetectionOptions(detectionData);
    renderScanTable(detectionData);
    if (detectionData) {
      const statusType = detectionData.status === 'error' ? 'error' : detectionData.status === 'simulation' ? 'info' : 'success';
      setScanStatus(
        detectionData.status === 'error'
          ? detectionData.error || 'Scan fehlgeschlagen.'
          : detectionData.status === 'simulation'
            ? 'Simulationsdaten aktiv.'
            : 'Letzter Scan geladen.',
        statusType,
      );
    } else {
      setScanStatus('Noch kein Scan durchgeführt.', 'info');
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'PLC-Konfiguration konnte nicht geladen werden.', 'error');
    applyDetectionOptions(null);
    renderScanTable(null);
  }
}

async function postEntityConfigUpdate(config) {
  if (!config) {
    return null;
  }

  const response = await fetch(ENTITY_CONFIG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Speichern der PLC-Konfiguration fehlgeschlagen.');
  }

  entityConfigData = payload.config || config;
  entityConfigMeta = { path: payload.path, modified_at: payload.modified_at };
  clearEntityConfigDirty();
  populateGeneralSettings();
  populatePlcSettings();
  populateMqttSettings();
  renderEntities();
  return payload;
}

async function triggerPlcScan() {
  if (elements.scanTriggerButton) {
    elements.scanTriggerButton.disabled = true;
  }
  if (elements.scanRefreshButton) {
    elements.scanRefreshButton.disabled = true;
  }

  setScanStatus('Starte Scan…', 'info');

  try {
    const response = await fetch(PLC_SCAN_ENDPOINT, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'Scan fehlgeschlagen.');
    }

    detectionData = payload;
    applyDetectionOptions(payload);
    renderScanTable(payload);
    const statusType = payload.status === 'error' ? 'error' : 'success';
    setScanStatus(
      payload.status === 'simulation'
        ? 'Simulationsscan abgeschlossen.'
        : payload.status === 'error'
          ? payload.error || 'Scan fehlgeschlagen.'
          : 'Scan erfolgreich abgeschlossen.',
      statusType,
    );
  } catch (error) {
    console.error(error);
    setScanStatus(error.message || 'Scan fehlgeschlagen.', 'error');
  } finally {
    if (elements.scanTriggerButton) {
      elements.scanTriggerButton.disabled = false;
    }
    if (elements.scanRefreshButton) {
      elements.scanRefreshButton.disabled = false;
    }
  }
}

async function loadLastScan() {
  if (elements.scanRefreshButton) {
    elements.scanRefreshButton.disabled = true;
  }
  if (elements.scanTriggerButton) {
    elements.scanTriggerButton.disabled = true;
  }

  setScanStatus('Lade letzten Scan…', 'info');

  try {
    const response = await fetch(PLC_SCAN_ENDPOINT);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'Es wurde noch kein Scan durchgeführt.');
    }

    detectionData = payload;
    applyDetectionOptions(payload);
    renderScanTable(payload);
    const statusType = payload.status === 'error' ? 'error' : 'info';
    setScanStatus(
      payload.status === 'error'
        ? payload.error || 'Scan fehlgeschlagen.'
        : payload.status === 'simulation'
          ? 'Simulationsergebnis geladen.'
          : 'Letzten Scan geladen.',
      statusType,
    );
  } catch (error) {
    console.error(error);
    setScanStatus(error.message || 'Scan konnte nicht geladen werden.', 'error');
  } finally {
    if (elements.scanRefreshButton) {
      elements.scanRefreshButton.disabled = false;
    }
    if (elements.scanTriggerButton) {
      elements.scanTriggerButton.disabled = false;
    }
  }
}

async function fetchConfig() {
  setStatus('Lade Konfiguration…', 'info');
  try {
    const response = await fetch('api/config');
    if (!response.ok) {
      throw new Error('Antwort vom Server war nicht erfolgreich.');
    }
    const payload = await response.json();
    applyConfigData(payload);
    setStatus('Konfiguration geladen.', 'info');
    await fetchEntityConfig();
  } catch (error) {
    console.error(error);
    setStatus('Fehler beim Laden der Konfiguration.', 'error');
  }
}

async function saveConfig(event) {
  event.preventDefault();

  const logLevel = elements.logLevelSelect ? elements.logLevelSelect.value : undefined;
  const files = collectConfigFiles();
  const entityPayload = entityConfigData ? JSON.parse(JSON.stringify(entityConfigData)) : null;

  setStatus('Speichere Änderungen…', 'info');

  try {
    await postConfigUpdate({
      log_level: logLevel,
      config_files: files,
      test_mode: testModeEnabled,
    });

    if (entityPayload) {
      try {
        await postEntityConfigUpdate(entityPayload);
      } catch (entityError) {
        console.error(entityError);
        setStatus(entityError.message || 'Speichern der Entitätskonfiguration fehlgeschlagen.', 'error');
        return;
      }
    }

    setStatus('Änderungen gespeichert.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Speichern fehlgeschlagen.', 'error');
  }
}

async function toggleTestMode() {
  const logLevel = elements.logLevelSelect ? elements.logLevelSelect.value : undefined;
  const files = collectConfigFiles();
  const nextState = !testModeEnabled;

  setTestModeStatus(nextState ? 'Aktiviere Testmodus…' : 'Deaktiviere Testmodus…', 'info');

  if (elements.testModeToggle) {
    elements.testModeToggle.disabled = true;
  }

  try {
    await postConfigUpdate({
      log_level: logLevel,
      config_files: files,
      test_mode: nextState,
    });
    setTestModeStatus(nextState ? 'Testmodus aktiviert.' : 'Testmodus deaktiviert.', 'success');
  } catch (error) {
    console.error(error);
    setTestModeStatus(error.message || 'Änderung konnte nicht übernommen werden.', 'error');
  } finally {
    if (elements.testModeToggle) {
      elements.testModeToggle.disabled = false;
    }
  }
}

if (elements.addFileButton) {
  elements.addFileButton.addEventListener('click', () => {
    createRow();
    ensureAtLeastOneRow();
  });
}

if (elements.testModeToggle) {
  elements.testModeToggle.addEventListener('click', () => {
    toggleTestMode();
  });
}

if (elements.scanTriggerButton) {
  elements.scanTriggerButton.addEventListener('click', () => {
    triggerPlcScan();
  });
}

if (elements.scanRefreshButton) {
  elements.scanRefreshButton.addEventListener('click', () => {
    loadLastScan();
  });
}

if (elements.entityWizardDirection) {
  elements.entityWizardDirection.addEventListener('change', (event) => {
    wizardState.direction = event.target.value === 'input' ? 'input' : 'output';
    const blueprint = populateWizardCategoryOptions(wizardState.direction, null);
    if (elements.entityWizardName && elements.entityWizardName.dataset.touched !== 'true') {
      const defaultName = blueprint?.defaultName || blueprint?.label || elements.entityWizardName.value;
      elements.entityWizardName.value = defaultName;
    }
    updateEntityWizardPreview();
  });
}

if (elements.entityWizardCategory) {
  elements.entityWizardCategory.addEventListener('change', () => {
    const blueprint = getSelectedBlueprint();
    if (elements.entityWizardName && elements.entityWizardName.dataset.touched !== 'true') {
      const defaultName = blueprint?.defaultName || blueprint?.label || elements.entityWizardName.value;
      elements.entityWizardName.value = defaultName;
    }
    updateEntityWizardPreview();
  });
}

if (elements.entityWizardName) {
  elements.entityWizardName.addEventListener('input', () => {
    elements.entityWizardName.dataset.touched = 'true';
    updateEntityWizardPreview();
  });
}

const closeWizardHandler = () => {
  closeEntityWizard();
};

if (elements.entityWizardCancel) {
  elements.entityWizardCancel.addEventListener('click', closeWizardHandler);
}

if (elements.entityWizardClose) {
  elements.entityWizardClose.addEventListener('click', closeWizardHandler);
}

if (elements.entityWizardBackdrop) {
  elements.entityWizardBackdrop.addEventListener('click', closeWizardHandler);
}

if (elements.entityWizardForm) {
  elements.entityWizardForm.addEventListener('submit', (event) => {
    event.preventDefault();
    createEntityFromBlueprint();
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && elements.entityWizard?.classList.contains('is-open')) {
    closeEntityWizard();
  }
});

if (elements.addEntityButton) {
  elements.addEntityButton.addEventListener('click', () => {
    addEntity();
  });
}

if (elements.form) {
  elements.form.addEventListener('submit', saveConfig);
}

if (elements.editorTextarea) {
  elements.editorTextarea.addEventListener('input', () => {
    if (!activeFileName) {
      setEditorStatus('Keine Datei ausgewählt.', 'error');
      return;
    }

    const hasChanges = elements.editorTextarea.value !== lastLoadedContent;
    setEditorDirty(hasChanges);

    if (hasChanges) {
      setEditorStatus('Änderungen noch nicht gespeichert.', 'warning');
    } else {
      setEditorStatus('Keine lokalen Änderungen.', 'info');
    }
  });
}

if (elements.editorSaveButton) {
  elements.editorSaveButton.addEventListener('click', () => {
    saveActiveFile();
  });
}

if (elements.editorReloadButton) {
  elements.editorReloadButton.addEventListener('click', () => {
    if (!activeRow || !activeFileName) {
      setEditorStatus('Keine Datei ausgewählt.', 'error');
      return;
    }
    openEditor(activeRow, activeFileName);
  });
}

if (elements.editorExampleButton) {
  elements.editorExampleButton.addEventListener('click', () => {
    if (!editorTemplate || !elements.editorTextarea) {
      setEditorStatus('Kein Beispiel verfügbar.', 'error');
      return;
    }

    elements.editorTextarea.value = editorTemplate;
    setEditorDirty(true);
    setEditorStatus('Beispiel eingefügt – Änderungen noch nicht gespeichert.', 'warning');
  });
}

try {
  const appElement = document.querySelector('.app');
  const bodyStyles = window.getComputedStyle(document.body);
  const appStyles = appElement ? window.getComputedStyle(appElement) : null;
  console.info(
    '[config-gui] style probe',
    JSON.stringify({
      bodyBackground: bodyStyles ? bodyStyles.backgroundImage || bodyStyles.backgroundColor : null,
      bodyColor: bodyStyles ? bodyStyles.color : null,
      appBackground: appStyles ? appStyles.backgroundImage || appStyles.backgroundColor : null,
    })
  );
} catch (error) {
  console.warn('[config-gui] style probe failed', error);
}

resetEditor();

fetchConfig();
