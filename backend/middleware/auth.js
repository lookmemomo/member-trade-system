const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');
const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: 401, message: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const users = await db.query('SELECT id, username, nickname, level, status FROM users WHERE id = $1', [decoded.userId]);
    if (users.length === 0) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }

    const user = users[0];
    if (user.status === 0) {
      return res.status(401).json({ code: 401, message: '账号已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: 'Token无效或已过期' });
  }
};

const adminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: 401, message: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const users = await db.query('SELECT id, username, nickname, level, status FROM users WHERE id = $1', [decoded.userId]);
    if (users.length === 0) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }

    const user = users[0];
    if (user.status === 0) {
      return res.status(401).json({ code: 401, message: '账号已被禁用' });
    }

    if (user.level < 2) {
      return res.status(403).json({ code: 403, message: '权限不足，需要管理员权限' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: 'Token无效或已过期' });
  }
};

module.exports = { authMiddleware, adminMiddleware };