const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { secret, expiresIn } = require('../config/jwt');
const { logAction } = require('../utils/logger');
const { recordPointsLog } = require('../utils/points');

const register = async (username, password, mobile, email, nickname) => {
  if (!username || !username.trim()) {
    throw new Error('用户名不能为空');
  }
  if (!password) {
    throw new Error('密码不能为空');
  }
  if (!mobile || !mobile.trim()) {
    throw new Error('手机号不能为空');
  }
  
  const cleanMobile = mobile.trim();
  const cleanEmail = email && email.trim() ? email.trim() : null;
  
  const usernameExists = await db.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
  if (usernameExists.length > 0) {
    throw new Error('用户名已存在');
  }
  
  const mobileExists = await db.query('SELECT id FROM users WHERE mobile = $1', [cleanMobile]);
  if (mobileExists.length > 0) {
    throw new Error('手机号已存在');
  }
  
  if (cleanEmail) {
    const emailExists = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (emailExists.length > 0) {
      throw new Error('邮箱已存在');
    }
  }

  const config = await db.query('SELECT config_value FROM system_config WHERE config_key = $1', ['initial_points']);
  const initialPoints = config.length > 0 ? parseInt(config[0].config_value) : 100;

  const hashedPassword = await bcrypt.hash(password, 10);
  
  return await db.tx(async t => {
    const result = await t.one(
      'INSERT INTO users (username, password, mobile, email, nickname, points, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [username, hashedPassword, cleanMobile, cleanEmail, nickname, initialPoints, 2]
    );

    const insertId = result.id;
    
    await t.none(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [insertId, '充值', initialPoints, 0, initialPoints, 0, 0, '新会员注册赠送积分']
    );
    
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [insertId, '注册', '用户认证', `会员注册成功，ID: ${insertId}`]
    );

    return { id: insertId, username, nickname, points: initialPoints };
  });
};

const login = async (username, password, ipAddress) => {
  let users = await db.query('SELECT id, username, password, nickname, level, points, frozen_points, status FROM users WHERE mobile = $1', [username]);
  
  if (users.length === 0) {
    users = await db.query('SELECT id, username, password, nickname, level, points, frozen_points, status FROM users WHERE username = $1', [username]);
  }
  
  if (users.length === 0) {
    throw new Error('用户不存在');
  }

  const user = users[0];
    if (user.status === 0) {
      throw new Error('账号已被禁用');
    }
    if (user.status === 2) {
      throw new Error('会员审核中，请等待');
    }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('密码错误');
  }

  const token = jwt.sign({ userId: user.id }, secret, { expiresIn });
  await logAction(user.id, '登录', '用户认证', `会员登录成功，ID: ${user.id}`, ipAddress);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      level: user.level,
      points: user.points,
      frozen_points: user.frozen_points
    }
  };
};

const getUserInfo = async (userId) => {
  const users = await db.query(
    'SELECT u.id, u.username, u.nickname, u.avatar, u.level, u.points, u.frozen_points, u.reward_value, u.qrcode_url, u.created_at, r.nickname as referrer_name FROM users u LEFT JOIN users r ON u.referrer_id = r.id WHERE u.id = $1',
    [userId]
  );
  return users.length > 0 ? users[0] : null;
};

const updateUserInfo = async (userId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.nickname) { fields.push(`nickname = $${paramIndex++}`); values.push(data.nickname); }
  if (data.avatar) { fields.push(`avatar = $${paramIndex++}`); values.push(data.avatar); }
  if (data.qrcode_url) { fields.push(`qrcode_url = $${paramIndex++}`); values.push(data.qrcode_url); }
  
  if (fields.length === 0) {
    throw new Error('没有需要更新的字段');
  }

  values.push(userId);
  await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  await logAction(userId, '更新', '个人中心', `会员更新信息，ID: ${userId}`, null);
};

module.exports = { register, login, getUserInfo, updateUserInfo };