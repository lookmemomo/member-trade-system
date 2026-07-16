require('dotenv').config();
const pgp = require('pg-promise')();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:lmh79426719@db.pwfgmesjakmcemubnjrx.supabase.co:5432/postgres';
const db = pgp(DATABASE_URL);

async function initDatabase() {
    try {
        await db.none(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                mobile TEXT DEFAULT NULL UNIQUE,
                email TEXT DEFAULT NULL UNIQUE,
                nickname TEXT DEFAULT NULL,
                avatar TEXT DEFAULT NULL,
                level INTEGER DEFAULT 0,
                referrer_id INTEGER DEFAULT NULL,
                points INTEGER NOT NULL DEFAULT 0,
                frozen_points INTEGER NOT NULL DEFAULT 0,
                reward_value INTEGER NOT NULL DEFAULT 0,
                qrcode_url TEXT DEFAULT NULL,
                status INTEGER DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS virtual_products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT NULL,
                image_url TEXT DEFAULT NULL,
                owner_id INTEGER DEFAULT NULL,
                status INTEGER DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS trade_push (
                id SERIAL PRIMARY KEY,
                seller_id INTEGER NOT NULL,
                buyer_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                price INTEGER NOT NULL,
                status INTEGER DEFAULT 0,
                voucher_image_url TEXT DEFAULT NULL,
                voucher_upload_time TIMESTAMP DEFAULT NULL,
                review_time TIMESTAMP DEFAULT NULL,
                review_remark TEXT DEFAULT NULL,
                push_date TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER DEFAULT NULL,
                action TEXT NOT NULL,
                module TEXT NOT NULL,
                description TEXT DEFAULT NULL,
                ip_address TEXT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS points_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                change_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                balance_before INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                frozen_before INTEGER NOT NULL,
                frozen_after INTEGER NOT NULL,
                related_trade_id INTEGER DEFAULT NULL,
                description TEXT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS system_config (
                id SERIAL PRIMARY KEY,
                config_key TEXT NOT NULL UNIQUE,
                config_value TEXT NOT NULL,
                description TEXT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            INSERT INTO system_config (config_key, config_value, description) VALUES 
            ('initial_points', '100', '新会员注册赠送积分'),
            ('voucher_upload_expire_hours', '24', '截图上传有效期(小时)')
            ON CONFLICT (config_key) DO NOTHING;
            
            INSERT INTO users (username, password, nickname, level, points, status) VALUES 
            ('admin', '$2a$10$rOvHdK7J5Z5gH3j2X2L2euvKJFmXK6X7v8f9h0i1j2k3l4m5n6o7p', '管理员', 2, 99999, 1)
            ON CONFLICT (username) DO NOTHING;
        `);
        console.log('PostgreSQL数据库初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error.message);
    }
}

const dbWrapper = {
    query: async function(sql, params) {
        return await db.any(sql, params || []);
    },
    execute: async function(sql, params) {
        const result = await db.result(sql, params || []);
        let insertId = null;
        if (sql.toUpperCase().includes('INSERT')) {
            const rows = await db.any('SELECT LASTVAL() AS id');
            insertId = rows[0].id;
        }
        return { 
            affectedRows: result.rowCount, 
            insertId: insertId 
        };
    },
    executeReturning: async function(sql, params) {
        return await db.one(sql, params || []);
    },
    one: async function(sql, params) {
        return await db.one(sql, params || []);
    },
    oneOrNone: async function(sql, params) {
        return await db.oneOrNone(sql, params || []);
    },
    none: async function(sql, params) {
        return await db.none(sql, params || []);
    },
    any: async function(sql, params) {
        return await db.any(sql, params || []);
    },
    tx: db.tx.bind(db),
    connect: db.connect.bind(db)
};

dbWrapper.connect()
    .then(obj => {
        console.log('PostgreSQL数据库连接成功');
        obj.done();
        initDatabase();
    })
    .catch(error => {
        console.error('PostgreSQL数据库连接失败:', error.message);
    });

module.exports = dbWrapper;