const db = require('../config/db');
const { logAction } = require('../utils/logger');

const getProductList = async (page, pageSize) => {
  const products = await db.query(
    'SELECT p.id, p.name, p.description, p.image_url, p.owner_id, p.status, p.created_at, u.nickname as owner_name, u.mobile as owner_mobile FROM virtual_products p LEFT JOIN users u ON p.owner_id = u.id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2',
    [pageSize, (page - 1) * pageSize]
  );
  
  const totalResult = await db.query('SELECT COUNT(*) as total FROM virtual_products');
  const total = totalResult[0].total;
  
  return { products, total };
};

const getProductById = async (id) => {
  const products = await db.query(
    'SELECT p.id, p.name, p.description, p.image_url, p.owner_id, p.status, p.created_at, u.nickname as owner_name FROM virtual_products p LEFT JOIN users u ON p.owner_id = u.id WHERE p.id = $1',
    [id]
  );
  return products.length > 0 ? products[0] : null;
};

const createProduct = async (name, description, imageUrl, operatorId) => {
  const result = await db.execute(
    'INSERT INTO virtual_products (name, description, image_url) VALUES ($1, $2, $3)',
    [name, description, imageUrl]
  );
  await logAction(operatorId, '新增产品', '产品管理', `新增产品 ${name}，ID: ${result.insertId}`, null);
  return { id: result.insertId, name, description, image_url: imageUrl };
};

const batchCreateProducts = async (products, operatorId) => {
  let count = 0;
  for (const product of products) {
    await db.execute(
      'INSERT INTO virtual_products (name, description, image_url) VALUES ($1, $2, $3)',
      [product.name, product.description || '', product.image_url || null]
    );
    count++;
  }
  await logAction(operatorId, '批量新增产品', '产品管理', `批量新增 ${count} 个产品`, null);
  return { count };
};

const updateProduct = async (id, data, operatorId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.name) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }
  if (data.image_url) { fields.push(`image_url = $${paramIndex++}`); values.push(data.image_url); }
  
  if (fields.length === 0) {
    throw new Error('没有需要更新的字段');
  }

  values.push(id);
  await db.execute(`UPDATE virtual_products SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  await logAction(operatorId, '更新产品', '产品管理', `更新产品信息，ID: ${id}`, null);
};

const deleteProduct = async (id, operatorId) => {
  const products = await db.query('SELECT owner_id FROM virtual_products WHERE id = $1', [id]);
  if (products.length === 0) {
    throw new Error('产品不存在');
  }
  
  if (products[0].owner_id !== null) {
    throw new Error('产品已被分配，无法删除');
  }
  
  await db.execute('DELETE FROM virtual_products WHERE id = $1', [id]);
  await logAction(operatorId, '删除产品', '产品管理', `删除产品，ID: ${id}`, null);
};

const getUnassignedProducts = async () => {
  return await db.query('SELECT id, name FROM virtual_products WHERE owner_id IS NULL ORDER BY id');
};

const getMembersWithProduct = async () => {
  return await db.query('SELECT u.id, u.nickname, p.id as product_id, p.name as product_name FROM users u JOIN virtual_products p ON u.id = p.owner_id WHERE u.status = 1 ORDER BY u.id');
};

const getProductHistory = async (productId) => {
  return await db.query(
    'SELECT tp.id, tp.seller_id, tp.buyer_id, tp.price, tp.status, tp.created_at, su.nickname as seller_name, bu.nickname as buyer_name FROM trade_push tp LEFT JOIN users su ON tp.seller_id = su.id LEFT JOIN users bu ON tp.buyer_id = bu.id WHERE tp.product_id = $1 ORDER BY tp.created_at DESC',
    [productId]
  );
};

module.exports = { getProductList, getProductById, createProduct, batchCreateProducts, updateProduct, deleteProduct, getUnassignedProducts, getMembersWithProduct, getProductHistory };