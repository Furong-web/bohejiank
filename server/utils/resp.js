/** 统一响应格式 { code, msg, data } */
exports.ok = (res, data = null, msg = 'ok') => res.json({ code: 0, msg, data })
exports.fail = (res, msg = '操作失败', statusCode = 400) =>
  res.status(statusCode).json({ code: 1, msg })
