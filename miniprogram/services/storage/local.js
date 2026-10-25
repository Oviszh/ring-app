'use strict'
const KEY = 'nianfo_state_v1'
function loadState() { return wx.getStorageSync(KEY) || null }
function saveState(state) { wx.setStorageSync(KEY, state) }
function saveRecovery(state, ts) { wx.setStorageSync(KEY + '_before_restore', { state, savedAt: ts }) }
function loadRecovery() { return wx.getStorageSync(KEY + '_before_restore') || null }
module.exports = { loadState, saveState, saveRecovery, loadRecovery }
