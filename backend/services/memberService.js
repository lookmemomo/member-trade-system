const db = require('../config/db');
const { logAction } = require('../utils/logger');
const { recordPointsLog } = require('../utils/points');

const getMemberList = async (page, pageSize, keyword) => {
  let sql = 'SELECT u.id, u.username, u.nickname, u.mobile, u.level, u.points, u.reward_value, u.frozen_points, u.status, u.created_at, u.referrer_id, r.nickname as referrer_name, (SELECT COUNT(*) FROM virtual_products p WHERE p.owner_id = u.id) as product_count FROM users u LEFT JOIN users r ON u.referrer_id = r.id WHERE u.level < 2';
  const params = [];
  
  if (keyword) {
    sql += ' AND (u.username LIKE $1 OR u.nickname LIKE $2 OR u.mobile LIKE $3)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(pageSize, (page - 1) * pageSize);
  
  const members = await db.query(sql, params);
  
  const totalResult = await db.query('SELECT COUNT(*) as total FROM users WHERE level < 2' + (keyword ? ' AND (username LIKE $1 OR nickname LIKE $2 OR mobile LIKE $3)' : ''), keyword ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`] : []);
  const total = totalResult[0].total;
  
  return { members, total };
};

const getMemberById = async (id) => {
  const members = await db.query(
    'SELECT u.id, u.username, u.nickname, u.mobile, u.email, u.level, u.points, u.frozen_points, u.reward_value, u.status, u.created_at, u.qrcode_url, u.referrer_id, r.nickname as referrer_name FROM users u LEFT JOIN users r ON u.referrer_id = r.id WHERE u.id = $1',
    [id]
  );
  return members.length > 0 ? members[0] : null;
};

const updateMember = async (id, data, operatorId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.nickname !== undefined) { fields.push(`nickname = $${paramIndex++}`); values.push(data.nickname); }
  if (data.mobile !== undefined) { fields.push(`mobile = $${paramIndex++}`); values.push(data.mobile); }
  if (data.level !== undefined) { fields.push(`level = $${paramIndex++}`); values.push(data.level); }
  if (data.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(data.status); }
  if (data.referrer_id !== undefined) { fields.push(`referrer_id = $${paramIndex++}`); values.push(data.referrer_id); }
  
  if (fields.length === 0) {
    throw new Error('没有需要更新的字段');
  }

  if (data.mobile) {
    const existing = await db.query('SELECT id FROM users WHERE mobile = $1 AND id != $2', [data.mobile, id]);
    if (existing.length > 0) {
      throw new Error('手机号已存在');
    }
  }

  values.push(id);
  await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  await logAction(operatorId, '更新', '会员管理', `更新会员信息，ID: ${id}`, null);
};

const adjustPoints = async (memberId, amount, description, operatorId) => {
  const members = await db.query('SELECT points, frozen_points FROM users WHERE id = $1', [memberId]);
  if (members.length === 0) {
    throw new Error('会员不存在');
  }
  
  const user = members[0];
  const newPoints = user.points + amount;
  
  if (newPoints < 0) {
    throw new Error('积分不足');
  }
  
  return await db.tx(async t => {
    await t.none('UPDATE users SET points = $1 WHERE id = $2', [newPoints, memberId]);
    await t.none(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [memberId, amount > 0 ? '充值' : '扣减', amount, user.points, newPoints, user.frozen_points, user.frozen_points, description || (amount > 0 ? '管理员充值' : '管理员扣减')]
    );
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [operatorId, '调整积分', '会员管理', `${amount > 0 ? '充值' : '扣减'}积分 ${amount}，会员ID: ${memberId}`]
    );
    
    return { points: newPoints };
  });
};

const adjustRewardValue = async (memberId, amount, description, operatorId) => {
  const members = await db.query('SELECT reward_value FROM users WHERE id = $1', [memberId]);
  if (members.length === 0) {
    throw new Error('会员不存在');
  }
  
  const user = members[0];
  const newValue = user.reward_value + amount;
  
  if (newValue < 0) {
    throw new Error('奖励值不能为负');
  }
  
  await db.execute('UPDATE users SET reward_value = $1 WHERE id = $2', [newValue, memberId]);
  await logAction(operatorId, '调整奖励值', '会员管理', `${amount > 0 ? '增加' : '减少'}奖励值 ${amount}，会员ID: ${memberId}`, null);
  
  return { reward_value: newValue };
};

const bindProduct = async (memberId, productId, operatorId) => {
  const members = await db.query('SELECT id FROM users WHERE id = $1 AND level < 2', [memberId]);
  if (members.length === 0) {
    throw new Error('会员不存在或不是普通会员');
  }
  
  const products = await db.query('SELECT id, owner_id FROM virtual_products WHERE id = $1', [productId]);
  if (products.length === 0) {
    throw new Error('产品不存在');
  }
  
  const product = products[0];
  if (product.owner_id !== null) {
    throw new Error('产品已被分配');
  }
  
  return await db.tx(async t => {
    await t.none('UPDATE virtual_products SET owner_id = $1, status = 1 WHERE id = $2', [memberId, productId]);
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [operatorId, '绑定产品', '会员管理', `为会员 ${memberId} 绑定产品 ${productId}`]
    );
  });
};

module.exports = { getMemberList, getMemberById, updateMember, adjustPoints, adjustRewardValue, bindProduct };