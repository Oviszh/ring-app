const { fmtNum } = require('../../utils/format')

const store = getApp().globalData.store

const TIME_OPTIONS = [15, 30, 60]
const COUNT_OPTIONS = [108, 500, 1000]
const BTN_NONE = '开启新一轮（不设提醒）'

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

// ms -> "mm:ss"（超过 99 分钟时分钟位自然增长）
function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return pad2(Math.floor(total / 60)) + ':' + pad2(total % 60)
}

function sheetText(type, time, count) {
  if (type === 'time') return `开启新一轮 · ${time}分钟后提醒`
  if (type === 'count') return `开启新一轮 · ${count}声后提醒`
  return BTN_NONE
}

Page({
  data: {
    ready: false,
    ended: false,
    practiceName: '',
    unit: '声',
    isTime: false,
    roundText: '0',
    roundCount: 0,
    todayText: '',
    elapsedText: '00:00',
    reminderText: '',
    tapping: false,
    showSheet: false,
    reminderType: 'none',
    reminderTime: 30,
    reminderCount: 500,
    sheetBtnText: BTN_NONE,
    timeOptions: TIME_OPTIONS,
    countOptions: COUNT_OPTIONS
  },

  onLoad() {
    this._active = false
    this._off = store.onChange(() => {
      if (this._active) this.refresh()
    })
  },

  onShow() {
    this._active = false
    clearTimeout(this._backTimer)

    const practices = store.practices()
    if (!practices.length) {
      wx.showToast({ title: '请先添加功课', icon: 'none' })
      this._backTimer = setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail() { wx.switchTab({ url: '/pages/today/today' }) }
        })
      }, 800)
      return
    }

    let ctx = store.context('phone')
    const current = ctx ? store.getPractice(ctx.practiceId) : null
    if (!ctx || !current) {
      store.startRound('phone', practices[0].id)
      ctx = store.context('phone')
    }

    this._active = true
    this._goalNotified = false
    this.refresh()
  },

  onHide() {
    this._active = false
    this.stopTicker()
  },

  onUnload() {
    this._active = false
    if (this._off) this._off()
    this.stopTicker()
    clearTimeout(this._backTimer)
    clearTimeout(this._tapOn)
    clearTimeout(this._tapOff)
  },

  // —— view-model ——
  refresh() {
    if (!this._active) return

    const ctx = store.context('phone')
    if (!ctx) {
      this.stopTicker()
      const p = (this._lastPracticeId && store.getPractice(this._lastPracticeId)) || store.practices()[0]
      this.setData({
        ready: true,
        ended: true,
        practiceName: p ? (p.displayName || p.name) : '',
        unit: p ? (p.unit || '声') : '声',
        isTime: p ? p.type === 'time' : false,
        reminderText: ''
      })
      return
    }

    const practice = store.getPractice(ctx.practiceId)
    if (!practice) {
      this.stopTicker()
      this.setData({ ready: true, ended: true, reminderText: '' })
      return
    }

    this._lastPracticeId = practice.id
    this._ctxPracticeId = practice.id

    const unit = practice.unit || '声'
    const isTime = practice.type === 'time'
    const roundCount = ctx.roundCount || 0
    const totals = store.dayTotals(store.todayKey(), practice.id)
    const total = totals ? totals.total : 0
    const target = totals ? totals.target : null

    let todayText = `今日累积 ${fmtNum(total)} ${unit}`
    if (target !== null && target !== undefined && target > 0) {
      todayText += `｜今日目标 ${fmtNum(target)}${unit}`
    }

    const reminder = store.reminderRemaining('phone')
    if (!reminder) this._goalNotified = false

    this.setData({
      ready: true,
      ended: false,
      practiceName: practice.displayName || practice.name,
      unit,
      isTime,
      roundCount,
      roundText: fmtNum(roundCount),
      todayText,
      elapsedText: isTime ? fmtClock(Date.now() - ctx.startTs) : '00:00',
      reminderText: reminder ? this.reminderTextOf(reminder) : ''
    })

    this.syncTicker(isTime, reminder)
    if (reminder && reminder.done) this.handleGoalDone(reminder)
  },

  reminderTextOf(reminder) {
    if (reminder.type === 'count') return `⏱ 提醒目标生效中 · 剩 ${reminder.remaining} 声`
    return `⏱ 提醒目标生效中 · 剩 ${fmtClock(reminder.remainingMs)}`
  },

  syncTicker(isTime, reminder) {
    if (isTime || (reminder && reminder.type === 'time')) this.startTicker()
    else this.stopTicker()
  },

  startTicker() {
    if (this._ticker) return
    this._ticker = setInterval(() => this.tick(), 1000)
  },

  stopTicker() {
    if (this._ticker) {
      clearInterval(this._ticker)
      this._ticker = null
    }
  },

  tick() {
    if (!this._active) return
    const ctx = store.context('phone')
    if (!ctx) {
      this.stopTicker()
      return
    }

    const practice = store.getPractice(ctx.practiceId)
    if (practice && practice.type === 'time') {
      const text = fmtClock(Date.now() - ctx.startTs)
      if (text !== this.data.elapsedText) this.setData({ elapsedText: text })
    }

    const reminder = store.reminderRemaining('phone')
    if (!reminder) {
      if (this.data.reminderText) this.setData({ reminderText: '' })
      return
    }
    const text = this.reminderTextOf(reminder)
    if (text !== this.data.reminderText) this.setData({ reminderText: text })
    if (reminder.done) this.handleGoalDone(reminder)
  },

  handleGoalDone(reminder) {
    if (this._goalNotified) return
    this._goalNotified = true

    const ctx = store.context('phone')
    if (!ctx) return
    const count = ctx.roundCount || 0
    const minutes = ctx.reminder ? ctx.reminder.value : 0
    const content = reminder.type === 'count' ? `本次念了 ${count} 声` : `已念满 ${minutes} 分钟`

    if (wx.vibrateLong) wx.vibrateLong()
    wx.showModal({
      title: '目标达成',
      content,
      showCancel: false,
      confirmText: '知道了',
      complete() {
        try { store.cancelReminder('phone') } catch (e) {}
      }
    })
  },

  // —— 点按 ——
  onTapWoodfish() {
    if (!store.context('phone')) return
    try {
      store.tap('phone')
    } catch (e) {
      return
    }
    this.playTapAnim()
    if (store.state.settings.vibrate && wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },

  playTapAnim() {
    clearTimeout(this._tapOn)
    clearTimeout(this._tapOff)
    this.setData({ tapping: false })
    this._tapOn = setTimeout(() => {
      this.setData({ tapping: true })
      this._tapOff = setTimeout(() => this.setData({ tapping: false }), 140)
    }, 16)
  },

  onUndo() {
    const ctx = store.context('phone')
    if (!ctx) return
    const practice = store.getPractice(ctx.practiceId)
    if (!practice || practice.type === 'time') return

    const doUndo = () => {
      let r
      try {
        r = store.undoTap('phone')
      } catch (e) {
        return
      }
      if (!r || !r.undone) wx.showToast({ title: '本轮已是 0', icon: 'none' })
    }

    if (store.state.settings.undoConfirm) {
      wx.showModal({
        title: '撤销一次？',
        content: '本轮计数与今日累积各减 1。',
        confirmText: '撤销',
        cancelText: '取消',
        success(res) { if (res.confirm) doUndo() }
      })
    } else {
      doUndo()
    }
  },

  onEndRound() {
    const ctx = store.context('phone')
    if (!ctx) return
    const ms = Math.max(0, Date.now() - ctx.startTs)
    try {
      store.endRound('phone')
    } catch (e) {
      return
    }
    this.stopTicker()
    this._goalNotified = false
    this.refresh()
    wx.showToast({ title: `已记录 ${Math.round(ms / 60000)} 分钟`, icon: 'none' })
  },

  onStartNewSession() {
    const practices = store.practices()
    const id = this._lastPracticeId || (practices[0] && practices[0].id)
    if (!id) return
    try {
      store.startRound('phone', id)
    } catch (e) {
      return
    }
    this._goalNotified = false
    this.refresh()
  },

  // —— E1 提醒目标弹层 ——
  onOpenSheet() {
    const last = this.readLastReminder()
    this.setData({
      showSheet: true,
      reminderType: last.type,
      reminderTime: last.time,
      reminderCount: last.count,
      sheetBtnText: sheetText(last.type, last.time, last.count)
    })
  },

  readLastReminder() {
    let saved = null
    try {
      saved = wx.getStorageSync('reminder_last')
    } catch (e) {
      saved = null
    }
    const type = saved && (saved.type === 'time' || saved.type === 'count') ? saved.type : 'none'
    const value = saved ? Number(saved.value) : 0
    const time = type === 'time' && TIME_OPTIONS.indexOf(value) >= 0 ? value : 30
    const count = type === 'count' && COUNT_OPTIONS.indexOf(value) >= 0 ? value : 500
    return { type, time, count }
  },

  onPickReminderType(e) {
    const type = e.currentTarget.dataset.type
    this.updateSheet(type, this.data.reminderTime, this.data.reminderCount)
  },

  onPickReminderTime(e) {
    this.updateSheet('time', Number(e.currentTarget.dataset.value), this.data.reminderCount)
  },

  onPickReminderCount(e) {
    this.updateSheet('count', this.data.reminderTime, Number(e.currentTarget.dataset.value))
  },

  updateSheet(type, time, count) {
    this.setData({
      reminderType: type,
      reminderTime: time,
      reminderCount: count,
      sheetBtnText: sheetText(type, time, count)
    })
  },

  closeSheet() {
    this.setData({ showSheet: false })
  },

  noop() {},

  onConfirmRound() {
    const pid = this._ctxPracticeId || this._lastPracticeId
    if (!pid) {
      this.closeSheet()
      return
    }

    const type = this.data.reminderType
    const time = this.data.reminderTime
    const count = this.data.reminderCount
    const reminder = type === 'time'
      ? { type: 'time', value: time }
      : type === 'count' ? { type: 'count', value: count } : null

    try {
      wx.setStorageSync('reminder_last', type === 'none'
        ? { type: 'none', value: 0 }
        : { type, value: type === 'time' ? time : count })
    } catch (e) {}

    const start = () => {
      try {
        store.startRound('phone', pid, reminder)
      } catch (e) {
        return
      }
      this._goalNotified = false
      this.setData({ showSheet: false })
      this.refresh()
    }

    const ctx = store.context('phone')
    if (ctx && ctx.roundCount > 0) {
      wx.showModal({
        title: '重新一轮？',
        content: '本轮计数将清零，今日累积不受影响。',
        confirmText: '确认',
        cancelText: '取消',
        success(res) { if (res.confirm) start() }
      })
    } else {
      start()
    }
  },

  onSound() {
    wx.showToast({ title: '音效开发中', icon: 'none' })
  },

  onSettings() {
    wx.showToast({ title: '设置开发中', icon: 'none' })
  }
})
