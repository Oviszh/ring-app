'use strict'

// BLE 入口：按设置选择适配器。settings.bleMock = true（默认）→ 模拟戒指；
// 真机就绪后设为 false 走 wechat-adapter（接口一致）。

const mock = require('./mock-adapter')
const wechat = require('./wechat-adapter')

function getAdapter(state) {
  const useMock = !state || !state.settings || state.settings.bleMock !== false
  return useMock ? mock : wechat
}

module.exports = { getAdapter }
