'use strict'

const { sourceText, fmtNum, fmtMinutes } = require('../../utils/format')
const { displayVowName } = require('../../utils/vow-name')

const store = getApp().globalData.store
const TIME_OPTIONS = [{ value: 35, name: '一柱香' }, { value: 15, name: '15 分钟' }, { value: 30, name: '30 分钟' }]
const COUNT_OPTIONS = [108, 500, 1000]
const STATUS_SYMBOL = { met: '●', partial: '◐', missed: '○', none: '·' }

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return pad2(Math.floor(total / 60)) + ':' + pad2(total % 60)
}

function displayNameOf(practice) {
  return practice ? (practice.displayName || practice.name) : ''
}

Page({
  data: {
    ready: false,
    side: 'phone', ringEnabled: true, phoneEnabled: true, countAvailable: true,
    entryVisible: false,
    practiceId: '',
    practiceName: '',
    isTime: false,
    unit: '声',

    statusText: '',
    statusActive: false,
    reminderText: '',
    roundCount: 0,

    totalText: '0',
    targetText: '',
    hasTarget: false,
    percent: 0,
    barStyle: 'width: 0%;',
    breakdownText: '',


    vow: null,
    recentDays: [],

    showSheet: false,
    reminderType: 'time',
    reminderTime: 35,
    reminderTimeCustom: false,
    reminderCount: 500,
    reminderError: '',
    timeOptions: TIME_OPTIONS,
    countOptions: COUNT_OPTIONS
  },

  onLoad(options) {
    this._id = options && options.id
    const settings = store.state.settings
    const requested = options && options.side
    this.setData({ side: requested === 'ring' && settings.ringEnabled !== false ? 'ring' : settings.phoneEnabled !== false ? 'phone' : 'ring' })
    this._active = false

    const last = this.readLastReminder()
    this.setData({
      reminderType: last.type,
      reminderTime: last.time,
      reminderTimeCustom: !TIME_OPTIONS.some(o => o.value === last.time),
      reminderCount: last.count
    })

    this._off = store.onChange(() => {
      if (this._active) this.refresh()
    })

    if (!this._id) {
      this.leaveMissing('功课不存在')
      return
    }
    const practice = store.getPractice(this._id)
    if (!practice) {
      this.leaveMissing('功课不存在')
      return
    }
    wx.setNavigationBarTitle({ title: displayNameOf(practice) })
  },

  onShow() {
    if (!this._id) return
    const practice = store.getPractice(this._id)
    if (!practice) {
      this.leaveMissing('功课已被删除')
      return
    }
    this._active = true
    this._starting = false
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
    clearTimeout(this._leaveTimer)
  },

  leaveMissing(message) {
    if (this._backTimer) return
    wx.showToast({ title: message, icon: 'none' })
    this._backTimer = setTimeout(() => {
      wx.navigateBack({
        delta: 1,
        fail() { wx.switchTab({ url: '/pages/today/today' }) }
      })
    }, 800)
  },

  refresh() {
    if (!this._active) return

    const practice = store.getPractice(this._id)
    if (!practice) {
      this.leaveMissing('功课已被删除')
      return
    }

    const settings = store.state.settings
    const ringEnabled = settings.ringEnabled !== false
    const phoneEnabled = settings.phoneEnabled !== false
    if (this.data.side === 'ring' && !ringEnabled && phoneEnabled) this.setData({ side: 'phone' })
    if (this.data.side === 'phone' && !phoneEnabled && ringEnabled) this.setData({ side: 'ring' })
    const today = store.todayKey()
    const totals = store.dayTotals(today, this._id)
    const storedCtx = store.context(this.data.side)
    const device = store.currentDevice()
    const ctx = this.data.side === 'ring' && (!device || device.ownerMismatch || (storedCtx && storedCtx.deviceId && storedCtx.deviceId !== device.id)) ? null : storedCtx
    const isCurrent = !!ctx && ctx.practiceId === practice.id
    const isTime = practice.type === 'time'
    const unit = isTime ? '分钟' : (practice.unit || '声')
    const reminder = store.reminderRemaining(this.data.side)
    const myReminder = isCurrent ? reminder : null
    const roundCount = isCurrent ? (ctx.roundCount || 0) : 0

    let statusText
    if (this.data.side === 'ring' && !device) {
      statusText = '未绑定设备'
    } else if (this.data.side === 'ring' && device.ownerMismatch) {
      statusText = '设备绑定关系已变更'
    } else if (isCurrent) {
      statusText = isTime
        ? `静坐中 · 已计 ${Math.max(0, Math.floor(store.elapsed(this.data.side) / 60000))} 分钟`
        : `本轮已计 ${fmtNum(roundCount)} ${unit}`
    } else if (ctx) {
      const other = store.getPractice(ctx.practiceId)
      statusText = `正在记录：${displayNameOf(other) || '其他功课'}`
    } else {
      statusText = '尚未开始本轮'
    }

    const totalsView = this.totalsView(totals, isTime)
    const reminderText = this.reminderTextOf(ctx, myReminder, unit)
    if (myReminder) statusText = isTime
      ? `一座专修已计 ${fmtMinutes(store.elapsed(this.data.side) / 60000)}`
      : `一座专修已计 ${fmtNum(roundCount)} ${unit}`

    const latestVow = this.latestVowOf(practice.id)
    let vow = null
    if (latestVow) {
      const progress = store.vowProgress(latestVow.id)
      if (progress) {
        vow = {
          id: latestVow.id,
          name: displayVowName(latestVow, practice),
          totalText: fmtNum(progress.total),
          targetText: fmtNum(progress.target),
          percent: progress.percent,
          barStyle: `width: ${progress.percent}%;`,
          avgText: `${fmtNum(progress.avgPerDay)}${unit}`
        }
      }
    }

    const recent = store.recentDayStatuses(practice.id, 7)
    const recentDays = recent.map((row, index) => ({
      date: row.date,
      status: row.status,
      symbol: STATUS_SYMBOL[row.status] || '·',
      label: index === recent.length - 1 ? '今' : String(Number(row.date.slice(8)))
    }))

    this.setData({
      ready: true,
      ringEnabled, phoneEnabled, countAvailable: ringEnabled || phoneEnabled,
      practiceId: practice.id,
      practiceName: displayNameOf(practice),
      isTime,
      unit,
      statusText,
      statusActive: isCurrent,
      reminderText: myReminder ? reminderText : '',
      roundCount,
      totalText: totalsView.totalText,
      targetText: totalsView.targetText,
      hasTarget: totalsView.hasTarget,
      percent: totalsView.percent,
      barStyle: totalsView.barStyle,
      breakdownText: totalsView.breakdownText,
      vow,
      recentDays
    })

    wx.setNavigationBarTitle({ title: displayNameOf(practice) })

    const needTicker = (isCurrent && isTime) || !!(myReminder && myReminder.type === 'time' && !myReminder.done)
    if (needTicker) this.startTicker()
    else this.stopTicker()
  },

  totalsView(totals, isTime) {
    if (!totals) {
      return {
        totalText: '0',
        targetText: '',
        hasTarget: false,
        percent: 0,
        barStyle: 'width: 0%;',
        breakdownText: isTime ? '今日 0分钟 · 0座' : ''
      }
    }

    const target = totals.target
    const hasTarget = target !== null && target !== undefined && target > 0
    const total = totals.total || 0
    const percent = hasTarget ? Math.min(100, Math.round((total / target) * 100)) : 0

    return {
      totalText: fmtNum(total),
      targetText: hasTarget ? fmtNum(target) : '',
      hasTarget,
      percent,
      barStyle: `width: ${percent}%;`,
      breakdownText: isTime
        ? `今日 ${fmtMinutes(totals.durationMin)} · ${fmtNum(totals.times)}座`
        : sourceText(totals)
    }
  },

  reminderTextOf(ctx, reminder, unit = this.data.unit) {
    if (!ctx || !reminder) return ''
    if (reminder.done) return '本座目标已达成'
    if (reminder.type === 'count') {
      return `距结束还差 ${fmtNum(reminder.remaining)} ${unit}`
    }
    return `距结束 ${fmtClock(reminder.remainingMs)}`
  },

  latestVowOf(practiceId) {
    const vows = store.vows().filter(v => v.practiceId === practiceId)
    let latest = null
    for (const vow of vows) {
      if (!latest || (vow.createdAt || 0) >= (latest.createdAt || 0)) latest = vow
    }
    return latest
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
    const ctx = store.context(this.data.side)
    if (!ctx || ctx.practiceId !== this._id) {
      this.stopTicker()
      return
    }

    const practice = store.getPractice(this._id)
    if (!practice) {
      this.stopTicker()
      return
    }

    const isTime = practice.type === 'time'
    const reminder = store.reminderRemaining(this.data.side)

    let statusText = this.data.statusText
    if (isTime) {
      const minutes = Math.max(0, Math.floor((store.elapsed(this.data.side)) / 60000))
      statusText = `静坐中 · 已计 ${minutes} 分钟`
    }

    let reminderText = ''
    if (reminder) reminderText = this.reminderTextOf(ctx, reminder)
    if (reminder) statusText = isTime
      ? `一座专修已计 ${fmtMinutes(store.elapsed(this.data.side) / 60000)}`
      : `一座专修已计 ${fmtNum(ctx.roundCount || 0)} ${this.data.unit}`

    const patch = { statusText, reminderText }
    if (isTime) {
      const totals = store.dayTotals(store.todayKey(), this._id)
      const totalsView = this.totalsView(totals, true)
      patch.totalText = totalsView.totalText
      patch.targetText = totalsView.targetText
      patch.hasTarget = totalsView.hasTarget
      patch.percent = totalsView.percent
      patch.barStyle = totalsView.barStyle
      patch.breakdownText = totalsView.breakdownText
    }

    this.setData(patch)
    const keepTicker = isTime || !!(reminder && reminder.type === 'time' && !reminder.done)
    if (!keepTicker) this.stopTicker()
  },

  // —— 跳转 ——

  onCountSide(e) {
    const side = e.currentTarget.dataset.side
    if (!['ring', 'phone'].includes(side)) return
    if (side === 'ring' && !this.data.ringEnabled || side === 'phone' && !this.data.phoneEnabled) return
    this.setData({ side }); this.refresh()
  },
  openEntry() { this.setData({ entryVisible: true }) },
  closeEntry() { this.setData({ entryVisible: false }) },
  onEntrySaved() { this.refresh() },
  onContinue() {
    const ctx = store.context(this.data.side)
    if (!this.data.countAvailable) return
    if (this.data.side === 'ring' && !store.currentDevice()) { wx.navigateTo({ url: '/pages/device-bind/device-bind' }); return }
    if (ctx && ctx.practiceId === this._id) {
      const device = store.currentDevice()
      wx.navigateTo({ url: this.data.side === 'ring' ? '/pages/device-detail/device-detail?id=' + device.id : '/pages/woodfish/woodfish' })
      return
    }
    this.onStartRound({ plain: true })
  },
  onMore() {
    wx.navigateTo({ url: `/pages/practice-settings/practice-settings?id=${this._id}` })
  },

  onSettings() {
    this.onMore()
  },

  onHistory() {
    getApp().globalData.calendarPid = this._id
    wx.switchTab({ url: '/pages/calendar/calendar' })
  },

  onVowTap() {
    if (!this.data.vow) return
    wx.navigateTo({ url: `/pages/vow-detail/vow-detail?id=${this.data.vow.id}` })
  },

  onCreateVow() {
    wx.navigateTo({ url: `/pages/vow-new/vow-new?pid=${this._id}` })
  },

  // —— 提醒目标 ——

  onCancelReminder() {
    const side = this.data.side
    const ctx = store.context(side)
    if (!ctx || ctx.practiceId !== this._id || !ctx.reminder || this._endingSession) return
    this._endingSession = true
    wx.showModal({ title: '结束本座专修？', content: '已累计的计数会保留。', success: async r => {
      if (!r.confirm) { this._endingSession = false; return }
      try {
        if (store.context(side) !== ctx) return
        if (side === 'ring') await store.ringCancelReminder()
        else if ((store.getPractice(ctx.practiceId) || {}).type === 'time') store.endRound(side)
        else store.cancelReminder(side)
        wx.showToast({ title: '已结束本座专修', icon: 'none' })
      } catch (e) { wx.showToast({ title: side === 'ring' ? '设备未连接，请连接后重试' : '结束失败，请重试', icon: 'none' }) }
      finally { this._endingSession = false; this.refresh() }
    }, fail: () => { this._endingSession = false }
    })
  },

  onOpenSheet() {
    const last = this.readLastReminder()
    this.setData({ showSheet: true, reminderType: last.type, reminderTime: last.time, reminderTimeCustom: !TIME_OPTIONS.some(o => o.value === last.time), reminderCount: last.count, reminderError: '' })
  },

  readLastReminder() {
    const saved = store.lastReminder() || {}
    const timeOnly = this.data.isTime || (this._id && (store.getPractice(this._id) || {}).type === 'time')
    const valid = value => Number.isSafeInteger(value) && value > 0
    const type = saved.type === 'count' && !timeOnly && valid(saved.value) ? 'count' : 'time'
    return {
      type,
      time: saved.type === 'time' && valid(saved.value) && Number.isSafeInteger(saved.value * 60000) ? saved.value : 35,
      count: saved.type === 'count' && valid(saved.value) ? saved.value : 500
    }
  },

  onPickReminderType(e) {
    const type = e.currentTarget.dataset.type
    if (!['time', 'count'].includes(type) || (this.data.isTime && type === 'count')) return
    this.setData({ reminderType: type, reminderError: '' })
  },
  onPickReminderTime(e) {
    const custom = e.currentTarget.dataset.custom === true || e.currentTarget.dataset.custom === 'true'
    this.setData({ reminderType: 'time', reminderTimeCustom: custom, reminderTime: custom ? this.data.reminderTime : Number(e.currentTarget.dataset.value), reminderError: '' })
  },
  onPickReminderCount(e) { this.setData({ reminderType: 'count', reminderCount: Number(e.currentTarget.dataset.value), reminderError: '' }) },
  onCustomTime(e) { this.setData({ reminderTime: e.detail.value, reminderTimeCustom: true, reminderError: '' }) },
  onCustomCount(e) { this.setData({ reminderCount: e.detail.value, reminderError: '' }) },
  closeSheet() { if (!this._starting) this.setData({ showSheet: false }) },
  noop() {},

  onStartRound(options) {
    if (this._starting || !this.data.countAvailable) return
    if (this.data.side === 'ring' && !store.currentDevice()) { wx.navigateTo({ url: '/pages/device-bind/device-bind' }); return }
    const dedicated = !(options && options.plain === true)
    let reminder = null
    if (dedicated) {
      const type = this.data.reminderType
      const value = Number(type === 'time' ? this.data.reminderTime : this.data.reminderCount)
      if (!['time', 'count'].includes(type) || (this.data.isTime && type === 'count') || !Number.isSafeInteger(value) || value <= 0 || (type === 'time' && !Number.isSafeInteger(value * 60000))) {
        this.setData({ reminderError: type === 'time' ? '请填写大于 0 的整数分钟数' : '请填写大于 0 的整数次数' })
        return
      }
      reminder = { type, value }
    }
    const side = this.data.side
    const practiceId = this._id
    this._starting = true
    const start = async () => {
      try {
        if (side === 'ring') await store.ringStartRound(practiceId, reminder)
        else store.startRound('phone', practiceId, reminder)
      } catch (e) {
        this._starting = false
        wx.showToast({ title: side === 'ring' ? '设备未连接，请连接后重试' : '开启失败，请重试', icon: 'none' })
        return
      }
      if (dedicated) {
        try { store.saveReminder(reminder) } catch (e) {}
      }
      this.setData({ showSheet: false, reminderError: '' })
      this._starting = false
      if (dedicated) wx.showToast({ title: '已开始专修', icon: 'none' })
      if (side === 'phone') wx.navigateTo({ url: '/pages/woodfish/woodfish' })
      else this.refresh()
    }
    const ctx = store.context(side)
    if (ctx && (ctx.roundCount > 0 || ctx.reminder || (store.getPractice(ctx.practiceId) || {}).type === 'time')) {
      wx.showModal({
        title: dedicated ? '开始新一轮？' : (this.data.isTime ? '开始静坐？' : '开始计数？'),
        content: dedicated ? '本轮将重新计数，已累计的计数会保留。' : '',
        confirmText: '确认', cancelText: '取消',
        success: res => { if (res.confirm) start(); else this._starting = false },
        fail: () => { this._starting = false }
      })
    } else start()
  }
})
