require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const router = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/member', express.static(path.join(__dirname, '../frontend/member')));

app.use('/api', router);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ code: 400, message: '文件上传失败: ' + err.message });
  } else if (err) {
    return res.status(400).json({ code: 400, message: err.message });
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`会员积分交易站系统后端服务启动成功，端口: ${port}`);
  });
}

module.exports = app;