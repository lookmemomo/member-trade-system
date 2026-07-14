module.exports = {
  apps: [{
    name: 'member-trade-system',
    script: 'app.js',
    cwd: 'D:/001/001/member-trade-system/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '../logs/error.log',
    out_file: '../logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
