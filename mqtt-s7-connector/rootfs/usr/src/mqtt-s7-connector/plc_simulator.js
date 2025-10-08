'use strict';

const MIN_INTERVAL = 250;
const DEFAULT_INTERVAL = 1000;

function normalizeBoolean(value) {
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
    const numeric = Number.parseFloat(normalized);
    if (!Number.isNaN(numeric)) {
      return numeric !== 0;
    }
  }
  return Boolean(value);
}

function determineKind(address) {
  if (!address) {
    return 'generic';
  }

  const normalized = String(address).toUpperCase();

  if (normalized.includes('REAL')) {
    return 'float';
  }

  if (normalized.includes('DINT') || normalized.includes('INT') || normalized.includes('WORD')) {
    return 'int';
  }

  if (normalized.includes('BYTE')) {
    return 'byte';
  }

  if (/[, ]X\d+/u.test(normalized) || normalized.includes('X')) {
    return 'bool';
  }

  return 'generic';
}

function getInitialValue(kind, offset = 0) {
  switch (kind) {
    case 'bool':
      return offset % 2 === 0;
    case 'float':
      return 20 + (offset % 10);
    case 'byte':
      return offset % 255;
    case 'int':
      return offset % 100;
    default:
      return 0;
  }
}

function coerceValue(kind, value) {
  switch (kind) {
    case 'bool':
      return normalizeBoolean(value);
    case 'float': {
      const numeric = Number.parseFloat(value);
      return Number.isFinite(numeric) ? numeric : 0;
    }
    case 'byte':
    case 'int': {
      const numeric = Number.parseInt(value, 10);
      return Number.isFinite(numeric) ? numeric : 0;
    }
    default:
      return value;
  }
}

function createSnapshot(map) {
  const snapshot = {};
  map.forEach((value, key) => {
    snapshot[key] = value;
  });
  return snapshot;
}

module.exports = function createSimulator(config = {}, initEntities, setConnectionState = () => {}) {
  const aliasToAddress = new Map();
  const aliasState = new Map();
  const aliasMeta = new Map();

  let translationCallback = null;
  let timer = null;
  let tickCounter = 0;

  const interval = Math.max(
    MIN_INTERVAL,
    Number.isFinite(config.simulation_interval)
      ? config.simulation_interval
      : Number.parseInt(config.simulation_interval, 10) || DEFAULT_INTERVAL,
  );

  function ensureAlias(alias, address) {
    const existing = aliasMeta.get(alias);
    if (existing) {
      if (address && !existing.address) {
        existing.address = address;
        existing.kind = determineKind(address);
      }
      return existing;
    }

    const resolvedAddress = address || aliasToAddress.get(alias) || alias;
    const kind = determineKind(resolvedAddress);
    const meta = {
      address: resolvedAddress,
      kind,
      offset: aliasMeta.size,
    };

    aliasMeta.set(alias, meta);
    aliasState.set(alias, getInitialValue(kind, meta.offset));
    return meta;
  }

  function registerAliases(input) {
    if (!input) {
      return;
    }

    if (Array.isArray(input)) {
      input.forEach((alias) => {
        const resolved = translationCallback ? translationCallback(alias) : undefined;
        if (resolved) {
          aliasToAddress.set(alias, resolved);
        }
        ensureAlias(alias, aliasToAddress.get(alias));
      });
      return;
    }

    if (typeof input === 'string') {
      registerAliases([input]);
      return;
    }

    if (typeof input === 'object') {
      Object.entries(input).forEach(([alias, address]) => {
        if (address) {
          aliasToAddress.set(alias, address);
        }
        ensureAlias(alias, address);
      });
    }
  }

  function advanceSimulation() {
    tickCounter += 1;

    aliasMeta.forEach((meta, alias) => {
      if (!meta) {
        return;
      }

      switch (meta.kind) {
        case 'bool': {
          const current = aliasState.get(alias) || false;
          aliasState.set(alias, !current);
          break;
        }
        case 'float': {
          const base = 22 + (meta.offset % 5);
          const swing = Math.sin((tickCounter + meta.offset) / 8) * 5;
          const value = Number.parseFloat((base + swing).toFixed(2));
          aliasState.set(alias, value);
          break;
        }
        case 'byte': {
          const current = Number(aliasState.get(alias) || 0);
          const next = (current + 5 + meta.offset) % 256;
          aliasState.set(alias, next);
          break;
        }
        case 'int': {
          const current = Number(aliasState.get(alias) || 0);
          const next = (current + 1 + (meta.offset % 3)) % 100;
          aliasState.set(alias, next);
          break;
        }
        default: {
          const current = Number(aliasState.get(alias) || 0);
          aliasState.set(alias, (current + 1) % 1000);
        }
      }
    });
  }

  function writeItemsInternal(names, values, callback) {
    try {
      const aliases = Array.isArray(names) ? names : [names];
      const payload = Array.isArray(values) ? values : [values];

      aliases.forEach((alias, index) => {
        ensureAlias(alias);
        const meta = aliasMeta.get(alias);
        const coerced = coerceValue(meta ? meta.kind : 'generic', payload[index]);
        aliasState.set(alias, coerced);
      });

      if (typeof callback === 'function') {
        setImmediate(() => callback(null));
      }
    } catch (error) {
      if (typeof callback === 'function') {
        setImmediate(() => callback(error));
      }
    }
  }

  function readAllItemsInternal(callback) {
    const snapshot = createSnapshot(aliasState);
    setImmediate(() => {
      callback(null, snapshot);
    });
  }

  const api = {
    writeItems() {
      const args = Array.from(arguments);
      const callback = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
      const names = args[0];
      const values = args[1];
      writeItemsInternal(names, values, callback);
    },
    addItems() {
      Array.from(arguments).forEach((arg) => registerAliases(arg));
    },
    setTranslationCB(cb) {
      translationCallback = cb;
      if (typeof translationCallback !== 'function') {
        translationCallback = null;
        return;
      }

      aliasMeta.forEach((meta, alias) => {
        if (!meta.address) {
          try {
            const resolved = translationCallback(alias);
            if (resolved) {
              meta.address = resolved;
              meta.kind = determineKind(resolved);
              aliasToAddress.set(alias, resolved);
              aliasState.set(alias, getInitialValue(meta.kind, meta.offset));
            }
          } catch (error) {
            // ignore translation issues in simulation mode
          }
        }
      });
    },
    readAllItems(callback) {
      readAllItemsInternal(callback);
    },
  };

  setConnectionState(true);
  setTimeout(() => {
    try {
      initEntities();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize entities in simulator mode:', error);
    }
  }, 10);

  timer = setInterval(advanceSimulation, interval);

  const teardown = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    setConnectionState(false);
  };

  if (typeof process !== 'undefined' && process.on) {
    process.on('exit', teardown);
  }

  return api;
};
