// noinspection JSUnresolvedReference

const commander = require('commander');
const fs = require('fs');
const yaml = require('yaml');

const sf = require('./service_functions.js');

let cachedConfig = null;
let commanderParsed = false;

const normalizeEntities = (configObject) => {
        if (!configObject || typeof configObject !== 'object') {
                return configObject;
        }

        if (!configObject.entities && Array.isArray(configObject.devices)) {
                configObject.entities = configObject.devices;
                delete configObject.devices;
        }

        return configObject;
};

const readConfig = () => {
        const options = commander.opts();

        const logLevel = options.loglevel !== undefined ? Number(options.loglevel) : 4;
        global.log_level = Number.isFinite(logLevel) ? logLevel : 4;
        console.log('## INIT   ## log level is set to: ' + global.log_level);

        global.addon_version = options.addonversion !== undefined ? options.addonversion : 'unset';

        if (options.config !== undefined) {
                const extension = options.config.slice(-4).toLowerCase();

                if (extension === 'yaml' || extension === '.yml') {
                        if (fs.existsSync(options.config)) {
                                return normalizeEntities(yaml.parse(fs.readFileSync(options.config, 'utf8'), { merge: true }));
                        }
                        sf.error("Config file '" + options.config + "' not found");
                } else {
                        // eslint-disable-next-line global-require, import/no-dynamic-require
                        return normalizeEntities(require(options.config));
                }
        }

        if (fs.existsSync('./config.json')) {
                // eslint-disable-next-line global-require
                return normalizeEntities(require('./config'));
        }
        if (fs.existsSync('./config.yaml')) {
                return normalizeEntities(yaml.parse(fs.readFileSync('./config.yaml', 'utf8'), { merge: true }));
        }
        if (fs.existsSync('./config.yml')) {
                return normalizeEntities(yaml.parse(fs.readFileSync('./config.yml', 'utf8'), { merge: true }));
        }

        sf.error('No config file found...');
        return null;
};

const config = function config() {
        if (cachedConfig) {
                return cachedConfig;
        }

        if (!commanderParsed) {
                commander
                        .name('mqtt-s7-connector')
                        .option('-c, --config <value>', 'Overwrite the default config file location. e.g. /etc/mqtt-s7-connector/config.json')
                        .option('-v, --addonversion <value>', 'Set the version for the "origin" section of the discovery topic')
                        .option('-l, --loglevel <value>', 'Sets the log level, Default=4 >>> 0: Trace, 1: Debug, 2: Info, 3: Notice, 4: Warning, 5: Error, 6: Fatal')
                        .parse(process.argv);
                commanderParsed = true;
        }

        cachedConfig = readConfig();
        return cachedConfig;
};

module.exports = {
        config,
};
