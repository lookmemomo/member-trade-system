const db = require('../config/db');
const dayjs = require('dayjs');
const { logAction } = require('../utils/logger');
const { recordPointsLog } = require('../utils/points');

const STATUS = {
  PENDING_BUY: 0,
  PENDING_UPLOAD: 1,
  PENDING_REVIEW: 2,
  COMPLETED: 3,
  REJECTED: 4
};

const createPush = async (sellerId, buyerId, productId, price, operatorId) => {
  const sellers = await db.query('SELECT id, level FROM users WHERE id = $1 AND status = 1', [sellerId]);
  if (sellers.length === 0) {
    throw new Error('卖家不存在或已禁用');
  }
  
  const buyers = await db.query('SELECT id, level FROM users WHERE id = $1 AND status = 1', [buyerId]);
  if (buyers.length === 0) {
    throw new Error('买家不存在或已禁用');
  }
  
  const products = await db.query('SELECT id, owner_id, status FROM virtual_products WHERE id = $1', [productId]);
  if (products.length === 0) {
    throw new Error('产品不存在');
  }
  
  const product = products[0];
  if (product.owner_id !== sellerId) {
    throw new Error('产品不属于该卖家');
  }
  
  if (product.status !== 1) {
    throw new Error('产品状态不正确');
  }
  
  const today = dayjs().format('YYYY-MM-DD');
  
  return await db.tx(async t => {
    const result = await t.one(
      'INSERT INTO trade_push (seller_id, buyer_id, product_id, price, status, push_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [sellerId, buyerId, productId, price, STATUS.PENDING_BUY, today]
    );
    
    const insertId = result.id;
    
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [operatorId, '推送交易', '产品派发', `创建交易推送，ID: ${insertId}，卖家: ${sellerId}，买家: ${buyerId}`]
    );
    
    return { id: insertId };
  });
};

const buyProduct = async (tradeId, userId) => {
  const trades = await db.query('SELECT id, seller_id, buyer_id, product_id, price, status FROM trade_push WHERE id = $1', [tradeId]);
  if (trades.length === 0) {
    throw new Error('交易记录不存在');
  }
  
  const trade = trades[0];
  if (trade.status !== STATUS.PENDING_BUY) {
    throw new Error('交易状态不正确');
  }
  
  if (trade.buyer_id !== userId) {
    throw new Error('无权操作此交易');
  }
  
  const buyers = await db.query('SELECT points, frozen_points FROM users WHERE id = $1', [userId]);
  if (buyers.length === 0) {
    throw new Error('买家不存在');
  }
  
  const buyer = buyers[0];
  if (buyer.points < trade.price) {
    throw new Error('积分不足');
  }
  
  return await db.tx(async t => {
    await t.none('UPDATE users SET points = points - $1, frozen_points = frozen_points + $2 WHERE id = $3', [trade.price, trade.price, userId]);
    await t.none('UPDATE virtual_products SET owner_id = -1, status = 2 WHERE id = $1', [trade.product_id]);
    await t.none('UPDATE trade_push SET status = $1 WHERE id = $2', [STATUS.PENDING_UPLOAD, tradeId]);
    
    await t.none(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, related_trade_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [userId, '冻结', trade.price, buyer.points, buyer.points - trade.price, buyer.frozen_points, buyer.frozen_points + trade.price, tradeId, '购买产品冻结积分']
    );
    
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [userId, '购买产品', '交易核心', `购买产品，交易ID: ${tradeId}，价格: ${trade.price}`]
    );
  });
};

