'use strict'

// 真机 BLE 适配器（微信原生蓝牙 API）——硬件协议就绪后实现。
// 接口必须与 mock-adapter.js 完全一致，页面/服务层无感知切换。

const NOT_IMPLEMENTED = () => Promise.reject(new Error('BLE_NOT_IMPLEMENTED'))

module.exports = {
  kind: 'wechat',
  ready: false,
  scan: NOT_IMPLEMENTED,
  connect: NOT_IMPLEMENTED,
  disconnect: NOT_IMPLEMENTED,
  isConnected: () => false,
  readDeviceState: NOT_IMPLEMENTED,
  syncTime: NOT_IMPLEMENTED,
  writeOwnerToken: NOT_IMPLEMENTED,
  clearAllAndCreateEpoch: NOT_IMPLEMENTED,
  startNewRound: NOT_IMPLEMENTED,
  cancelReminder: NOT_IMPLEMENTED,
  setLocked: NOT_IMPLEMENTED,
  pullSnapshots: NOT_IMPLEMENTED
}
