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
};

const rowDetails = new WeakMap();

function setStatus(message, type = 'info') {
  if (!elements.statusField) return;
  elements.statusField.textContent = message;
  elements.statusField.dataset.type = type;
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
    elements.configPath.textContent = system.config_path || '–';
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

function applyDetailToRow(row, detail = {}) {
  const statusElement = row.querySelector('.js-config-row-status');
  const modifiedElement = row.querySelector('.js-config-modified');
  const currentDetail = {
    name: detail.name || row.dataset.originalName || '',
    exists: Boolean(detail.exists),
    modified_at: detail.modified_at || null,
  };
  rowDetails.set(row, currentDetail);

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

  const value = detail?.name || '';
  if (row) {
    row.dataset.originalName = value;
  }

  if (input) {
    input.value = value;
    input.addEventListener('input', (event) => {
      markRowDirty(row, event.target.value.trim());
    });
  }

  if (removeButton) {
    removeButton.addEventListener('click', () => {
      if (row) {
        row.remove();
        ensureAtLeastOneRow();
      }
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

function applyConfigData(payload) {
  populateLogLevels(payload.log_levels || [], payload.log_level);
  populateConfigFiles(payload.config_files || [], payload.config_file_details || []);
  updateMetadata(payload.metadata || {}, payload.system || {});
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
  } catch (error) {
    console.error(error);
    setStatus('Fehler beim Laden der Konfiguration.', 'error');
  }
}

async function saveConfig(event) {
  event.preventDefault();

  const logLevel = elements.logLevelSelect ? elements.logLevelSelect.value : undefined;
  const files = collectConfigFiles();

  setStatus('Speichere Änderungen…', 'info');

  try {
    const response = await fetch('api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        log_level: logLevel,
        config_files: files,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: 'Unbekannter Fehler.' }));
      throw new Error(payload.message);
    }

    const payload = await response.json();
    applyConfigData(payload);
    setStatus('Änderungen gespeichert.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Speichern fehlgeschlagen.', 'error');
  }
}

if (elements.addFileButton) {
  elements.addFileButton.addEventListener('click', () => {
    createRow();
    ensureAtLeastOneRow();
  });
}

if (elements.form) {
  elements.form.addEventListener('submit', saveConfig);
}

fetchConfig();