const uploadVoucher = async (tradeId, userId, imageUrl) => {
  const trades = await db.query('SELECT id, buyer_id, status FROM trade_push WHERE id = $1', [tradeId]);
  if (trades.length === 0) {
    throw new Error('交易记录不存在');
  }
  
  const trade = trades[0];
  if (trade.status !== STATUS.PENDING_UPLOAD) {
    throw new Error('交易状态不正确');
  }
  
  if (trade.buyer_id !== userId) {
    throw new Error('无权操作此交易');
  }
  
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  return await db.tx(async t => {
    await t.none('UPDATE trade_push SET status = $1, voucher_image_url = $2, voucher_upload_time = $3 WHERE id = $4', [STATUS.PENDING_REVIEW, imageUrl, now, tradeId]);
    
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [userId, '上传凭证', '交易核心', `上传凭证，交易ID: ${tradeId}`]
    );
  });
};

const reviewPass = async (tradeId, operatorId) => {
  const trades = await db.query('SELECT id, seller_id, buyer_id, product_id, price, status FROM trade_push WHERE id = $1', [tradeId]);
  if (trades.length === 0) {
    throw new Error('交易记录不存在');
  }
  
  const trade = trades[0];
  if (trade.status !== STATUS.PENDING_REVIEW) {
    throw new Error('交易状态不正确');
  }
  
  const buyers = await db.query('SELECT points, frozen_points FROM users WHERE id = $1', [trade.buyer_id]);
  if (buyers.length === 0) {
    throw new Error('买家不存在');
  }
  
  const buyer = buyers[0];
  const sellers = await db.query('SELECT points, frozen_points FROM users WHERE id = $1', [trade.seller_id]);
  if (sellers.length === 0) {
    throw new Error('卖家不存在');
  }
  
  const seller = sellers[0];
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  return await db.tx(async t => {
    await t.none('UPDATE users SET frozen_points = frozen_points - $1 WHERE id = $2', [trade.price, trade.buyer_id]);
    await t.none('UPDATE users SET points = points + $1 WHERE id = $2', [trade.price, trade.seller_id]);
    await t.none('UPDATE virtual_products SET owner_id = $1, status = 1 WHERE id = $2', [trade.buyer_id, trade.product_id]);
    await t.none('UPDATE trade_push SET status = $1, review_time = $2 WHERE id = $3', [STATUS.COMPLETED, now, tradeId]);
    
    await t.none(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, related_trade_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [trade.buyer_id, '结算', -trade.price, buyer.points, buyer.points, buyer.frozen_points, buyer.frozen_points - trade.price, tradeId, '交易完成扣除冻结积分']
    );
    
    await t.none(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, related_trade_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [trade.seller_id, '结算', trade.price, seller.points, seller.points + trade.price, seller.frozen_points, seller.frozen_points, tradeId, '交易完成获得积分']
    );
    
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [operatorId, '审核通过', '凭证审核', `审核通过，交易ID: ${tradeId}`]
    );
  });
};

const reviewReject = async (tradeId, remark, operatorId) => {
  const trades = await db.query('SELECT id, seller_id, buyer_id, product_id, price, status FROM trade_push WHERE id = $1', [tradeId]);
  if (trades.length === 0) {
    throw new Error('交易记录不存在');
  }
  
  const trade = trades[0];
  if (trade.status !== STATUS.PENDING_REVIEW) {
    throw new Error('交易状态不正确');
  }
  
  const buyers = await db.query('SELECT points, frozen_points FROM users WHERE id = $1', [trade.buyer_id]);
  if (buyers.length === 0) {
    throw new Error('买家不存在');
  }
  
  const buyer = buyers[0];
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  return await db.tx(async t => {
    await t.none('UPDATE users SET points = points + $1, frozen_points = frozen_points - $2 WHERE id = $3', [trade.price, trade.price, trade.buyer_id]);
    await t.none('UPDATE virtual_products SET owner_id = $1, status = 1 WHERE id = $2', [trade.seller_id, trade.product_id]);
    await t.none('UPDATE trade_push SET status = $1, review_time = $2, review_remark = $3 WHERE id = $4', [STATUS.REJECTED, now, remark, tradeId]);
    
    await t.none(
      'INSERT INTO points_log (user_id, change_type, amount, balance_before, balance_after, frozen_before, frozen_after, related_trade_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [trade.buyer_id, '解冻', trade.price, buyer.points, buyer.points + trade.price, buyer.frozen_points, buyer.frozen_points - trade.price, tradeId, `交易驳回，原因: ${remark}`]
    );
    
    await t.none(
      'INSERT INTO system_logs (user_id, action, module, description) VALUES ($1, $2, $3, $4)',
      [operatorId, '审核驳回', '凭证审核', `审核驳回，交易ID: ${tradeId}，原因: ${remark}`]
    );
  });
};

