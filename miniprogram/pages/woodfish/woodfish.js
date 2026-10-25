const { fmtNum } = require('../../utils/format')

const store = getApp().globalData.store

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

// ms -> "mm:ss"（超过 99 分钟时分钟位自然增长）
function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return pad2(Math.floor(total / 60)) + ':' + pad2(total % 60)
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
    tapping: false
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
    if (store.state.settings.phoneEnabled === false) {
      this.setData({ ready: false })
      wx.switchTab({ url: '/pages/today/today' })
      return
    }

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

    if (this.data.ended && !store.context('phone')) { this._active = true; this.refresh(); return }
    let ctx = store.context('phone')
    const current = ctx ? store.getPractice(ctx.practiceId) : null
    if (!ctx || !current) {
      store.startRound('phone', practices[0].id)
      ctx = store.context('phone')
    }

    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: true })
    this._active = true
    this._goalNotified = false
    this.refresh()
  },

  onHide() {
    this._active = false
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: false })
    this.stopTicker()
    require('../../services/audio').destroy()
  },

  onUnload() {
    this._active = false
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: false })
    require('../../services/audio').destroy()
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

    let todayText = `今日累计 ${fmtNum(total)} ${unit}`
    if (target !== null && target !== undefined && target > 0) {
      todayText += `｜今日目标 ${fmtNum(target)}${unit}`
    }

    const reminder = store.reminderRemaining('phone')
    if (!reminder) this._goalNotified = false

    this.setData({
      ready: true,
      sound: store.state.settings.sound !== false,
      theme: store.state.settings.theme || 'muyu',
      themeName: { muyu: '木鱼', lotus: '莲花', beads: '念珠' }[store.state.settings.theme || 'muyu'],
      ended: false,
      practiceName: practice.displayName || practice.name,
      unit,
      isTime,
      roundCount,
      roundText: fmtNum(roundCount),
      todayText,
      elapsedText: isTime ? fmtClock(store.elapsed('phone')) : '00:00',
      reminderText: reminder ? this.reminderTextOf(reminder) : ''
    })

    this.syncTicker(isTime, reminder)
    if (reminder && reminder.done) store.pulse()
  },

  reminderTextOf(reminder) {
    if (reminder.done) return '本座目标已达成'
    if (reminder.type === 'count') return `再计 ${fmtNum(reminder.remaining)} ${this.data.unit} 后提醒`
    return `距提醒 ${fmtClock(reminder.remainingMs)}`
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
      const text = fmtClock(store.elapsed('phone'))
      if (text !== this.data.elapsedText) this.setData({ elapsedText: text })
    }

    const reminder = store.reminderRemaining('phone')
    if (!reminder) {
      if (this.data.reminderText) this.setData({ reminderText: '' })
      return
    }
    const text = this.reminderTextOf(reminder)
    if (text !== this.data.reminderText) this.setData({ reminderText: text })
    if (reminder.done) store.pulse()
  },

  // —— 点按 ——
  onTapWoodfish() {
    if (store.state.settings.phoneEnabled === false || this.data.isTime || !store.context('phone')) return
    try {
      store.tap('phone')
    } catch (e) {
      return
    }
    store.pulse()
    this.playTapAnim()
    require('../../services/audio').play(store.state.settings)
    if (store.state.settings.vibrate && wx.vibrateShort && !store.getPractice(store.context('phone').practiceId).vibrateEvery) wx.vibrateShort({ type: 'light' })
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

  onEndRound() {
    const ctx = store.context('phone')
    if (!ctx) return
    const ms = Math.max(0, store.elapsed('phone'))
    try {
      store.endRound('phone')
    } catch (e) {
      return
    }
    this.stopTicker()
    this._goalNotified = false
    this.refresh()
    wx.showToast({ title: ms < 60000 ? '已记录本次静坐时长' : `已记录 ${Math.floor(ms / 60000)} 分钟`, icon: 'none' })
  },

  onStartNewSession() {
    if (store.state.settings.phoneEnabled === false) return
    const practices = store.practices()
    const id = this._lastPracticeId || (practices[0] && practices[0].id)
    if (!id) return
    try {
      store.startRound('phone', id)
    } catch (e) {
      return
    }
    this._goalNotified = false
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: true })
    this.refresh()
  },

  onSound() { store.setSetting('sound', !store.state.settings.sound); this.refresh() },

  onCancelReminder() { wx.showModal({title:'取消本轮提醒？',content:'仅取消提醒，本轮计数继续。',success:r=>{if(r.confirm)store.cancelReminder('phone')}}) },
  onSettings() {
    wx.navigateTo({ url: '/pages/phone-settings/phone-settings' })
  }
})
