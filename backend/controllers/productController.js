const { getProductList, getProductById, createProduct, batchCreateProducts, updateProduct, deleteProduct, getProductHistory, getUnassignedProducts, getMembersWithProduct } = require('../services/productService');

const getProductsHandler = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, keyword } = req.query;
    const result = await getProductList(parseInt(page), parseInt(pageSize));
    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getProductByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getProductById(parseInt(id));
    if (!product) {
      return res.status(404).json({ code: 404, message: '产品不存在' });
    }
    res.json({ code: 200, message: '获取成功', data: product });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const createProductHandler = async (req, res) => {
  try {
    const { name, description, image_url } = req.body;
    if (!name) {
      return res.status(400).json({ code: 400, message: '产品名称不能为空' });
    }
    const result = await createProduct(name, description, image_url);
    res.json({ code: 200, message: '创建成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const batchCreateProductsHandler = async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ code: 400, message: '产品列表不能为空' });
    }
    const result = await batchCreateProducts(products);
    res.json({ code: 200, message: '批量创建成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const updateProductHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await updateProduct(parseInt(id), req.body);
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const deleteProductHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProduct(parseInt(id));
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const getProductHistoryHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await getProductHistory(parseInt(id));
    res.json({ code: 200, message: '获取成功', data: history });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getUnassignedProductsHandler = async (req, res) => {
  try {
    const products = await getUnassignedProducts();
    res.json({ code: 200, message: '获取成功', data: products });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getMembersWithProductHandler = async (req, res) => {
  try {
    const members = await getMembersWithProduct();
    res.json({ code: 200, message: '获取成功', data: members });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

module.exports = { getProductsHandler, getProductByIdHandler, createProductHandler, batchCreateProductsHandler, updateProductHandler, deleteProductHandler, getProductHistoryHandler, getUnassignedProductsHandler, getMembersWithProductHandler };