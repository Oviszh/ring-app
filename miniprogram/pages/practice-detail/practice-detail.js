'use strict'

const { fmtNum, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store
const SIDE = 'phone'
const TIME_OPTIONS = [15, 30, 60]
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

function reminderRowTextOf(type, time, count) {
  if (type === 'time') return `${time}分钟后`
  if (type === 'count') return `${count}声后`
  return '不限'
}

function mainBtnTextOf(isTime, type, time, count) {
  const base = isTime ? '开始计时' : '开启新一轮'
  if (type === 'time') return `${base} · ${time}分钟后提醒`
  if (type === 'count') return `${base} · ${count}声后提醒`
  return isTime ? base : `${base}（不设提醒）`
}

Page({
  data: {
    ready: false,
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
    breakdownText: '戒指 0 · 手机 0 · 手动 0',

    cardTitle: '▶ 开启新一轮计数',
    mainBtnText: '开启新一轮（不设提醒）',
    reminderRowText: '不限',

    vow: null,
    recentDays: [],

    showSheet: false,
    reminderType: 'none',
    reminderTime: 30,
    reminderCount: 500,
    sheetBtnText: '开启新一轮（不设提醒）',
    timeOptions: TIME_OPTIONS,
    countOptions: COUNT_OPTIONS
  },

  onLoad(options) {
    this._id = options && options.id
    this._active = false

    const last = this.readLastReminder()
    this.setData({
      reminderType: last.type,
      reminderTime: last.time,
      reminderCount: last.count,
      reminderRowText: reminderRowTextOf(last.type, last.time, last.count)
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

    const today = store.todayKey()
    const totals = store.dayTotals(today, this._id)
    const ctx = store.context(SIDE)
    const isCurrent = !!ctx && ctx.practiceId === practice.id
    const isTime = practice.type === 'time'
    const unit = isTime ? '分钟' : (practice.unit || '声')
    const reminder = store.reminderRemaining(SIDE)
    const myReminder = isCurrent ? reminder : null
    const roundCount = isCurrent ? (ctx.roundCount || 0) : 0

    let statusText
    if (isCurrent) {
      statusText = isTime
        ? `● 本轮计时中 · 手机 · 已计 ${Math.max(0, Math.floor((store.elapsed('phone')) / 60000))}分钟`
        : `● 本轮计数中 · 手机 · 已计 ${fmtNum(roundCount)}`
    } else if (ctx) {
      const other = store.getPractice(ctx.practiceId)
      statusText = `○ 当前在「${displayNameOf(other) || '其他功课'}」计数（手机）`
    } else {
      statusText = '○ 当前未在手机计数'
    }

    const totalsView = this.totalsView(totals, isTime)
    const reminderText = this.reminderTextOf(ctx, myReminder)

    const latestVow = this.latestVowOf(practice.id)
    let vow = null
    if (latestVow) {
      const progress = store.vowProgress(latestVow.id)
      if (progress) {
        vow = {
          id: latestVow.id,
          name: latestVow.name || '大愿',
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

    const cardTitle = isTime
      ? (isCurrent ? '⟳ 重新开始计时' : '▶ 开始计时')
      : (isCurrent ? '⟳ 重新一轮（可设提醒目标）' : '▶ 开启新一轮计数')
    const mainBtnText = mainBtnTextOf(
      isTime,
      this.data.reminderType,
      this.data.reminderTime,
      this.data.reminderCount
    )

    this.setData({
      ready: true,
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
      breakdownText: totalsView.breakdownText,
      cardTitle,
      mainBtnText,
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
        breakdownText: isTime ? '今日 0分钟 · 0座' : '戒指 0 · 手机 0 · 手动 0'
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
      breakdownText: isTime
        ? `今日 ${fmtMinutes(totals.durationMin)} · ${fmtNum(totals.times)}座`
        : `戒指 ${fmtNum(totals.ring)} · 手机 ${fmtNum(totals.phone)} · 手动 ${fmtNum(totals.manual)}`
    }
  },

  reminderTextOf(ctx, reminder) {
    if (!ctx || !reminder) return ''
    const value = ctx.reminder ? ctx.reminder.value : 0
    if (reminder.type === 'count') {
      return `⏱ ${fmtNum(value)}声目标·已念${fmtNum(ctx.roundCount || 0)}·剩${fmtNum(reminder.remaining)}`
    }
    return `⏱ ${fmtNum(value)}分钟·剩${fmtClock(reminder.remainingMs)}`
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
    const ctx = store.context(SIDE)
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
    const reminder = store.reminderRemaining(SIDE)

    let statusText = this.data.statusText
    if (isTime) {
      const minutes = Math.max(0, Math.floor((store.elapsed('phone')) / 60000))
      statusText = `● 本轮计时中 · 手机 · 已计 ${minutes}分钟`
    }

    let reminderText = ''
    if (reminder) reminderText = this.reminderTextOf(ctx, reminder)

    const patch = { statusText, reminderText }
    if (isTime) {
      const totals = store.dayTotals(store.todayKey(), this._id)
      const totalsView = this.totalsView(totals, true)
      patch.totalText = totalsView.totalText
      patch.targetText = totalsView.targetText
      patch.hasTarget = totalsView.hasTarget
      patch.percent = totalsView.percent
      patch.breakdownText = totalsView.breakdownText
    }

    this.setData(patch)
    const keepTicker = isTime || !!(reminder && reminder.type === 'time' && !reminder.done)
    if (!keepTicker) this.stopTicker()
  },

  // —— 跳转 ——

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
    wx.showModal({title:'取消本轮提醒？',content:'只取消提醒，本轮计数继续。',success:r=>{if(r.confirm)store.cancelReminder(SIDE)}})
  },

  onOpenSheet() {
    const last = this.readLastReminder()
    this.setData({
      showSheet: true,
      reminderType: last.type,
      reminderTime: last.time,
      reminderCount: last.count,
      reminderRowText: reminderRowTextOf(last.type, last.time, last.count),
      sheetBtnText: mainBtnTextOf(this.data.isTime, last.type, last.time, last.count),
      mainBtnText: mainBtnTextOf(this.data.isTime, last.type, last.time, last.count)
    })
  },

  readLastReminder() {
    let saved = null
    try {
      saved = store.lastReminder()
    } catch (e) {
      saved = null
    }
    const timeOnly = (this.data.isTime || (this._id && store.getPractice(this._id).type === 'time'))
    const type = !timeOnly && saved && (saved.type === 'time' || saved.type === 'count') ? saved.type : 'none'
    const value = saved ? Number(saved.value) : 0
    const time = type === 'time' && TIME_OPTIONS.indexOf(value) >= 0 ? value : 30
    const count = type === 'count' && COUNT_OPTIONS.indexOf(value) >= 0 ? value : 500
    return { type, time, count }
  },

  onPickReminderType(e) {
    this.updateSheet(e.currentTarget.dataset.type, this.data.reminderTime, this.data.reminderCount)
  },

  onPickReminderTime(e) {
    this.updateSheet('time', Number(e.currentTarget.dataset.value), this.data.reminderCount)
  },

  onPickReminderCount(e) {
    this.updateSheet('count', this.data.reminderTime, Number(e.currentTarget.dataset.value))
  },

  updateSheet(type, time, count) {
    const btnText = mainBtnTextOf(this.data.isTime, type, time, count)
    this.setData({
      reminderType: type,
      reminderTime: time,
      reminderCount: count,
      reminderRowText: reminderRowTextOf(type, time, count),
      sheetBtnText: btnText,
      mainBtnText: btnText
    })
  },

  closeSheet() {
    this.setData({ showSheet: false })
  },

  noop() {},

  // —— 开启新一轮 ——

  onStartRound() {
    if (this._starting) return

    const type = this.data.reminderType
    const time = this.data.reminderTime
    const count = this.data.reminderCount
    const reminder = type === 'time'
      ? { type: 'time', value: time }
      : type === 'count' ? { type: 'count', value: count } : null

    try {
      store.saveReminder( type === 'none'
        ? { type: 'none', value: 0 }
        : { type, value: type === 'time' ? time : count })
    } catch (e) {}

    const start = () => {
      this._starting = true
      try {
        store.startRound(SIDE, this._id, reminder)
      } catch (e) {
        this._starting = false
        wx.showToast({ title: '开启失败，请重试', icon: 'none' })
        return
      }

      this.setData({ showSheet: false })
      wx.showToast({
        title: this.data.isTime ? '已开始计时' : '已开启新一轮',
        icon: 'none'
      })
      this._starting = false
      wx.navigateTo({ url: '/pages/woodfish/woodfish' })
    }

    const ctx = store.context(SIDE)
    if (ctx && (ctx.roundCount > 0 || ctx.reminder || store.getPractice(ctx.practiceId).type === 'time')) {
      wx.showModal({
        title: '重新一轮？',
        content: '将结束当前一轮并取消原提醒，今日累积不受影响',
        confirmText: '确认',
        cancelText: '取消',
        success: res => {
          if (res.confirm) start()
        }
      })
    } else {
      start()
    }
  }
})
