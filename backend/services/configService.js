const db = require('../config/db');

const getAllConfigs = async () => {
  return await db.query('SELECT * FROM system_config');
};

const getConfig = async () => {
  const configs = await db.query('SELECT config_key, config_value FROM system_config');
  const result = {};
  configs.forEach(config => {
    result[config.config_key] = config.config_value;
  });
  return result;
};

const updateConfig = async (configs) => {
  for (const key in configs) {
    const existing = await db.query('SELECT id FROM system_config WHERE config_key = $1', [key]);
    if (existing.length > 0) {
      await db.execute('UPDATE system_config SET config_value = $1 WHERE config_key = $2', [configs[key], key]);
    } else {
      await db.execute('INSERT INTO system_config (config_key, config_value) VALUES ($1, $2)', [key, configs[key]]);
    }
  }
};

module.exports = { getAllConfigs, getConfig, updateConfig };