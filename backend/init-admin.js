const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function initAdmin() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const hashedPassword = await bcrypt.hash('123456', 10);
    console.log('生成的密码哈希:', hashedPassword);
    
    await db.execute(
        'INSERT OR REPLACE INTO users (id, username, password, nickname, level, points, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [1, 'admin', hashedPassword, '管理员', 2, 99999, 1]
    );
    
    console.log('管理员账号初始化完成！');
    console.log('用户名: admin');
    console.log('密码: 123456');
    
    process.exit(0);
}

initAdmin().catch(err => {
    console.error('初始化失败:', err);
    process.exit(1);
});