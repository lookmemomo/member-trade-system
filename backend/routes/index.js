const express = require('express');
const multer = require('multer');
const { registerHandler, loginHandler, getUserInfoHandler, updateUserInfoHandler } = require('../controllers/userController');
const { getMembersHandler, getMemberByIdHandler, updateMemberHandler, adjustPointsHandler, adjustRewardValueHandler, bindProductHandler } = require('../controllers/memberController');
const { getProductsHandler, getProductByIdHandler, createProductHandler, batchCreateProductsHandler, updateProductHandler, deleteProductHandler, getProductHistoryHandler, getUnassignedProductsHandler, getMembersWithProductHandler } = require('../controllers/productController');
const { getTodayTradesHandler, getTradeByIdHandler, buyProductHandler, uploadVoucherHandler, reviewPassHandler, reviewRejectHandler, createPushHandler, getReviewListHandler, getAllTradesHandler, getTodayPushStatsHandler, getUserTradeHistoryHandler, getUserVouchersHandler } = require('../controllers/tradeController');
const { getConfigHandler, setConfigHandler, getAllConfigsHandler } = require('../controllers/configController');
const { getTablesHandler, getTableColumnsHandler, queryDataHandler, getSingleDataHandler, insertSingleHandler, batchInsertHandler, updateSingleHandler, batchUpdateHandler, deleteSingleHandler, batchDeleteHandler } = require('../controllers/dbController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadFile } = require('../config/storage');

const router = express.Router();

const memoryStorage = multer.memoryStorage();

const voucherUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extname = file.originalname.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(extname)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持jpg, jpeg, png格式'));
    }
  }
});

const qrcodeUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extname = file.originalname.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(extname)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持jpg, jpeg, png格式'));
    }
  }
});

router.post('/auth/register', registerHandler);
router.post('/auth/login', loginHandler);

router.get('/user/info', authMiddleware, getUserInfoHandler);
router.put('/user/info', authMiddleware, updateUserInfoHandler);

router.get('/member/list', adminMiddleware, getMembersHandler);
router.get('/member/:id', adminMiddleware, getMemberByIdHandler);
router.put('/member/:id', adminMiddleware, updateMemberHandler);
router.post('/member/:id/adjust-points', adminMiddleware, adjustPointsHandler);
router.post('/member/:id/adjust-reward', adminMiddleware, adjustRewardValueHandler);
router.post('/member/:id/bind-product', adminMiddleware, bindProductHandler);

router.get('/product/list', adminMiddleware, getProductsHandler);
router.get('/product/unassigned', adminMiddleware, getUnassignedProductsHandler);
router.get('/product/members-with-product', adminMiddleware, getMembersWithProductHandler);
router.get('/product/:id', adminMiddleware, getProductByIdHandler);
router.post('/product/create', adminMiddleware, createProductHandler);
router.post('/product/batch', adminMiddleware, batchCreateProductsHandler);
router.put('/product/:id', adminMiddleware, updateProductHandler);
router.delete('/product/:id', adminMiddleware, deleteProductHandler);
router.get('/product/:id/history', adminMiddleware, getProductHistoryHandler);

router.get('/trade/today', authMiddleware, getTodayTradesHandler);
router.get('/trade/review-list', adminMiddleware, getReviewListHandler);
router.get('/trade/all', adminMiddleware, getAllTradesHandler);
router.get('/trade/list', adminMiddleware, getAllTradesHandler);
router.get('/trade/today-stats', adminMiddleware, getTodayPushStatsHandler);
router.get('/trade/history', authMiddleware, getUserTradeHistoryHandler);
router.get('/trade/vouchers', authMiddleware, getUserVouchersHandler);
router.get('/trade/:id', authMiddleware, getTradeByIdHandler);
router.post('/trade/:id/buy', authMiddleware, buyProductHandler);
router.post('/trade/:id/upload-voucher', authMiddleware, voucherUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传图片' });
    }
    const publicUrl = await uploadFile('vouchers', `${Date.now()}-${req.file.originalname}`, req.file.buffer, req.file.mimetype);
    req.body.imageUrl = publicUrl;
    await uploadVoucherHandler(req, res);
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
});
router.post('/trade/:id/review-pass', adminMiddleware, reviewPassHandler);
router.post('/trade/:id/review-reject', adminMiddleware, reviewRejectHandler);
router.post('/trade/push', adminMiddleware, createPushHandler);

router.get('/config/all', adminMiddleware, getAllConfigsHandler);
router.get('/config/:key', adminMiddleware, getConfigHandler);
router.put('/config/:key', adminMiddleware, setConfigHandler);

router.post('/upload/qrcode', authMiddleware, qrcodeUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传图片' });
    }
    const publicUrl = await uploadFile('qrcodes', `${Date.now()}-${req.file.originalname}`, req.file.buffer, req.file.mimetype);
    res.json({ code: 200, message: '上传成功', data: { imageUrl: publicUrl } });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
});

router.get('/db/tables', adminMiddleware, getTablesHandler);
router.get('/db/table/:table/columns', adminMiddleware, getTableColumnsHandler);
router.get('/db/table/:table/data', adminMiddleware, queryDataHandler);
router.get('/db/table/:table/data/:id', adminMiddleware, getSingleDataHandler);
router.post('/db/table/:table/insert', adminMiddleware, insertSingleHandler);
router.post('/db/table/:table/batch-insert', adminMiddleware, batchInsertHandler);
router.put('/db/table/:table/data/:id', adminMiddleware, updateSingleHandler);
router.post('/db/table/:table/batch-update', adminMiddleware, batchUpdateHandler);
router.delete('/db/table/:table/data/:id', adminMiddleware, deleteSingleHandler);
router.post('/db/table/:table/batch-delete', adminMiddleware, batchDeleteHandler);

module.exports = router;