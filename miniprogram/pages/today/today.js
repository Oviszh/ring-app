const { sourceText, fmtNum, fmtDayCN } = require('../../utils/format')
const store = getApp().globalData.store

const LABELS = { ring: '设备计数', phone: '触屏计数' }

function syncLabel(device) {
  if (!device || !device.lastSyncAt) return '尚未同步'
  const minutes = Math.max(0, Math.floor((Date.now() - device.lastSyncAt) / 60000))
  if (minutes < 1) return '刚刚同步'
  if (minutes < 60) return `${minutes} 分钟前同步`
  const date = new Date(device.lastSyncAt)
  return `${date.getMonth() + 1}月${date.getDate()}日已同步`
}

Page({
  data: {
    side: '', ringEnabled: true, phoneEnabled: true, fillOnly: false, tabsVisible: true,
    empty: true, emptyHidden: false, dateLabel: '', practices: [],
    currentPracticeId: '', currentName: '', currentIndex: 0, canSwitch: false,
    roundText: '0', todayText: '0', totalText: '0', unit: '声', isTime: false,
    hasContext: false, counterLabel: '', reminderText: '', entryVisible: false,
    ringBound: false, ringEmpty: true, deviceName: '', deviceStatus: '',
    ringLocked: false, deviceConnected: false, busy: false
  },

  onLoad() {
    this._viewPracticeIds = {}
    this._off = store.onChange(() => { if (this._visible) this.refresh() })
  },
  onShow() {
    this._visible = true
    if (store.state.settings.countSide) this.setData({ side: store.state.settings.countSide })
    this._navigating = false
    this.refresh()
    clearInterval(this._ticker)
    this._ticker = setInterval(() => this.refresh(), 1000)
  },
  onHide() {
    this._visible = false
    clearInterval(this._ticker)
    if (this.data.entryVisible) this.setData({ entryVisible: false })
  },
  onUnload() { clearInterval(this._ticker); if (this._off) this._off() },

  refresh() {
    const today = store.todayKey()
    const settings = store.state.settings || {}
    const ringEnabled = settings.ringEnabled !== false
    const phoneEnabled = settings.phoneEnabled !== false
    const fillOnly = !ringEnabled && !phoneEnabled
    let side = this.data.side || settings.countSide || 'ring'
    if (side === 'ring' && !ringEnabled) side = 'phone'
    if (side === 'phone' && !phoneEnabled && ringEnabled) side = 'ring'
    if (!LABELS[side]) side = ringEnabled ? 'ring' : 'phone'

    const all = store.practices()
    const home = store.homePractices()
    const ctx = store.context(side)
    const device = store.currentDevice()
    const validContext = ctx && (side !== 'ring' || (device && (!ctx.deviceId || ctx.deviceId === device.id)))
    const selectedId = (this._viewPracticeIds || {})[side]
    const current = all.find(p => p.id === selectedId)
      || all.find(p => validContext && p.id === ctx.practiceId)
      || home[0] || all[0]
    const currentIndex = current ? all.findIndex(p => p.id === current.id) : 0
    const active = !!(current && validContext && ctx.practiceId === current.id)
    const isTime = !!current && current.type === 'time'
    const totals = current ? store.dayTotals(today, current.id) : null
    const connected = !!device && store.ringAdapter().isConnected()
    const ringEmpty = side === 'ring' && !device
    let roundText = isTime
      ? String(active ? Math.floor(store.elapsed(side) / 60000) : 0)
      : String(active ? ctx.roundCount : 0)
    if (ringEmpty || (side === 'ring' && (!active || device.ownerMismatch))) roundText = '------'
    const reminder = active ? store.reminderRemaining(side) : null

    const rows = home.map(p => {
      const t = store.dayTotals(today, p.id)
      const target = t && t.target
      const total = t ? t.total : 0
      return {
        group: p.group || 'main', detail: t ? sourceText(t) : '', id: p.id, name: p.displayName || p.name, unit: p.unit,
        totalText: fmtNum(total), hasTarget: target > 0,
        targetText: target > 0 ? `目标 ${fmtNum(target)} ${p.unit}` : '不设每日目标',
        done: target > 0 && total >= target,
        barStyle: `width: ${target > 0 ? Math.min(100, total / target * 100) : 0}%;`
      }
    })
    const day = new Date()
    this.setData({
      side, ringEnabled, phoneEnabled, fillOnly, tabsVisible: ringEnabled && phoneEnabled,
      empty: !all.length, emptyHidden: !!all.length && !home.length,
      dateLabel: `${fmtDayCN(today)} · ${['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][day.getDay()]}`,
      currentPracticeId: current ? current.id : '',
      currentName: current ? current.displayName || current.name : '今日用功',
      currentIndex, canSwitch: all.length > 1, practices: rows,
      practiceGroups: [{ key: 'main', name: '主修功课', note: '每日精进', rows: rows.filter(p => p.group !== 'common') }, { key: 'common', name: '常用功课', note: '随缘修持', rows: rows.filter(p => p.group === 'common') }],
      roundText, todayText: fmtNum(totals ? (isTime ? totals.durationMin : totals[side]) : 0),
      totalText: fmtNum(totals ? totals.total : 0), unit: current ? current.unit : '声',
      isTime, hasContext: active, counterLabel: LABELS[side],
      reminderText: reminder ? (reminder.done ? '本座目标已达成' : reminder.type === 'count'
        ? `再计 ${fmtNum(reminder.remaining)} ${current.unit} 后提醒`
        : `约 ${Math.ceil(reminder.remainingMs / 60000)} 分钟后提醒`) : '',
      ringBound: !!device, ringEmpty, ringLocked: !!device && !!device.locked,
      deviceName: device ? device.name : '', deviceConnected: connected,
      deviceStatus: device ? (device.ownerMismatch ? '绑定关系已变更' : `${connected ? '已连接' : '未连接'} · ${syncLabel(device)}`) : '未绑定设备'
    })
  },

  onSideTab(e) {
    const side = e.currentTarget.dataset.side
    if (!LABELS[side] || (side === 'ring' && !this.data.ringEnabled) || (side === 'phone' && !this.data.phoneEnabled)) return
    if (side === this.data.side) return
    this.setData({ side })
    store.setSetting('countSide', side)
    this.refresh()
  },
  onPrevPractice() { this.switchBy(-1) },
  onNextPractice() { this.switchBy(1) },
  switchBy(delta) {
    const list = store.practices ? store.practices() : this.data.practices
    if (list.length < 2) return
    const target = list[(this.data.currentIndex + delta + list.length) % list.length]
    if (!this._viewPracticeIds) this._viewPracticeIds = {}
    this._viewPracticeIds[this.data.side || 'phone'] = target.id
    this.setData({ currentPracticeId: target.id })
    this.refresh()
  },

  goWoodfish() {
    if (this.data.side && this.data.side !== 'phone') return
    if (this._navigating) return
    const id = this.data.currentPracticeId
    if (!id) { this.goPracticeAdd(); return }
    const ctx = store.context('phone')
    const start = () => {
      try { if (!ctx || ctx.practiceId !== id) store.startRound('phone', id) }
      catch (e) { return }
      this._navigating = true
      wx.navigateTo({ url: '/pages/woodfish/woodfish', fail: () => { this._navigating = false } })
    }
    if (ctx && ctx.practiceId !== id && (ctx.roundCount > 0 || ctx.reminder || (store.getPractice(ctx.practiceId) || {}).type === 'time')) {
      wx.showModal({ title: '切换触屏计数的功课？', content: '当前一轮将结束，已有记录会保留。设备计数不受影响。', confirmText: '切换功课', success: r => { if (r.confirm) start() } })
    } else start()
  },

  onDevicePrimary() {
    if (!this.data.ringBound) { this.goBind(); return }
    if (this.data.hasContext) { this.goDevices(); return }
    if (!this.data.currentPracticeId) { this.goPracticeAdd(); return }
    wx.showModal({
      title: '在设备上开始计数？', content: '仅开始设备计数，触屏计数保持原样。', confirmText: '开始',
      success: async r => {
        if (!r.confirm || this.data.busy) return
        this.setData({ busy: true })
        try { await store.ringStartRound(this.data.currentPracticeId); this.refresh() }
        catch (e) { wx.showToast({ title: '设备未连接，请连接后重试', icon: 'none' }) }
        finally { this.setData({ busy: false }) }
      }
    })
  },
  async onRingSync() {
    if (this.data.busy || !this.data.ringBound) return
    this.setData({ busy: true })
    try {
      const r = await store.ringSync()
      wx.showToast({ title: r && r.ok ? '同步完成' : r && r.reason === 'OWNER_MISMATCH' ? '设备绑定关系已变更' : '设备未连接', icon: 'none' })
      this.refresh()
    } catch (e) { wx.showToast({ title: '同步失败，请重试', icon: 'none' }) }
    finally { this.setData({ busy: false }) }
  },
  onRingLock() {
    if (this.data.busy || !this.data.ringBound) return
    const locked = !this.data.ringLocked
    wx.showModal({
      title: locked ? '锁定设备计数？' : '解锁设备计数？',
      content: locked ? '锁定后设备触摸停用，触屏计数仍可独立使用。' : '解锁后设备恢复计数。',
      confirmText: locked ? '锁定' : '解锁', success: async r => {
        if (!r.confirm) return
        this.setData({ busy: true })
        try { await store.ringSetLocked(locked); this.refresh() }
        catch (e) { wx.showToast({ title: '设备未连接', icon: 'none' }) }
        finally { this.setData({ busy: false }) }
      }
    })
  },
  goDevices() { wx.navigateTo({ url: '/pages/device-list/device-list' }) },
  goBind() { wx.navigateTo({ url: '/pages/device-bind/device-bind' }) },
  goPracticeAdd() { wx.navigateTo({ url: '/pages/practice-add/practice-add' }) },
  onConfig() { wx.navigateTo({ url: '/pages/practice-manage/practice-manage' }) },
  goSettings() { wx.navigateTo({ url: '/pages/settings/settings' }) },
  onPracticeTap(e) { wx.navigateTo({ url: `/pages/practice-detail/practice-detail?id=${e.currentTarget.dataset.id}&side=${this.data.side || 'phone'}` }) },
  openEntry() { if (store.practices().length) this.setData({ entryVisible: true }); else this.goPracticeAdd() },
  closeEntry() { this.setData({ entryVisible: false }) },
  onEntrySaved() { this.refresh() }
})
