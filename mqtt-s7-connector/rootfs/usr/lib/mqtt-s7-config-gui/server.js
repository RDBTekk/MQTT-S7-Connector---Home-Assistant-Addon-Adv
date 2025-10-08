const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.CONFIG_GUI_FILE || '/addon_configs/mqtt-s7-connector/config.yaml';
const TEMPLATE_PATH = process.env.CONFIG_GUI_TEMPLATE || path.join(__dirname, 'config.template.yaml');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number.parseInt(process.env.CONFIG_GUI_PORT || '8099', 10);

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
      template = '---\noptions:\n  log_level: warning\n  config_files:\n    - config.yaml\nschema:\n  log_level: list(trace|debug|info|notice|warning|error|fatal)\n  config_files:\n    - str?\n';
    }
    fs.writeFileSync(CONFIG_PATH, template, 'utf8');
  }
}

function parseConfig(content) {
  const lines = content.split(/\r?\n/);
  const options = {
    log_level: 'warning',
    config_files: [],
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

function getConfigFileDetails(fileNames) {
  const baseDir = path.dirname(CONFIG_PATH);

  return fileNames.map((file) => {
    const absolutePath = path.join(baseDir, file);
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
  });
}

function buildConfigResponse() {
  const { data } = readConfig();
  const configDir = path.dirname(CONFIG_PATH);

  let configExists = false;
  let lastModified = null;

  try {
    const stat = fs.statSync(CONFIG_PATH);
    if (stat.isFile()) {
      configExists = true;
      lastModified = stat.mtime.toISOString();
    }
  } catch (error) {
    // Datei existiert (noch) nicht – ignoriere
  }

  const configFiles = Array.isArray(data.options.config_files)
    ? data.options.config_files
    : [];

  return {
    log_level: data.options.log_level,
    log_levels: data.schema.log_levels,
    config_files: configFiles,
    metadata: data.metadata,
    system: {
      config_path: CONFIG_PATH,
      config_directory: configDir,
      config_exists: configExists,
      last_modified: lastModified,
      total_files: configFiles.length,
    },
    config_file_details: getConfigFileDetails(configFiles),
  };
}

function writeConfig(newOptions) {
  const { content } = readConfig();
  const nextContent = serializeConfig(content, newOptions);
  fs.writeFileSync(CONFIG_PATH, nextContent, 'utf8');
}

function handleGetConfig(res) {
  try {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildConfigResponse()));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: error.message }));
  }
}

function handleUpdateConfig(req, res) {
  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });
  req.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const { log_level: logLevel, config_files: configFiles } = body;
      const { data } = readConfig();
      const allowedLogLevels = data.schema.log_levels;

      if (!allowedLogLevels.includes(logLevel)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Ungültiger Log-Level.' }));
        return;
      }

      const sanitizedFiles = Array.isArray(configFiles)
        ? configFiles
            .map((entry) => String(entry).trim())
            .filter((entry) => entry.length > 0)
            .filter((entry, index, array) => array.indexOf(entry) === index)
        : data.options.config_files;

      writeConfig({
        log_level: logLevel,
        config_files: sanitizedFiles,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildConfigResponse()));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: error.message }));
    }
  });
}

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
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
  });
}

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;

    if (req.method === 'GET' && pathname === '/api/config') {
      handleGetConfig(res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/config') {
      handleUpdateConfig(req, res);
      return;
    }

    if (req.method === 'GET') {
      let requestedPath = pathname;
      if (requestedPath.endsWith('/')) {
        requestedPath = `${requestedPath}index.html`;
      }

      const targetPath = path.normalize(path.join(PUBLIC_DIR, requestedPath));
      const relative = path.relative(PUBLIC_DIR, targetPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Zugriff verweigert');
        return;
      }

      serveStaticFile(targetPath, res);
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Methode nicht erlaubt' }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`MQTT S7 Config GUI läuft auf Port ${PORT}`);
});
