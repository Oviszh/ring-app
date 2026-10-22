// 今日 Tab（P1）：纸卡计数区 + 设备/手机页签（页签常显，未绑定显示"暂无绑定戒指"）
// 设置里可分别关闭手机/戒指计数入口；全部关闭 = 纯填报模式
const { fmtNum, fmtDayCN, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store

function nameOf(practice) {
  return practice.displayName || practice.name
}

// 首页只显示 showOnHome 的功课；可见侧正在计数的功课即使被隐藏也保留在列表里
function visiblePractices(enabledSides) {
  const list = store.homePractices()
  for (const side of enabledSides) {
    const ctx = store.context(side)
    const current = ctx ? store.getPractice(ctx.practiceId) : null
    if (current && !list.some(p => p.id === current.id)) {
      list.push(current)
      list.sort((a, b) => a.sort - b.sort)
    }
  }
  return list
}

function syncTextOf(device) {
  if (!device || !device.lastSyncAt) return '未同步'
  const diff = Date.now() - device.lastSyncAt
  if (diff < 60000) return '刚刚同步'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前同步`
  const d = new Date(device.lastSyncAt)
  const p = n => (n < 10 ? '0' + n : '' + n)
  return `${p(d.getHours())}:${p(d.getMinutes())} 同步`
}

Page({
  data: {
    empty: true,
    emptyHidden: false,
    todayKey: '',
    dateLabel: '',

    phoneEnabled: true,
    fillOnly: false,

    // 页签与戒指
    tabsVisible: false,
    side: 'phone',
    ringBound: false,
    ringEmpty: false,
    ringLocked: false,
    syncText: '',

    currentName: '',
    currentPracticeId: '',
    currentIndex: 0,
    canSwitch: false,
    ledText: '0',
    ledCaption: '',
    todayText: '',
    isTime: false,

    practices: [],

    entryVisible: false,
    entryDate: '',
    entryDateLabel: '',
    entryPractices: [],
    entryPracticeIndex: 0,
    entryPracticeName: '',
    entryUnit: '声',
    entryAmount: ''
  },

  onLoad() {
    this.offStore = store.onChange(() => { if (this._visible) this.refresh() })
    this.refresh()
  },

  onShow() {
    this._visible = true
    this.refresh()
    clearInterval(this._ticker)
    this._ticker = setInterval(() => this.refresh(), 1000)
  },

  onHide() { this._visible = false; clearInterval(this._ticker) },

  onUnload() {
    clearInterval(this._ticker)
    if (this.offStore) this.offStore()
    this.offStore = null
  },

  // —— view-model ——

  refresh() {
    const all = store.practices()
    const today = store.todayKey()
    const device = store.currentDevice()
    const settings = store.state.settings || {}
    const ringEnabled = settings.ringEnabled !== false
    const phoneEnabled = settings.phoneEnabled !== false
    const ringBound = !!device
    // 全部关闭 = 纯填报模式；只关一个 = 页签只剩另一侧
    const fillOnly = !ringEnabled && !phoneEnabled
    const tabsVisible = ringEnabled && phoneEnabled

    let side = this.data.side
    if (!ringEnabled && side === 'ring') side = 'phone'
    if (!phoneEnabled && side === 'phone') side = ringEnabled ? 'ring' : 'phone'
    if (!tabsVisible) side = ringEnabled ? 'ring' : 'phone'
    const ringEmpty = side === 'ring' && !ringBound

    const enabledSides = []
    if (ringEnabled) enabledSides.push('ring')
    if (phoneEnabled) enabledSides.push('phone')
    const list = visiblePractices(enabledSides)

    if (!list.length) {
      this.setData({
        dateLabel: fmtDayCN(today),
        empty: true,
        emptyHidden: all.length > 0,
        todayKey: today,
        practices: [],
        entryVisible: false,
        phoneEnabled,
        fillOnly,
        tabsVisible,
        side,
        ringBound,
        ringEmpty,
        ringLocked: device ? !!device.locked : false,
        syncText: syncTextOf(device)
      })
      return
    }

    const ctx = store.context(side)
    let current = ctx ? list.find(p => p.id === ctx.practiceId) : null
    if (!current) current = list[0]

    const rows = list.map(p => {
      const t = store.dayTotals(today, p.id)
      return {
        id: p.id,
        name: nameOf(p),
        current: p.id === current.id,
        totalText: t ? (t.isDuration ? fmtMinutes(t.durationMin) : fmtNum(t.total)) : '0',
        progressText: this.progressText(t)
      }
    })

    const totals = store.dayTotals(today, current.id)
    const isCurrentCtx = ctx && ctx.practiceId === current.id
    const roundCount = isCurrentCtx ? ctx.roundCount : 0
    const sideLabel = side === 'ring' ? '设备' : '手机'
    const isTime = current.type === 'time'

    this.setData({
      dateLabel: fmtDayCN(today),
      empty: false,
      emptyHidden: false,
      todayKey: today,
      phoneEnabled,
      fillOnly,
      tabsVisible,
      side,
      ringBound,
      ringEmpty,
      ringLocked: device ? !!device.locked : false,
      syncText: syncTextOf(device),
      currentName: nameOf(current),
      currentPracticeId: current.id,
      currentIndex: list.indexOf(current),
      canSwitch: list.length > 1,
      isTime,
      ledText: isTime
        ? (isCurrentCtx ? Math.floor(store.elapsed(side) / 60000) : 0)
        : fmtNum(roundCount),
      ledCaption: isTime ? `本座分钟 · ${sideLabel}` : `本轮计数 · ${sideLabel}`,
      todayText: totals && totals.isDuration
        ? `今日 ${fmtMinutes(totals.durationMin)}`
        : `${sideLabel}今日 ${fmtNum(totals ? totals[side] : 0)} ${current.unit || '声'} · 全天 ${fmtNum(totals ? totals.total : 0)}`,
      practices: rows
    })
  },

  progressText(totals) {
    if (!totals) return '今日 0'
    if (totals.isDuration) return `今日 ${fmtMinutes(totals.durationMin)}`
    if (totals.target === null || totals.target === undefined) return `今日 ${fmtNum(totals.total)}`
    return `今日 ${fmtNum(totals.total)}/${fmtNum(totals.target)}`
  },

  // —— 设备/手机页签 ——

  onSideTab(e) {
    const side = e.currentTarget.dataset.side
    if (!side || side === this.data.side) return
    this.setData({ side }, () => this.refresh())
  },

  goBind() {
    wx.navigateTo({ url: '/pages/device-bind/device-bind' })
  },

  onRingLock() {
    const device = store.currentDevice()
    if (!device) return
    const target = !device.locked
    wx.showModal({
      title: target ? '锁定戒指？' : '解锁戒指？',
      content: target ? '锁定后戒指触摸停用，防误触' : '解锁后恢复触摸计数',
      confirmText: target ? '锁定' : '解锁',
      success: res => {
        if (!res.confirm) return
        store.ringSetLocked(target).catch(() => {
          wx.showToast({ title: '戒指未连接', icon: 'none' })
        })
      }
    })
  },

  onRingSync() {
    wx.showLoading({ title: '同步中', mask: true })
    store.ringSync()
      .then(r => {
        wx.hideLoading()
        wx.showToast({ title: r && r.ok ? '同步完成' : '戒指未连接', icon: 'none' })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '戒指未连接', icon: 'none' })
      })
  },

  // —— 切换当前功课（切换即清零本轮） ——

  onPrevPractice() { this.switchBy(-1) },
  onNextPractice() { this.switchBy(1) },

  switchBy(delta) {
    const list = this.data.practices.length ? this.data.practices.map(r => store.getPractice(r.id)).filter(Boolean) : []
    if (list.length < 2) return

    const side = this.data.side
    const target = list[(this.data.currentIndex + delta + list.length) % list.length]
    const ctx = store.context(side)
    if (ctx && ctx.practiceId === target.id) return

    const start = () => {
      if (side === 'ring') {
        if (!this.data.ringBound) { this.goBind(); return }
        store.ringStartRound(target.id).catch(() => {
          wx.showToast({ title: '戒指未连接', icon: 'none' })
        })
      } else {
        store.startRound('phone', target.id)
      }
      this.refresh()
    }

    if (ctx && (ctx.roundCount > 0 || ctx.reminder || (store.getPractice(ctx.practiceId) || {}).type === 'time')) {
      wx.showModal({
        title: '切换功课？',
        content: '切换将结束本轮并取消原提醒，今日累积不受影响',
        confirmText: '切换',
        cancelText: '取消',
        success: res => { if (res.confirm) start() }
      })
    } else {
      start()
    }
  },

  // —— 跳转 ——

  goWoodfish() {
    const ctx = store.context('phone')
    if (!ctx) store.startRound('phone', this.data.currentPracticeId)
    wx.navigateTo({ url: '/pages/woodfish/woodfish' })
  },

  goPracticeAdd() {
    wx.navigateTo({ url: '/pages/practice-add/practice-add' })
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onPracticeTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/practice-detail/practice-detail?id=${id}` })
  },

  onConfig() {
    wx.navigateTo({ url: '/pages/practice-manage/practice-manage' })
  },

  // —— E3 填报弹层 ——

  openEntry() {
    const list = store.practices()
    if (!list.length) return

    let index = list.findIndex(p => p.id === this.data.currentPracticeId)
    if (index < 0) index = 0

    const today = store.todayKey()
    const practices = list.map(p => ({ id: p.id, name: nameOf(p), unit: p.unit || '声' }))

    this.setData({
      entryVisible: true,
      entryDate: today,
      entryDateLabel: `今天 ${fmtDayCN(today)}`,
      entryPractices: practices,
      entryPracticeIndex: index,
      entryPracticeName: practices[index].name,
      entryUnit: practices[index].unit,
      entryAmount: ''
    })
  },

  closeEntry() {
    this.setData({ entryVisible: false, entryAmount: '' })
  },

  onEntryDateChange(e) {
    const date = e.detail.value
    this.setData({
      entryDate: date,
      entryDateLabel: date === store.todayKey() ? `今天 ${fmtDayCN(date)}` : fmtDayCN(date)
    })
  },

  onEntryPracticeChange(e) {
    const index = Number(e.detail.value)
    const practice = this.data.entryPractices[index]
    if (!practice) return
    this.setData({
      entryPracticeIndex: index,
      entryPracticeName: practice.name,
      entryUnit: practice.unit
    })
  },

  onEntryAmountInput(e) {
    this.setData({ entryAmount: e.detail.value })
  },

  saveEntry() { this.submitEntry(true) },
  saveEntryAndContinue() { this.submitEntry(false) },

  submitEntry(close) {
    const amount = Number(this.data.entryAmount)
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      wx.showToast({ title: '请输入大于 0 的整数', icon: 'none' })
      return
    }

    const practice = this.data.entryPractices[this.data.entryPracticeIndex]
    if (!practice) return

    try {
      store.addEntry({ date: this.data.entryDate, practiceId: practice.id, amount })
    } catch (err) {
      wx.showToast({
        title: err && err.message === 'FUTURE_DATE' ? '不能填报未来日期' : '保存失败，请重试',
        icon: 'none'
      })
      return
    }

    wx.showToast({ title: '已保存', icon: 'success' })
    if (close) this.closeEntry()
    else {
      const index = (this.data.entryPracticeIndex + 1) % this.data.entryPractices.length
      const next = this.data.entryPractices[index]
      this.setData({ entryAmount: '', entryPracticeIndex: index, entryPracticeName: next.name, entryUnit: next.unit })
    }
  },

  noop() {}
})
