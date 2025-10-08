const http = require('http');
const fs = require('fs');
const path = require('path');

let yaml;
let Nodes7;

try {
  yaml = require('/usr/src/mqtt-s7-connector/node_modules/js-yaml');
} catch (error) {
  try {
    yaml = require('js-yaml');
  } catch (fallbackError) {
    yaml = null;
  }
}

try {
  Nodes7 = require('/usr/src/mqtt-s7-connector/node_modules/nodes7');
} catch (error) {
  try {
    Nodes7 = require('nodes7');
  } catch (fallbackError) {
    Nodes7 = null;
  }
}

const CONFIG_PATH = process.env.CONFIG_GUI_FILE || '/addon_configs/mqtt-s7-connector/config.yaml';
const TEMPLATE_PATH = process.env.CONFIG_GUI_TEMPLATE || path.join(__dirname, 'config.template.yaml');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number.parseInt(process.env.CONFIG_GUI_PORT || '8099', 10);
const STORAGE_ROOT_ENV =
  typeof process.env.CONFIG_GUI_STORAGE_ROOT === 'string'
    ? process.env.CONFIG_GUI_STORAGE_ROOT.trim()
    : '';
const CONFIG_STORAGE_ROOT =
  STORAGE_ROOT_ENV.length > 0 ? path.resolve(STORAGE_ROOT_ENV) : '/config';
const FILE_API_PREFIX = '/api/files/';
const ENTITY_CONFIG_ENDPOINT = '/api/entity-config';
const PLC_SCAN_ENDPOINT = '/api/plc/scan';

const PLC_SCAN_BYTE_LIMIT = Number.isFinite(Number.parseInt(process.env.PLC_SCAN_BYTE_LIMIT, 10))
  ? Math.max(1, Number.parseInt(process.env.PLC_SCAN_BYTE_LIMIT, 10))
  : 16;
const PLC_SCAN_TIMEOUT = Number.isFinite(Number.parseInt(process.env.PLC_SCAN_TIMEOUT, 10))
  ? Math.max(2000, Number.parseInt(process.env.PLC_SCAN_TIMEOUT, 10))
  : 8000;

const ADDRESS_PATTERN = /^(?:DB\d+,[A-Z]+[0-9.,]+|[IQM][A-Z0-9.,]+)$/iu;

let lastScanResult = null;

const EXAMPLE_FILES = new Map([
  ['.yaml', '/usr/src/mqtt-s7-connector/config.example.yaml'],
  ['.yml', '/usr/src/mqtt-s7-connector/config.example.yaml'],
  ['.json', '/usr/src/mqtt-s7-connector/config.example.json'],
]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function collectRequestBody(req, callback) {
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks).toString('utf8');
      callback(null, body);
    } catch (error) {
      callback(error);
    }
  });

  req.on('error', (error) => {
    callback(error);
  });
}

function resolveConfigFileName(fileName) {
  if (typeof fileName !== 'string') {
    throw new Error('Ungültiger Dateiname.');
  }

  const normalized = fileName.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) {
    throw new Error('Ungültiger Dateiname.');
  }

  const baseDirectory = CONFIG_STORAGE_ROOT;
  const absolutePath = path.normalize(path.join(baseDirectory, normalized));
  const relative = path.relative(baseDirectory, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Pfad liegt außerhalb des Konfigurationsverzeichnisses.');
  }

  return { absolutePath, relativePath: normalized };
}

