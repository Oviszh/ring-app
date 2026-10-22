'use strict'

// 页面唯一数据入口：封装 domain（注入当前时间、自动持久化、变更通知）
// 用法：const store = getApp().globalData.store

const domain = require('./domain')
const { loadState, saveState } = require('./storage/local')

function createStore(now) {
  now = now || Date.now()
  let state = loadState()
  if (!state || state.schemaVersion !== 1) state = domain.createInitialState(now)
  domain.settleUpTo(state, now) // 启动补归档
  saveState(state)

  const listeners = []
  function commit() {
    saveState(state)
    for (const fn of listeners) fn()
  }

  return {
    get state() { return state },
    now() { return Date.now() },

    onChange(fn) {
      listeners.push(fn)
      return function off() {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },

    todayKey() {
      // 页面刷新时也会触发翻篇：过零点后即使用户没做任何写操作，日期仍能切过来。
      // 幂等——未 commit 时下次启动会重放同样的结算，结果一致。
      domain.settleUpTo(state, Date.now())
      return state.currentDay
    },

    // —— 计数 ——
    tap(side) {
      const r = domain.tap(state, side, Date.now())
      if (r.vibrate && wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      commit()
      return r
    },
    undoTap(side) {
      const r = domain.undoTap(state, side, Date.now())
      commit()
      return r
    },
    context(side) { return state.contexts[side] },
    startRound(side, practiceId, reminder) {
      domain.startNewRound(state, side, practiceId, { ts: Date.now(), reminder: reminder || null })
      commit()
    },
    cancelReminder(side) {
      domain.cancelReminder(state, side)
      commit()
    },
    endRound(side) {
      domain.endRound(state, side, Date.now())
      commit()
    },
    reminderRemaining(side) {
      return domain.reminderRemaining(state, side, Date.now())
    },

    // —— 功课 ——
    practices() {
      return state.practices.filter(p => !p.deleted).sort((a, b) => a.sort - b.sort)
    },
    getPractice(id) {
      return state.practices.find(p => p.id === id && !p.deleted) || null
    },
    addPractice(input) {
      const p = domain.createPractice(state, input, Date.now())
      commit()
      return p
    },
    setDailyTarget(practiceId, target) {
      domain.setDailyTarget(state, practiceId, target)
      commit()
    },
    removePractice(practiceId) {
      domain.removePractice(state, practiceId)
      commit()
    },

    // —— 填报 ——
    addEntry(input) {
      const e = domain.addEntry(state, Object.assign({}, input, { ts: Date.now() }))
      commit()
      return e
    },
    undoEntry(entryId) {
      domain.undoEntry(state, entryId)
      commit()
    },

    // —— 查询 ——
    dayTotals(date, practiceId) {
      return domain.dayTotals(state, date, practiceId, Date.now())
    }
  }
}

module.exports = { createStore }
