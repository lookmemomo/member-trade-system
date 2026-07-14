# 会员积分交易站系统 - 部署指南

## 项目概述

会员积分交易站系统是一个基于 Node.js + Express + PostgreSQL (Supabase) 的前后端分离项目。

## 技术栈

- **后端**: Node.js 18+, Express 4.x
- **数据库**: PostgreSQL (Supabase)
- **前端**: HTML5 + JavaScript + Tailwind CSS + Font Awesome
- **部署**: Nginx + PM2

## 目录结构

```
member-trade-system/
├── backend/           # 后端服务
│   ├── app.js         # 入口文件
│   ├── package.json   # 依赖配置
│   ├── ecosystem.config.js  # PM2配置
│   ├── config/        # 配置文件
│   ├── controllers/   # 控制器
│   ├── services/      # 服务层
│   ├── routes/        # 路由
│   ├── middleware/    # 中间件
│   ├── utils/         # 工具函数
│   └── database/      # SQLite数据库文件
├── frontend/          # 前端页面
│   ├── admin/         # 管理后台
│   └── member/        # 会员端
├── uploads/           # 上传文件目录
├── logs/              # 日志目录
├── nginx.conf         # Nginx配置
└── DEPLOYMENT.md      # 部署说明
```

## 部署步骤

### 1. 服务器环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (推荐使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt install nginx -y
```

### 2. 配置 Supabase

1. 访问 [Supabase](https://supabase.com/) 创建账户和项目
2. 获取数据库连接信息：
   - 进入项目 → Settings → Database → Connection string
   - 格式：`postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

3. 修改后端 `.env` 文件：

```bash
cd /var/www/member-trade-system/backend
cp .env.example .env
nano .env
```

配置内容：
```
DATABASE_URL=postgresql://postgres:[your-password]@db.[your-project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_KEY=[your-api-key]
PORT=3000
```

### 3. 上传项目文件

将项目文件上传到服务器，例如 `/var/www/member-trade-system/`

```bash
# 创建项目目录
sudo mkdir -p /var/www/member-trade-system

# 上传项目文件（使用 scp 或 git）
scp -r ./member-trade-system user@server-ip:/var/www/

# 或者使用 git
cd /var/www/member-trade-system
git clone <repository-url> .
```

### 4. 安装依赖

```bash
cd /var/www/member-trade-system/backend
npm install --production
```

### 5. 配置 Nginx

```bash
# 备份默认配置
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 创建新配置
sudo cp nginx.conf /etc/nginx/sites-available/member-trade-system

# 修改配置文件中的路径
sudo nano /etc/nginx/sites-available/member-trade-system
```

修改 Nginx 配置中的路径：
```nginx
root /var/www/member-trade-system/frontend;

location /uploads/ {
    root /var/www/member-trade-system;
    ...
}

location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    ...
}
```

启用站点并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/member-trade-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. 使用 PM2 启动后端服务

```bash
cd /var/www/member-trade-system/backend

# 修改 ecosystem.config.js 中的路径
nano ecosystem.config.js

# 使用 PM2 启动
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 7. 配置域名（可选）

如果需要绑定域名，修改 Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 其他配置...
}
```

配置 HTTPS（使用 Let's Encrypt）：

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 访问地址

- **管理后台**: http://your-domain.com/admin/
- **会员端**: http://your-domain.com/member/

## 默认账号

- **管理员**: admin / 123456

## 运维命令

```bash
# 查看 PM2 进程状态
pm2 status

# 查看日志
pm2 logs member-trade-system

# 重启服务
pm2 restart member-trade-system

# 停止服务
pm2 stop member-trade-system

# 查看 Nginx 状态
sudo systemctl status nginx

# 重新加载 Nginx 配置
sudo systemctl reload nginx
```

## 注意事项

1. **数据库备份**: 定期备份 SQLite 数据库文件
2. **日志管理**: 定期清理日志文件
3. **安全防护**: 配置防火墙，只开放必要端口
4. **文件权限**: 确保 uploads 和 logs 目录有写入权限
5. **环境变量**: 生产环境建议使用环境变量配置敏感信息