function readExampleFor(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const examplePath = EXAMPLE_FILES.get(extension);

  if (!examplePath) {
    return null;
  }

  try {
    return fs.readFileSync(examplePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

function ensureConfigFile() {
  const directory = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    let template = '';
    if (fs.existsSync(TEMPLATE_PATH)) {
      template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    } else {
      template =
        '---\noptions:\n  log_level: warning\n  test_mode: false\n  config_files:\n    - config.yaml\nschema:\n  log_level: list(trace|debug|info|notice|warning|error|fatal)\n  test_mode: bool\n  config_files:\n    - str?\n';
    }
    fs.writeFileSync(CONFIG_PATH, template, 'utf8');
  }
}

function parseConfig(content) {
  const lines = content.split(/\r?\n/);
  const options = {
    log_level: 'warning',
    config_files: [],
    test_mode: false,
  };
  const metadata = {
    name: '',
    version: '',
    slug: '',
    description: '',
  };

  let inOptions = false;
  let optionsIndent = 0;
  let inConfigFiles = false;
  let configIndent = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const trimmed = line.trim();

    if (!trimmed.startsWith('#') && trimmed.includes(':') && indent === 0) {
      const [rawKey, ...rawValueParts] = trimmed.split(':');
      const key = rawKey.trim();
      const value = rawValueParts.join(':').trim();
      const normalized = value.replace(/^['"]/, '').replace(/['"]$/, '');

      if (key in metadata) {
        metadata[key] = normalized;
      }
    }

    if (!inOptions) {
      if (trimmed.startsWith('options:')) {
        inOptions = true;
        optionsIndent = indent;
      }
      continue;
    }

    if (inConfigFiles) {
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }
      if (indent <= configIndent) {
        inConfigFiles = false;
        i -= 1; // Re-evaluate this line for other handlers
        continue;
      }
      if (trimmed.startsWith('-')) {
        const value = trimmed.replace(/^-\s*/, '').trim();
        if (value) {
          options.config_files.push(value);
        }
      }
      continue;
    }

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    if (indent <= optionsIndent && !trimmed.startsWith('-')) {
      break;
    }

    if (trimmed.startsWith('log_level:')) {
      const parts = trimmed.split(':');
      parts.shift();
      options.log_level = parts.join(':').trim();
      continue;
    }

    if (trimmed.startsWith('test_mode:')) {
      const parts = trimmed.split(':');
      parts.shift();
      options.test_mode = parseBoolean(parts.join(':'));
      continue;
    }

    if (trimmed.startsWith('config_files:')) {
      inConfigFiles = true;
      configIndent = indent;
      options.config_files = [];
    }
  }

  const schemaMatch = content.match(/log_level:\s*list\(([^)]+)\)/);
  const logLevels = schemaMatch
    ? schemaMatch[1]
        .split('|')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : ['trace', 'debug', 'info', 'notice', 'warning', 'error', 'fatal'];

  return { options, schema: { log_levels: logLevels }, metadata };
}

function serializeConfig(originalContent, newOptions) {
  const lines = originalContent.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trimStart().startsWith('options:'));
  if (startIndex === -1) {
    throw new Error('Konnte den options-Block in der config.yaml nicht finden.');
  }

  const schemaIndex = lines.findIndex((line, index) => index > startIndex && line.trimStart().startsWith('schema:'));
  const endIndex = schemaIndex === -1 ? lines.length : schemaIndex;
  const indent = lines[startIndex].match(/^(\s*)/)[0];

  const newBlock = [
    `${indent}options:`,
    `${indent}  log_level: ${newOptions.log_level}`,
    `${indent}  test_mode: ${newOptions.test_mode ? 'true' : 'false'}`,
  ];

  if (newOptions.config_files.length > 0) {
    newBlock.push(`${indent}  config_files:`);
    newOptions.config_files.forEach((file) => {
      newBlock.push(`${indent}    - ${file}`);
    });
  } else {
    newBlock.push(`${indent}  config_files: []`);
  }

  const rebuilt = [
    ...lines.slice(0, startIndex),
    ...newBlock,
    ...lines.slice(endIndex),
  ].join('\n');

  return rebuilt.endsWith('\n') ? rebuilt : `${rebuilt}\n`;
}

function readConfig() {
  ensureConfigFile();
  const content = fs.readFileSync(CONFIG_PATH, 'utf8');
  return { content, data: parseConfig(content) };
}

function getManagedConfigFiles() {
  const { data } = readConfig();
  const files = Array.isArray(data.options.config_files) ? data.options.config_files : [];

  return files
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
    .filter((entry, index, array) => array.indexOf(entry) === index);
}

function getPrimaryEntityConfigPath() {
  const files = getManagedConfigFiles();
  if (files.length === 0) {
    throw new Error('Keine Konfigurationsdatei in den Add-on-Optionen hinterlegt.');
  }

  const target = files[0];
  const resolved = resolveConfigFileName(target);
  return { absolutePath: resolved.absolutePath, relativePath: resolved.relativePath };
}

