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
    homePractices() {
      return this.practices().filter(p => p.showOnHome)
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
    setDisplayName(practiceId, name) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      p.displayName = name || ''
      commit()
    },
    setVibrateEvery(practiceId, n) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      p.vibrateEvery = n > 0 ? Math.floor(n) : 0
      commit()
    },
    setShowOnHome(practiceId, show) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      p.showOnHome = !!show
      commit()
    },
    reorderPractices(orderedIds) {
      orderedIds.forEach((id, i) => {
        const p = state.practices.find(x => x.id === id)
        if (p) p.sort = i
      })
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
    entriesFor(date, practiceId) {
      return state.entries
        .filter(e => e.date === date && e.practiceId === practiceId && !e.tombstone)
        .sort((a, b) => a.createdAt - b.createdAt)
    },

    // —— 修正 ——
    sourceTotal(date, practiceId, source) {
      return domain.sourceTotal(state, date, practiceId, source)
    },
    addAdjustment(input) {
      const a = domain.addAdjustment(state, Object.assign({}, input, { ts: Date.now() }))
      commit()
      return a
    },
    undoAdjustment(adjustmentId) {
      domain.undoAdjustment(state, adjustmentId)
      commit()
    },
    adjustmentsFor(date, practiceId) {
      return state.adjustments
        .filter(a => a.date === date && a.practiceId === practiceId && !a.restored)
        .sort((a, b) => a.createdAt - b.createdAt)
    },

    // —— 大愿 ——
    vows() {
      return state.vows.slice()
    },
    createVow(input) {
      const v = domain.createVow(state, input, Date.now())
      commit()
      return v
    },
    updateVow(vowId, patch) {
      const v = state.vows.find(x => x.id === vowId)
      if (!v) throw new Error('NO_VOW')
      if (patch.name !== undefined) v.name = patch.name
      if (patch.targetTotal !== undefined) {
        if (!(patch.targetTotal > 0)) throw new Error('TARGET_POSITIVE')
        v.targetTotal = patch.targetTotal
      }
      if (patch.deadline !== undefined) v.deadline = patch.deadline
      if (patch.existingTotal !== undefined) v.existingTotal = patch.existingTotal
      commit()
    },
    removeVow(vowId) {
      domain.removeVow(state, vowId)
      commit()
    },
    vowProgress(vowId) {
      const v = state.vows.find(x => x.id === vowId)
      if (!v) return null
      return domain.vowProgress(state, v, Date.now())
    },

    // —— 设置 ——
    setSetting(key, value) {
      state.settings[key] = value
      commit()
    },

    // —— 查询 ——
    dayTotals(date, practiceId) {
      return domain.dayTotals(state, date, practiceId, Date.now())
    },
    calendarDayStatus(date) {
      return domain.calendarDayStatus(state, date)
    },
    practiceTotalsAll(practiceId) {
      return domain.practiceTotalsAll(state, practiceId, Date.now())
    },
    recentDayStatuses(practiceId, n) {
      // 最近 n 天（含今天，倒序）的日状态列表 [{date, status}]
      const out = []
      for (let i = n - 1; i >= 0; i--) {
        const date = domain.addDays(state.currentDay, -i)
        const t = domain.dayTotals(state, date, practiceId)
        out.push({ date, status: t ? t.status : 'none' })
      }
      return out
    }
  }
}

module.exports = { createStore }
