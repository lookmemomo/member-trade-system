const { getConfig, setConfig, getAllConfigs } = require('../services/configService');

const getConfigHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getConfig(key);
    res.json({ code: 200, message: '获取成功', data: { key, value } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const setConfigHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await setConfig(key, value);
    res.json({ code: 200, message: '设置成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const getAllConfigsHandler = async (req, res) => {
  try {
    const configs = await getAllConfigs();
    res.json({ code: 200, message: '获取成功', data: configs });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

module.exports = { getConfigHandler, setConfigHandler, getAllConfigsHandler };