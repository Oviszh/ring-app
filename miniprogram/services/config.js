'use strict'

// 设备入口与真实硬件接入独立；模拟设备只能在开发测试中显式启用。
module.exports = { ringAvailable: true, allowMockDevices: false, version: '1.0.1' }
