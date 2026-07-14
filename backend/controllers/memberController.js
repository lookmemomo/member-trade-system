const { getMemberList, getMemberById, updateMember, adjustPoints, adjustRewardValue, bindProduct } = require('../services/memberService');

const getMembersHandler = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query;
    const result = await getMemberList(parseInt(page), parseInt(pageSize), keyword);
    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const getMemberByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await getMemberById(parseInt(id));
    if (!member) {
      return res.status(404).json({ code: 404, message: '会员不存在' });
    }
    res.json({ code: 200, message: '获取成功', data: member });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
};

const updateMemberHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await updateMember(parseInt(id), req.body, req.user.id);
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const adjustPointsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    if (!amount || amount === 0) {
      return res.status(400).json({ code: 400, message: '变动金额不能为空且不能为0' });
    }
    const result = await adjustPoints(parseInt(id), amount, description, req.user.id);
    res.json({ code: 200, message: '调整成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const adjustRewardValueHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    if (!amount) {
      return res.status(400).json({ code: 400, message: '变动金额不能为空' });
    }
    const result = await adjustRewardValue(parseInt(id), amount, description, req.user.id);
    res.json({ code: 200, message: '调整成功', data: result });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

const bindProductHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ code: 400, message: '产品ID不能为空' });
    }
    await bindProduct(parseInt(id), parseInt(productId));
    res.json({ code: 200, message: '绑定成功' });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

module.exports = { getMembersHandler, getMemberByIdHandler, updateMemberHandler, adjustPointsHandler, adjustRewardValueHandler, bindProductHandler };