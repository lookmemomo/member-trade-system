const { getTodayTrades, getTradeById, buyProduct, uploadVoucher, reviewPass, reviewReject, createPush, getReviewList, getAllTrades, getTodayPushStats, getUserTradeHistory, getUserVouchers } = require('../services/tradeService');

const getTodayTradesHandler = async (req, res) => {
  try {
    const trades = await getTodayTrades(req.user.id);
    res.json({ code: 200, message: '获取成功', data: trades });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getTradeByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const trade = await getTradeById(parseInt(id));
    if (!trade) {
      return res.status(404).json({ code: 404, message: '交易记录不存在' });
    }
    res.json({ code: 200, message: '获取成功', data: trade });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const buyProductHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await buyProduct(parseInt(id), req.user.id);
    res.json({ code: 200, message: '购买成功，请前往上传截图' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const uploadVoucherHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传图片' });
    }
    const imageUrl = `/uploads/vouchers/${req.file.filename}`;
    await uploadVoucher(parseInt(id), req.user.id, imageUrl);
    res.json({ code: 200, message: '上传成功', data: { imageUrl } });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const reviewPassHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await reviewPass(parseInt(id), req.user.id);
    res.json({ code: 200, message: '审核通过' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const reviewRejectHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    if (!remark) {
      return res.status(400).json({ code: 400, message: '请填写驳回原因' });
    }
    await reviewReject(parseInt(id), remark, req.user.id);
    res.json({ code: 200, message: '驳回成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const createPushHandler = async (req, res) => {
  try {
    const { sellerId, productId, price, buyerId } = req.body;
    if (!sellerId || !productId || !price || !buyerId) {
      return res.status(400).json({ code: 400, message: '参数不能为空' });
    }
    const result = await createPush(parseInt(sellerId), parseInt(buyerId), parseInt(productId), parseInt(price));
    res.json({ code: 200, message: '推送成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const getReviewListHandler = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, startTime, endTime, keyword } = req.query;
    const result = await getReviewList(parseInt(page), parseInt(pageSize), status !== undefined ? parseInt(status) : undefined, startTime, endTime, keyword);
    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getAllTradesHandler = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, startTime, endTime } = req.query;
    const result = await getAllTrades(parseInt(page), parseInt(pageSize), status !== undefined ? parseInt(status) : undefined, startTime, endTime);
    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getTodayPushStatsHandler = async (req, res) => {
  try {
    const stats = await getTodayPushStats();
    res.json({ code: 200, message: '获取成功', data: stats });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getUserTradeHistoryHandler = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const result = await getUserTradeHistory(req.user.id, parseInt(page), parseInt(pageSize), status !== undefined ? parseInt(status) : undefined);
    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getUserVouchersHandler = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const result = await getUserVouchers(req.user.id, parseInt(page), parseInt(pageSize));
    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

module.exports = { getTodayTradesHandler, getTradeByIdHandler, buyProductHandler, uploadVoucherHandler, reviewPassHandler, reviewRejectHandler, createPushHandler, getReviewListHandler, getAllTradesHandler, getTodayPushStatsHandler, getUserTradeHistoryHandler, getUserVouchersHandler };