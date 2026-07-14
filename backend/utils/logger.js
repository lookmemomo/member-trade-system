const db = require('../config/db');

const logAction = async (userId, action, module, description, ipAddress) => {
  try {
    await db.execute(
      'INSERT INTO system_logs (user_id, action, module, description, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, module, description, ipAddress]
    );
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
};

module.exports = { logAction };