const getTradeList = async (page, pageSize, status, keyword) => {
  let sql = 'SELECT tp.id, tp.seller_id, tp.buyer_id, tp.product_id, tp.price, tp.status, tp.push_date, tp.created_at, tp.voucher_image_url, tp.review_remark, su.nickname as seller_name, bu.nickname as buyer_name, p.name as product_name FROM trade_push tp LEFT JOIN users su ON tp.seller_id = su.id LEFT JOIN users bu ON tp.buyer_id = bu.id LEFT JOIN virtual_products p ON tp.product_id = p.id';
  const params = [];
  
  if (status !== 'all') {
    sql += ' WHERE tp.status = $1';
    params.push(status);
  }
  
  if (keyword) {
    const offset = params.length;
    sql += (status !== 'all' ? ' AND' : ' WHERE') + ` (su.nickname LIKE $${offset + 1} OR bu.nickname LIKE $${offset + 2} OR p.name LIKE $${offset + 3})`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ` ORDER BY tp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(pageSize, (page - 1) * pageSize);
  
  const trades = await db.query(sql, params);
  
  const countSql = 'SELECT COUNT(*) as total FROM trade_push tp LEFT JOIN users su ON tp.seller_id = su.id LEFT JOIN users bu ON tp.buyer_id = bu.id LEFT JOIN virtual_products p ON tp.product_id = p.id' + (status !== 'all' ? ' WHERE tp.status = $1' : '') + (keyword ? (status !== 'all' ? ' AND' : ' WHERE') + ' (su.nickname LIKE $' + (status !== 'all' ? '2' : '1') + ' OR bu.nickname LIKE $' + (status !== 'all' ? '3' : '2') + ' OR p.name LIKE $' + (status !== 'all' ? '4' : '3') + ')' : '');
  const countParams = [];
  if (status !== 'all') countParams.push(status);
  if (keyword) countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  
  const totalResult = await db.query(countSql, countParams);
  const total = totalResult[0].total;
  
  return { trades, total };
};

const getTodayTrades = async (buyerId) => {
  const today = dayjs().format('YYYY-MM-DD');
  return await db.query(
    'SELECT tp.id, tp.seller_id, tp.buyer_id, tp.product_id, tp.price, tp.status, tp.push_date, tp.voucher_image_url, tp.review_remark, su.nickname as seller_name, su.id as seller_id_num, su.qrcode_url as seller_qrcode, p.name as product_name FROM trade_push tp LEFT JOIN users su ON tp.seller_id = su.id LEFT JOIN virtual_products p ON tp.product_id = p.id WHERE tp.buyer_id = $1 AND tp.push_date = $2 ORDER BY tp.created_at DESC',
    [buyerId, today]
  );
};

const getTradeStats = async () => {
  const today = dayjs().format('YYYY-MM-DD');
  
  const todayPush = await db.query('SELECT COUNT(*) as count FROM trade_push WHERE push_date = $1', [today]);
  const pendingBuy = await db.query('SELECT COUNT(*) as count FROM trade_push WHERE status = $1 AND push_date = $2', [STATUS.PENDING_BUY, today]);
  const pendingReview = await db.query('SELECT COUNT(*) as count FROM trade_push WHERE status = $1', [STATUS.PENDING_REVIEW]);
  const completed = await db.query('SELECT COUNT(*) as count FROM trade_push WHERE status = $1', [STATUS.COMPLETED]);
  
  return {
    today_push: todayPush[0].count,
    pending_buy: pendingBuy[0].count,
    pending_review: pendingReview[0].count,
    completed: completed[0].count
  };
};

const getTradeById = async (tradeId) => {
  const trades = await db.query(
    'SELECT tp.id, tp.seller_id, tp.buyer_id, tp.product_id, tp.price, tp.status, tp.push_date, tp.voucher_image_url, tp.review_remark, su.nickname as seller_name, bu.nickname as buyer_name, p.name as product_name FROM trade_push tp LEFT JOIN users su ON tp.seller_id = su.id LEFT JOIN users bu ON tp.buyer_id = bu.id LEFT JOIN virtual_products p ON tp.product_id = p.id WHERE tp.id = $1',
    [tradeId]
  );
  return trades.length > 0 ? trades[0] : null;
};

const getReviewList = async (page, pageSize, status, startTime, endTime, keyword) => {
  const queryStatus = status !== undefined ? status : STATUS.PENDING_REVIEW;
  return await getTradeList(page, pageSize, queryStatus, keyword);
};

const getAllTrades = async (page, pageSize, status, startTime, endTime) => {
  return await getTradeList(page, pageSize, status === undefined ? 'all' : status, null);
};

const getTodayPushStats = async () => {
  return await getTradeStats();
};

const getUserTradeHistory = async (userId, page, pageSize, status) => {
  let sql = 'SELECT tp.id, tp.seller_id, tp.buyer_id, tp.product_id, tp.price, tp.status, tp.push_date, tp.voucher_image_url, tp.review_remark, su.nickname as seller_name, bu.nickname as buyer_name, p.name as product_name FROM trade_push tp LEFT JOIN users su ON tp.seller_id = su.id LEFT JOIN users bu ON tp.buyer_id = bu.id LEFT JOIN virtual_products p ON tp.product_id = p.id WHERE tp.buyer_id = $1 OR tp.seller_id = $2';
  const params = [userId, userId];
  
  if (status !== undefined) {
    sql += ' AND tp.status = $3';
    params.push(status);
  }
  
  const offset = params.length;
  sql += ` ORDER BY tp.created_at DESC LIMIT $${offset + 1} OFFSET $${offset + 2}`;
  params.push(pageSize, (page - 1) * pageSize);
  
  const trades = await db.query(sql, params);
  
  const countSql = 'SELECT COUNT(*) as total FROM trade_push WHERE buyer_id = $1 OR seller_id = $2' + (status !== undefined ? ' AND status = $3' : '');
  const countParams = [userId, userId];
  if (status !== undefined) countParams.push(status);
  
  const totalResult = await db.query(countSql, countParams);
  const total = totalResult[0].total;
  
  return { trades, total };
};

const getUserVouchers = async (userId, page, pageSize) => {
  let sql = 'SELECT tp.id, tp.product_id, tp.price, tp.status, tp.voucher_image_url, tp.voucher_upload_time, tp.review_remark, p.name as product_name FROM trade_push tp LEFT JOIN virtual_products p ON tp.product_id = p.id WHERE tp.buyer_id = $1 AND tp.voucher_image_url IS NOT NULL ORDER BY tp.voucher_upload_time DESC LIMIT $2 OFFSET $3';
  const params = [userId, pageSize, (page - 1) * pageSize];
  
  const vouchers = await db.query(sql, params);
  
  const totalResult = await db.query('SELECT COUNT(*) as total FROM trade_push WHERE buyer_id = $1 AND voucher_image_url IS NOT NULL', [userId]);
  const total = totalResult[0].total;
  
  return { vouchers, total };
};

module.exports = { STATUS, createPush, buyProduct, uploadVoucher, reviewPass, reviewReject, getTradeList, getTodayTrades, getTradeStats, getTradeById, getReviewList, getAllTrades, getTodayPushStats, getUserTradeHistory, getUserVouchers };