'use strict'
const KEY = 'nianfo_state_v1'
function loadState() { return wx.getStorageSync(KEY) || null }
function saveState(state) { wx.setStorageSync(KEY, state) }
function saveRecovery(state) { wx.setStorageSync(KEY + '_before_restore', state) }
module.exports = { loadState, saveState, saveRecovery }
