const db = require('../config/db');
const bcrypt = require('bcryptjs');

const ALLOWED_TABLES = ['users', 'virtual_products', 'trade_push', 'system_logs', 'points_log', 'system_config'];

const checkTable = (table) => {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error(`不允许操作的表: ${table}`);
  }
};

const getTablesHandler = async (req, res) => {
  try {
    res.json({ code: 200, message: '获取成功', data: ALLOWED_TABLES });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getTableColumnsHandler = async (req, res) => {
  try {
    const { table } = req.params;
    checkTable(table);
    
    const columns = await db.query(`
      SELECT column_name as name, data_type as type, is_nullable as notNull 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [table]);
    res.json({ code: 200, message: '获取成功', data: columns });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const maskPassword = (table, data) => {
  if (table === 'users' && data && data.password) {
    data.password = '******';
  }
  return data;
};

const maskPasswords = (table, data) => {
  if (Array.isArray(data)) {
    return data.map(item => maskPassword(table, item));
  }
  return maskPassword(table, data);
};

const queryDataHandler = async (req, res) => {
  try {
    const { table } = req.params;
    const { page = 1, pageSize = 20, where } = req.query;
    
    checkTable(table);
    
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    
    if (where) {
      const conditions = [];
      const whereObj = JSON.parse(where);
      let paramIndex = 1;
      for (const [key, value] of Object.entries(whereObj)) {
        if (value !== null && value !== undefined && value !== '') {
          conditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    sql += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    
    const data = await db.query(sql, params);
    
    const countSql = `SELECT COUNT(*) as total FROM ${table}` + (where && Object.keys(JSON.parse(where)).length > 0 ? ' WHERE ' + conditions.join(' AND ') : '');
    const countResult = await db.query(countSql, where && Object.keys(JSON.parse(where)).length > 0 ? params.slice(0, -2) : []);
    
    res.json({ code: 200, message: '获取成功', data: { list: maskPasswords(table, data), total: countResult[0].total } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getSingleDataHandler = async (req, res) => {
  try {
    const { table, id } = req.params;
    checkTable(table);
    
    const data = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (data.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }
    
    res.json({ code: 200, message: '获取成功', data: maskPassword(table, data[0]) });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const insertSingleHandler = async (req, res) => {
  try {
    const { table } = req.params;
    const data = { ...req.body };
    
    checkTable(table);
    
    if (table === 'users' && data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await db.execute(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
    
    const inserted = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [result.insertId]);
    res.json({ code: 200, message: '插入成功', data: inserted[0] });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const batchInsertHandler = async (req, res) => {
  try {
    const { table } = req.params;
    const records = req.body;
    
    checkTable(table);
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ code: 400, message: '记录列表不能为空' });
    }
    
    let count = 0;
    for (const data of records) {
      const insertData = { ...data };
      
      if (table === 'users' && insertData.password) {
        insertData.password = await bcrypt.hash(insertData.password, 10);
      }
      
      const columns = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      await db.execute(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
      count++;
    }
    
    res.json({ code: 200, message: '批量插入成功', data: { count } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const updateSingleHandler = async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = req.body;
    
    checkTable(table);
    
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id') {
        if (table === 'users' && key === 'password') {
          if (!value || value === '******' || value === '') {
            continue;
          }
          fields.push(`${key} = $${paramIndex++}`);
          values.push(await bcrypt.hash(value, 10));
        } else {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }
    
    values.push(id);
    await db.execute(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    
    const updated = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    res.json({ code: 200, message: '更新成功', data: maskPassword(table, updated[0]) });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const batchUpdateHandler = async (req, res) => {
  try {
    const { table } = req.params;
    const records = req.body;
    
    checkTable(table);
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ code: 400, message: '记录列表不能为空' });
    }
    
    let count = 0;
    for (const data of records) {
      if (!data.id) continue;
      
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'id') {
          fields.push(`${key} = $${paramIndex++}`);
          if (table === 'users' && key === 'password') {
            values.push(await bcrypt.hash(value, 10));
          } else {
            values.push(value);
          }
        }
      }
      
      if (fields.length === 0) continue;
      
      values.push(data.id);
      await db.execute(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
      count++;
    }
    
    res.json({ code: 200, message: '批量更新成功', data: { count } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const deleteSingleHandler = async (req, res) => {
  try {
    const { table, id } = req.params;
    checkTable(table);
    
    const existing = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }
    
    await db.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ code: 200, message: '删除成功', data: existing[0] });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const batchDeleteHandler = async (req, res) => {
  try {
    const { table } = req.params;
    const { ids } = req.body;
    
    checkTable(table);
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: 'ID列表不能为空' });
    }
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await db.execute(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
    
    res.json({ code: 200, message: `成功删除 ${ids.length} 条记录`, data: { count: ids.length } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

module.exports = {
  getTablesHandler,
  getTableColumnsHandler,
  queryDataHandler,
  getSingleDataHandler,
  insertSingleHandler,
  batchInsertHandler,
  updateSingleHandler,
  batchUpdateHandler,
  deleteSingleHandler,
  batchDeleteHandler
};