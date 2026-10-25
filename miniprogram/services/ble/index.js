'use strict'

// BLE 入口：仅开发配置显式允许且本机开启模拟时，使用 mock。
// 预览与正式配置均走真实适配器，旧备份中的模拟开关不生效。

const mock = require('./mock-adapter')
const wechat = require('./wechat-adapter')
const config = require('../config')

function getAdapter(state) {
  const useMock = config.allowMockDevices === true && state && state.settings && state.settings.bleMock === true
  return useMock ? mock : wechat
}

module.exports = { getAdapter }
