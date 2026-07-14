const db = require('../config/db');

const recordPointsLog = async (userId, changeType, amount, balanceBefore, balanceAfter, frozenBefore, frozenAfter, tradeId, description) => {
  try {
    await db.execute(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, related_trade_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [userId, changeType, amount, balanceBefore, balanceAfter, frozenBefore, frozenAfter, tradeId, description]
    );
  } catch (error) {
    console.error('记录积分流水失败:', error);
  }
};

module.exports = { recordPointsLog };