function loadEntityConfig() {
  if (!yaml) {
    throw new Error('YAML-Unterstützung ist nicht verfügbar.');
  }

  const { absolutePath, relativePath } = getPrimaryEntityConfigPath();

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Konfigurationsdatei "${relativePath}" wurde nicht gefunden.`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  let data;

  try {
    data = yaml.load(content) || {};
  } catch (error) {
    throw new Error(`Konfigurationsdatei enthält ungültiges YAML: ${error.message}`);
  }

  if (!data.integration || typeof data.integration !== 'object') {
    data.integration = { mode: 'homeassistant' };
  } else if (!data.integration.mode) {
    data.integration.mode = 'homeassistant';
  }

  let modifiedAt = null;
  try {
    const stat = fs.statSync(absolutePath);
    if (stat.isFile()) {
      modifiedAt = stat.mtime.toISOString();
    }
  } catch (error) {
    // ignore
  }

  return {
    path: absolutePath,
    relativePath,
    content,
    data,
    modified_at: modifiedAt,
  };
}

const ORDERED_ENTITY_KEYS = [
  'update_time',
  'temperature_interval',
  'mqtt_base',
  'mqtt_device_name',
  'retain_messages',
  'discovery_prefix',
  'discovery_retain',
  'integration',
  'plc',
  'mqtt',
  'entities',
];

function buildOrderedEntityConfig(data = {}) {
  const ordered = {};

  ORDERED_ENTITY_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      ordered[key] = data[key];
    }
  });

  Object.keys(data).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = data[key];
    }
  });

  return ordered;
}

function writeEntityConfigFile(nextConfig) {
  if (!yaml) {
    throw new Error('YAML-Unterstützung ist nicht verfügbar.');
  }

  const { absolutePath } = getPrimaryEntityConfigPath();
  const directory = path.dirname(absolutePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const ordered = buildOrderedEntityConfig(nextConfig || {});
  const yamlContent = yaml.dump(ordered, { lineWidth: 120, sortKeys: false });
  fs.writeFileSync(absolutePath, yamlContent, 'utf8');
  return loadEntityConfig();
}

function isAddressString(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return ADDRESS_PATTERN.test(trimmed);
}

function extractConfiguredAddresses(entities = []) {
  const results = [];

  entities.forEach((entity, entityIndex) => {
    if (!entity || typeof entity !== 'object') {
      return;
    }

    const entityName = entity.name || `Entität ${entityIndex + 1}`;
    const stack = Object.entries(entity).map(([key, value]) => ({ path: [key], value }));

    while (stack.length > 0) {
      const current = stack.shift();
      if (!current) {
        continue;
      }

      const { path: currentPath, value } = current;
      if (!currentPath || currentPath.length === 0) {
        continue;
      }

      if (currentPath[0] === 'type') {
        continue;
      }

      if (isAddressString(value)) {
        results.push({
          entity_index: entityIndex,
          entity: entityName,
          path: currentPath.join('.'),
          address: String(value).trim(),
        });
        continue;
      }

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item, idx) => {
            if (isAddressString(item)) {
              results.push({
                entity_index: entityIndex,
                entity: entityName,
                path: `${currentPath.join('.')}[${idx}]`,
                address: String(item).trim(),
              });
            } else if (item && typeof item === 'object') {
              stack.push({ path: currentPath.concat(idx), value: item });
            }
          });
        } else {
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            stack.push({ path: currentPath.concat(nestedKey), value: nestedValue });
          });
        }
      }
    }
  });

  return results;
}

function buildConfiguredAddressSection(entities = []) {
  const entries = extractConfiguredAddresses(entities);
  const seen = new Set();
  const addresses = [];

  entries.forEach((entry) => {
    if (!entry || !entry.address) {
      return;
    }
    if (seen.has(entry.address)) {
      return;
    }
    seen.add(entry.address);
    addresses.push(entry);
  });

  return {
    id: 'configured',
    label: 'In der Konfiguration verwendete Adressen',
    type: 'configured',
    addresses,
  };
}

function normalizeByteValue(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return value & 0xff;
  }

  if (Buffer.isBuffer && Buffer.isBuffer(value)) {
    return value.length > 0 ? value[0] : 0;
  }

  if (Array.isArray(value) && value.length > 0) {
    return normalizeByteValue(value[0]);
  }

  if (typeof value === 'object' && value && typeof value.value !== 'undefined') {
    return normalizeByteValue(value.value);
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed & 0xff : 0;
}

function expandBitAddresses(area, byteEntries) {
  const list = [];
  const prefix = area === 'I' ? 'IB' : area === 'Q' ? 'QB' : 'MB';

  byteEntries.forEach((entry) => {
    if (!entry || typeof entry.index !== 'number') {
      return;
    }

    const numeric = normalizeByteValue(entry.value);
    for (let bit = 0; bit < 8; bit += 1) {
      list.push({
        address: `${area}${entry.index}.${bit}`,
        byte: `${prefix}${entry.index}`,
        bit,
        value: (numeric & (1 << bit)) !== 0,
      });
    }
  });

  return list;
}

function buildSectionsFromValues(values = {}, entityConfig = {}) {
  const limit = PLC_SCAN_BYTE_LIMIT;
  const inputBytes = [];
  const outputBytes = [];
  const markerBytes = [];

  for (let index = 0; index < limit; index += 1) {
    inputBytes.push({ index, value: values[`IB${index}`] });
    outputBytes.push({ index, value: values[`QB${index}`] });
    markerBytes.push({ index, value: values[`MB${index}`] });
  }

  const sections = [];

  const inputBits = expandBitAddresses('I', inputBytes);
  if (inputBits.length > 0) {
    sections.push({
      id: 'digital_inputs',
      label: 'Digitale Eingänge',
      type: 'bit',
      addresses: inputBits,
    });
  }

  const outputBits = expandBitAddresses('Q', outputBytes);
  if (outputBits.length > 0) {
    sections.push({
      id: 'digital_outputs',
      label: 'Digitale Ausgänge',
      type: 'bit',
      addresses: outputBits,
    });
  }

  const markerBits = expandBitAddresses('M', markerBytes);
  if (markerBits.length > 0) {
    sections.push({
      id: 'memory_flags',
      label: 'Merker (M-Bereich)',
      type: 'bit',
      addresses: markerBits,
    });
  }

  const configuredSection = buildConfiguredAddressSection(entityConfig.entities || []);
  if (configuredSection.addresses.length > 0) {
    sections.push(configuredSection);
  }

  const summary = {
    digital_inputs: inputBits.length,
    digital_outputs: outputBits.length,
    markers: markerBits.length,
    configured: configuredSection.addresses.length,
  };

  return { sections, summary };
}

function buildAddressOptions(sections = []) {
  const groups = [];
  const flat = [];
  const seen = new Set();

  sections.forEach((section) => {
    if (!section || !Array.isArray(section.addresses) || section.addresses.length === 0) {
      return;
    }

    const groupSeen = new Set();
    const options = [];

    section.addresses.forEach((entry) => {
      if (!entry || !entry.address) {
        return;
      }
      const address = String(entry.address);
      let label = entry.label || address;
      if (label === address && entry.byte && typeof entry.bit === 'number') {
        label = `${address} (${entry.byte} Bit ${entry.bit})`;
      }
      if (entry.entity) {
        label = `${label} – ${entry.entity}`;
      }
      if (!groupSeen.has(address)) {
        groupSeen.add(address);
        options.push({ value: address, label });
      }
      if (!seen.has(address)) {
        seen.add(address);
        flat.push(address);
      }
    });

    if (options.length > 0) {
      groups.push({ id: section.id, label: section.label, options });
    }
  });

  return { groups, flat };
}

function normalizeTsapId(value) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = trimmed.toLowerCase().startsWith('0x')
      ? Number.parseInt(trimmed, 16)
      : Number.parseInt(trimmed, 10);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return undefined;
}

function dropConnectionSafe(client) {
  if (!client || typeof client.dropConnection !== 'function') {
    return;
  }

  try {
    client.dropConnection(() => {});
  } catch (error) {
    // ignore
  }
}

function performLivePlcScan(plcConfig = {}, entityConfig = {}) {
  return new Promise((resolve, reject) => {
    if (!Nodes7) {
      reject(new Error('PLC-Treiber ist nicht verfügbar.'));
      return;
    }

    if (!plcConfig || !plcConfig.host) {
      reject(new Error('PLC-Host ist nicht konfiguriert.'));
      return;
    }

    const client = new Nodes7({ silent: !plcConfig.debug });
    const connectionOptions = {
      host: plcConfig.host,
      port: Number.isFinite(Number.parseInt(plcConfig.port, 10))
        ? Number.parseInt(plcConfig.port, 10)
        : 102,
      rack: Number.isFinite(Number.parseInt(plcConfig.rack, 10))
        ? Number.parseInt(plcConfig.rack, 10)
        : 0,
      slot: Number.isFinite(Number.parseInt(plcConfig.slot, 10))
        ? Number.parseInt(plcConfig.slot, 10)
        : 2,
      timeout: PLC_SCAN_TIMEOUT,
    };

    const localTsap = normalizeTsapId(plcConfig.local_tsap_id);
    if (localTsap !== undefined) {
      connectionOptions.localTSAP = localTsap;
    }

    const remoteTsap = normalizeTsapId(plcConfig.remote_tsap_id);
    if (remoteTsap !== undefined) {
      connectionOptions.remoteTSAP = remoteTsap;
    }

    let finished = false;
    const finalize = (error, payload) => {
      if (finished) {
        return;
      }
      finished = true;
      dropConnectionSafe(client);
      if (error) {
        reject(error);
      } else {
        resolve(payload);
      }
    };

    try {
      client.initiateConnection(connectionOptions, (err) => {
        if (err) {
          finalize(new Error(`PLC-Verbindung fehlgeschlagen: ${err.message || err}`));
          return;
        }

        try {
          client.setTranslationCB((tag) => tag);
          const items = [];
          for (let i = 0; i < PLC_SCAN_BYTE_LIMIT; i += 1) {
            items.push(`IB${i}`);
            items.push(`QB${i}`);
            items.push(`MB${i}`);
          }
          client.addItems(items);
        } catch (error) {
          finalize(new Error(`Konnte Scan-Anfrage nicht vorbereiten: ${error.message}`));
          return;
        }

        client.readAllItems((anythingBad, values) => {
          if (anythingBad) {
            finalize(new Error('Lesefehler während der Adressermittlung.'));
            return;
          }

          try {
            const { sections, summary } = buildSectionsFromValues(values, entityConfig);
            const options = buildAddressOptions(sections);
            finalize(null, {
              generated_at: new Date().toISOString(),
              status: 'connected',
              source: 'live',
              sections,
              options,
              summary,
            });
          } catch (error) {
            finalize(new Error(`Auswertung der Scan-Daten fehlgeschlagen: ${error.message}`));
          }
        });
      });
    } catch (error) {
      finalize(new Error(`Scan konnte nicht gestartet werden: ${error.message}`));
    }
  });
}

function buildSimulationScan(entityConfig = {}) {
  const limit = Math.min(PLC_SCAN_BYTE_LIMIT, 8);
  const inputBytes = [];
  const outputBytes = [];
  const markerBytes = [];

  for (let index = 0; index < limit; index += 1) {
    const base = index % 2 === 0 ? 0b10101010 : 0b01010101;
    inputBytes.push({ index, value: base });
    outputBytes.push({ index, value: base ^ 0xff });
    markerBytes.push({ index, value: (base << 1) & 0xff });
  }

  const sections = [];

  const inputBits = expandBitAddresses('I', inputBytes);
  if (inputBits.length > 0) {
    sections.push({
      id: 'digital_inputs',
      label: 'Digitale Eingänge (Simulation)',
      type: 'bit',
      addresses: inputBits,
    });
  }

  const outputBits = expandBitAddresses('Q', outputBytes);
  if (outputBits.length > 0) {
    sections.push({
      id: 'digital_outputs',
      label: 'Digitale Ausgänge (Simulation)',
      type: 'bit',
      addresses: outputBits,
    });
  }

  const markerBits = expandBitAddresses('M', markerBytes);
  if (markerBits.length > 0) {
    sections.push({
      id: 'memory_flags',
      label: 'Merker (Simulation)',
      type: 'bit',
      addresses: markerBits,
    });
  }

  const configuredSection = buildConfiguredAddressSection(entityConfig.entities || []);
  if (configuredSection.addresses.length > 0) {
    sections.push(configuredSection);
  }

  const options = buildAddressOptions(sections);

  return {
    generated_at: new Date().toISOString(),
    status: 'simulation',
    source: 'simulation',
    sections,
    options,
    summary: {
      digital_inputs: inputBits.length,
      digital_outputs: outputBits.length,
      markers: markerBits.length,
      configured: configuredSection.addresses.length,
    },
  };
}

async function performPlcScan(plcConfig = {}, entityConfig = {}) {
  if (plcConfig && (plcConfig.test_mode === true || plcConfig.test_mode === 'true')) {
    return buildSimulationScan(entityConfig);
  }

  return performLivePlcScan(plcConfig, entityConfig);
}

function getConfigFileDetail(file) {
  try {
    const { absolutePath } = resolveConfigFileName(file);
    const detail = {
      name: file,
      path: absolutePath,
      exists: false,
      size: null,
      modified_at: null,
    };

    try {
      const stat = fs.statSync(absolutePath);
      if (stat.isFile()) {
        detail.exists = true;
        detail.size = stat.size;
        detail.modified_at = stat.mtime.toISOString();
      }
    } catch (error) {
      // Datei existiert nicht – ignoriere Fehler
    }

    return detail;
  } catch (error) {
    return {
      name: file,
      path: null,
      exists: false,
      size: null,
      modified_at: null,
      error: error.message,
    };
  }
}

function getConfigFileDetails(fileNames) {
  return fileNames.map((file) => getConfigFileDetail(file));
}

function buildConfigResponse() {
  const { data } = readConfig();
  const optionsDirectory = path.dirname(CONFIG_PATH);
  const storageRoot = CONFIG_STORAGE_ROOT;

  const configFiles = Array.isArray(data.options.config_files)
    ? data.options.config_files
    : [];

  let primaryConfig = null;
  if (configFiles.length > 0) {
    try {
      primaryConfig = resolveConfigFileName(configFiles[0]);
    } catch (error) {
      primaryConfig = null;
    }
  }

  let configExists = false;
  let lastModified = null;
  if (primaryConfig) {
    try {
      const stat = fs.statSync(primaryConfig.absolutePath);
      if (stat.isFile()) {
        configExists = true;
        lastModified = stat.mtime.toISOString();
      }
    } catch (error) {
      // Datei existiert nicht – ignoriere
    }
  }

  let optionsLastModified = null;
  try {
    const stat = fs.statSync(CONFIG_PATH);
    if (stat.isFile()) {
      optionsLastModified = stat.mtime.toISOString();
    }
  } catch (error) {
    // options-Datei existiert (noch) nicht – ignoriere
  }

  return {
    log_level: data.options.log_level,
    log_levels: data.schema.log_levels,
    config_files: configFiles,
    test_mode: Boolean(data.options.test_mode),
    metadata: data.metadata,
    system: {
      config_path: primaryConfig ? primaryConfig.absolutePath : null,
      config_relative_path: primaryConfig ? primaryConfig.relativePath : null,
      config_directory: storageRoot,
      storage_root: storageRoot,
      options_path: CONFIG_PATH,
      options_directory: optionsDirectory,
      options_last_modified: optionsLastModified,
      config_exists: configExists,
      last_modified: lastModified || optionsLastModified,
      total_files: configFiles.length,
    },
    config_file_details: getConfigFileDetails(configFiles),
  };
}

function handleGetEntityConfig(res) {
  try {
    const entityConfig = loadEntityConfig();
    sendJson(res, 200, {
      path: entityConfig.path,
      relative_path: entityConfig.relativePath,
      modified_at: entityConfig.modified_at,
      config: entityConfig.data,
      last_scan: lastScanResult,
    });
  } catch (error) {
    sendJson(res, 404, { message: error.message });
  }
}

function handleUpdateEntityConfig(req, res) {
  collectRequestBody(req, (err, rawBody) => {
    if (err) {
      sendJson(res, 500, { message: err.message });
      return;
    }

    try {
      const payload = JSON.parse(rawBody || '{}');
      if (!payload || typeof payload.config !== 'object' || payload.config === null) {
        sendJson(res, 400, { message: 'Ungültige Konfiguration übermittelt.' });
        return;
      }

      const result = writeEntityConfigFile(payload.config);
      sendJson(res, 200, {
        message: 'Konfiguration gespeichert.',
        path: result.path,
        relative_path: result.relativePath,
        modified_at: result.modified_at,
        config: result.data,
      });
    } catch (error) {
      sendJson(res, 400, { message: error.message });
    }
  });
}

function handleGetPlcScan(res) {
  if (lastScanResult) {
    sendJson(res, 200, lastScanResult);
    return;
  }

  sendJson(res, 404, { message: 'Es wurde noch kein Scan durchgeführt.' });
}

async function handleTriggerPlcScan(res) {
  let entityConfig;

  try {
    entityConfig = loadEntityConfig();
  } catch (error) {
    sendJson(res, 404, { message: error.message });
    return;
  }

  try {
    const plcConfig = (entityConfig.data && entityConfig.data.plc) || {};
    const scan = await performPlcScan(plcConfig, entityConfig.data || {});
    lastScanResult = scan;
    sendJson(res, 200, scan);
  } catch (error) {
    const fallbackSections = [];
    const configuredSection = buildConfiguredAddressSection(
      (entityConfig.data && entityConfig.data.entities) || [],
    );
    if (configuredSection.addresses.length > 0) {
      fallbackSections.push(configuredSection);
    }

    const options = buildAddressOptions(fallbackSections);
    const payload = {
      generated_at: new Date().toISOString(),
      status: 'error',
      source: 'live',
      error: error.message,
      sections: fallbackSections,
      options,
    };

    lastScanResult = payload;
    sendJson(res, 500, payload);
  }
}

function writeConfig(newOptions) {
  const { content } = readConfig();
  const nextContent = serializeConfig(content, newOptions);
  fs.writeFileSync(CONFIG_PATH, nextContent, 'utf8');
}

function handleGetConfig(res) {
  try {
    sendJson(res, 200, buildConfigResponse());
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
}

function handleUpdateConfig(req, res) {
  collectRequestBody(req, (err, rawBody) => {
    if (err) {
      sendJson(res, 500, { message: err.message });
      return;
    }

    try {
      const body = JSON.parse(rawBody || '{}');
      const { log_level: logLevel, config_files: configFiles, test_mode: testModeRaw } = body;
      const { data } = readConfig();
      const allowedLogLevels = data.schema.log_levels;

      if (!allowedLogLevels.includes(logLevel)) {
        sendJson(res, 400, { message: 'Ungültiger Log-Level.' });
        return;
      }

      const nextTestMode = typeof testModeRaw === 'boolean' ? testModeRaw : Boolean(data.options.test_mode);

      const sanitizedFiles = Array.isArray(configFiles)
        ? configFiles
            .map((entry) => String(entry).trim())
            .filter((entry) => entry.length > 0)
            .filter((entry, index, array) => array.indexOf(entry) === index)
        : data.options.config_files;

      writeConfig({
        log_level: logLevel,
        config_files: sanitizedFiles,
        test_mode: nextTestMode,
      });

      sendJson(res, 200, buildConfigResponse());
    } catch (error) {
      sendJson(res, 500, { message: error.message });
    }
  });
}

function handleGetConfigFile(res, fileName) {
  try {
    const { absolutePath, relativePath } = resolveConfigFileName(fileName);
    let content = '';
    let stat = null;

    try {
      stat = fs.statSync(absolutePath);
      if (stat.isFile()) {
        content = fs.readFileSync(absolutePath, 'utf8');
      } else {
        stat = null;
      }
    } catch (error) {
      // Datei existiert nicht
    }

    const detail = {
      name: relativePath,
      path: absolutePath,
      exists: Boolean(stat),
      size: stat ? stat.size : null,
      modified_at: stat ? stat.mtime.toISOString() : null,
      template: readExampleFor(relativePath),
      content,
    };

    sendJson(res, 200, detail);
  } catch (error) {
    sendJson(res, 400, { message: error.message });
  }
}

function handleSaveConfigFile(req, res, fileName) {
  collectRequestBody(req, (err, rawBody) => {
    if (err) {
      sendJson(res, 500, { message: err.message });
      return;
    }

    try {
      const payload = JSON.parse(rawBody || '{}');
      if (typeof payload.content !== 'string') {
        sendJson(res, 400, { message: 'Es wurde kein gültiger Inhalt übermittelt.' });
        return;
      }

      const { absolutePath, relativePath } = resolveConfigFileName(fileName);
      const directory = path.dirname(absolutePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      fs.writeFileSync(absolutePath, payload.content, 'utf8');

      const detail = getConfigFileDetail(relativePath);
      sendJson(res, 200, {
        message: 'Datei gespeichert.',
        detail,
      });
    } catch (error) {
      sendJson(res, 400, { message: error.message });
    }
  });
}

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      console.warn('[config-gui] static asset missing', JSON.stringify({ filePath }));
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Nicht gefunden');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    }[extension] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);

    console.debug('[config-gui] static asset served', JSON.stringify({ filePath, contentType }));
  });
}

const server = http.createServer((req, res) => {
  try {
    const hostHeader = typeof req.headers.host === 'string' && req.headers.host.trim().length > 0
      ? req.headers.host.trim()
      : null;
    const urlBase = hostHeader ? `http://${hostHeader}` : 'http://localhost';
    const rawUrl = typeof req.url === 'string' ? req.url.trim() : '';
    const normalizedUrl = rawUrl.length > 0 ? rawUrl : '/';

    let sanitizedUrl = normalizedUrl;
    if (sanitizedUrl.startsWith('//')) {
      sanitizedUrl = `/${sanitizedUrl.replace(/^\/+/, '')}`;
    }

    console.debug(
      '[config-gui] incoming request',
      JSON.stringify({ method: req.method, rawUrl, normalizedUrl, host: hostHeader })
    );

    let requestUrl;
    try {
      requestUrl = new URL(sanitizedUrl, urlBase);
    } catch (parseError) {
      console.warn(`Ingress request URL parsing failed for '${normalizedUrl}': ${parseError.message}`);
      requestUrl = new URL('/', urlBase);
    }
    const ingressSegments = requestUrl.pathname.split('/').filter(Boolean);

    if (
      req.method === 'GET' &&
      ingressSegments[0] === 'api' &&
      ingressSegments[1] === 'hassio_ingress' &&
      ingressSegments.length === 3 &&
      !requestUrl.pathname.endsWith('/')
    ) {
      const redirectTarget = `${requestUrl.pathname}/${requestUrl.search || ''}`;
      res.writeHead(302, { Location: redirectTarget });
      res.end();
      return;
    }

    let pathname = requestUrl.pathname;

    const rawSegments = pathname.split('/').filter(Boolean);
    if (rawSegments[0] === 'api' && rawSegments[1] === 'hassio_ingress' && rawSegments.length >= 3) {
      pathname = `/${rawSegments.slice(3).join('/')}` || '/';
    }

    if (req.method === 'GET' && pathname === '/api/config') {
      handleGetConfig(res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/config') {
      handleUpdateConfig(req, res);
      return;
    }

    if (req.method === 'GET' && pathname === ENTITY_CONFIG_ENDPOINT) {
      handleGetEntityConfig(res);
      return;
    }

    if (req.method === 'POST' && pathname === ENTITY_CONFIG_ENDPOINT) {
      handleUpdateEntityConfig(req, res);
      return;
    }

    if (req.method === 'GET' && pathname === PLC_SCAN_ENDPOINT) {
      handleGetPlcScan(res);
      return;
    }

    if (req.method === 'POST' && pathname === PLC_SCAN_ENDPOINT) {
      handleTriggerPlcScan(res);
      return;
    }

    if (pathname.startsWith(FILE_API_PREFIX)) {
      const fileName = decodeURIComponent(pathname.slice(FILE_API_PREFIX.length));

      if (req.method === 'GET') {
        handleGetConfigFile(res, fileName);
        return;
      }

      if (req.method === 'PUT') {
        handleSaveConfigFile(req, res, fileName);
        return;
      }

      sendJson(res, 405, { message: 'Methode nicht erlaubt' });
      return;
    }

    if (req.method === 'GET') {
      let requestedPath = pathname;
      if (requestedPath.endsWith('/')) {
        requestedPath = `${requestedPath}index.html`;
      }

      const normalizedPath = requestedPath.replace(/^\/+/, '');
      const targetPath = path.normalize(path.join(PUBLIC_DIR, normalizedPath));
      const relative = path.relative(PUBLIC_DIR, targetPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Zugriff verweigert');
        return;
      }

      console.debug(
        '[config-gui] static asset request',
        JSON.stringify({ pathname, requestedPath, normalizedPath, targetPath })
      );

      serveStaticFile(targetPath, res);
      return;
    }

    sendJson(res, 405, { message: 'Methode nicht erlaubt' });
  } catch (error) {
    sendJson(res, 500, { message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`MQTT S7 Config GUI läuft auf Port ${PORT}`);
});
