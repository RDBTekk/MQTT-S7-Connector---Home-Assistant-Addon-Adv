const Nodes7 = require('nodes7');
const fastq = require('fastq');

const createSimulator = require('./plc_simulator');

const RETRY_DELAY_DEFAULT = 10000;

let connected = false;
let reconnectTimer = null;

const isConnected = function () {
  return connected;
};

function scheduleReconnect(connect, delay) {
  const retryDelay = Number.isFinite(delay) && delay > 0 ? delay : RETRY_DELAY_DEFAULT;

  if (reconnectTimer) {
    return;
  }

  console.log(`Retrying PLC connection in ${Math.round(retryDelay / 1000)}s…`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, retryDelay);
}

function parseTsap(value, label) {
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

    const normalized = trimmed.toLowerCase().startsWith('0x')
      ? Number.parseInt(trimmed, 16)
      : Number.parseInt(trimmed, 10);

    if (Number.isFinite(normalized) && normalized >= 0) {
      return normalized;
    }
  }

  console.warn(`Ignoring invalid ${label} TSAP value: ${value}`);
  return undefined;
}

const setup = function (config = {}, initEntities) {
  const forceSimulation =
    process.env.S7_TEST_MODE === '1' || process.env.S7_TEST_MODE === 'true';
  const useSimulation = Boolean(config && config.test_mode) || forceSimulation;

  if (useSimulation) {
    console.log('Test mode enabled – starting integrated S7-1200 simulator.');
    const simulator = createSimulator(
      config,
      initEntities,
      (state) => {
        connected = state;
      },
    );

    connected = true;
    reconnectTimer = null;

    return simulator;
  }

  // create plc Object
  const plc = new Nodes7({
    silent: !config.debug,
  });

  const retryDelay = Number.isFinite(config.retry_delay)
    ? Math.max(1000, config.retry_delay)
    : RETRY_DELAY_DEFAULT;

  const writeQueue = fastq(
    plc,
    function (args, callback) {
      const queueCallback = callback;
      const appCallback = args[2];

      callback = function (error) {
        queueCallback(error, null);
        appCallback(error);
      };

      args[2] = callback;

      plc.writeItems.apply(plc, args);
    },
    1,
  );

  writeQueue.pause();

  const connect = () => {
    console.log('Trying to establish PLC connection…');
    const connectionOptions = {
      port: config.port,
      host: config.host,
      rack: config.rack,
      slot: config.slot,
    };

    const localTsap = parseTsap(config.local_tsap_id, 'local');
    if (localTsap !== undefined) {
      connectionOptions.localTSAP = localTsap;
    }

    const remoteTsap = parseTsap(config.remote_tsap_id, 'remote');
    if (remoteTsap !== undefined) {
      connectionOptions.remoteTSAP = remoteTsap;
    }

    plc.initiateConnection(
      connectionOptions,
      function (err) {
        if (err !== undefined) {
          connected = false;
          console.log('We have an error. Maybe the PLC is not reachable.');
          console.log(err);
          scheduleReconnect(connect, retryDelay);
          return;
        }

        console.log('PLC Connected');
        connected = true;

        writeQueue.resume();

        initEntities();
      },
    );
  };

  connect();

  return {
    writeItems: function () {
      writeQueue.push(arguments);
    },
    addItems: function () {
      plc.addItems.apply(plc, arguments);
    },
    setTranslationCB: function () {
      plc.setTranslationCB.apply(plc, arguments);
    },
    readAllItems: function () {
      plc.readAllItems.apply(plc, arguments);
    },
  };
};

module.exports = {
  setup,
  isConnected,
};

