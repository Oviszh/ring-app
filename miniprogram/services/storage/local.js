'use strict'

// 本地缓存封装（wx 层；domain 保持纯 JS 不依赖 wx）
const KEY = 'nianfo_state_v1'

function loadState() {
  try {
    const s = wx.getStorageSync(KEY)
    return s || null
  } catch (e) {
    return null
  }
}

function saveState(state) {
  try {
    wx.setStorageSync(KEY, state)
  } catch (e) {
    // 缓存失败不阻塞使用；下次启动仍在
  }
}

module.exports = { loadState, saveState }
