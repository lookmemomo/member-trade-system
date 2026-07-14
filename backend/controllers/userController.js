const { register, login, getUserInfo, updateUserInfo } = require('../services/userService');

const registerHandler = async (req, res) => {
  try {
    const { username, password, mobile, email, nickname } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    
    const result = await register(username, password, mobile, email, nickname);
    res.json({ code: 200, message: '注册成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const loginHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const result = await login(username, password, ipAddress);
    res.json({ code: 200, message: '登录成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const getUserInfoHandler = async (req, res) => {
  try {
    const user = await getUserInfo(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }
    res.json({ code: 200, message: '获取成功', data: user });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const updateUserInfoHandler = async (req, res) => {
  try {
    await updateUserInfo(req.user.id, req.body);
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

module.exports = { registerHandler, loginHandler, getUserInfoHandler, updateUserInfoHandler };