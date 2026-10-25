// 修正记录（P10）：只许减少，必须标明来源（戒指/手机）；修正可单独恢复
const { fmtNum, fmtDayCN, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store

const SOURCE_LABEL = { ring: '设备计数', phone: '触屏计数' }

function nameOf(practice) {
  return practice.displayName || practice.name
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmtClock(ts) {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

Page({
  data: {
    date: '',
    dateLabel: '',
    pid: '',
    practiceName: '',
    unit: '声',
    isDuration: false,

    totalText: '0',
    ringText: '0',
    phoneText: '0',
    manualText: '0',

    source: 'phone',
    sourceLabel: '触屏计数',
    ringHint: false,
    fromValue: 0,
    fromText: '0',

    toValue: '',
    deltaText: '',
    errorText: '',
    canConfirm: false,

    adjustments: []
  },

  onLoad(options) {
    const date = (options && options.date) || store.todayKey()
    const pid = (options && options.pid) || ''
    const practice = pid ? store.getPracticeAny(pid) : null

    const practiceName = practice ? nameOf(practice) : ''
    const dateLabel = fmtDayCN(date)
    wx.setNavigationBarTitle({
      title: practice ? `修正 · ${dateLabel} · ${practiceName}` : `修正 · ${dateLabel}`
    })

    this.setData({
      date,
      dateLabel,
      pid,
      practiceName,
      unit: (practice && practice.unit) || '声',
      isDuration: !!practice && practice.type === 'time'
    })

    if (!practice) {
      wx.showToast({ title: '功课不存在', icon: 'none' })
      return
    }
    this.refresh()
  },

  onShow() {
    if (this.data.pid && store.getPracticeAny(this.data.pid)) this.refresh()
  },

  // —— view-model ——

  refresh() {
    const date = this.data.date
    const pid = this.data.pid
    const t = store.dayTotals(date, pid)
    if (!t) return

    const adjustments = store.adjustmentsFor(date, pid).map(a => ({
      id: a.id,
      text: `${SOURCE_LABEL[a.source] || a.source}减少 ${fmtNum(-a.delta)} · ${fmtClock(a.createdAt)}`
    }))

    this.setData({
      totalText: t.isDuration ? fmtMinutes(t.total) : fmtNum(t.total),
      ringText: fmtNum(store.sourceTotal(date, pid, 'ring')),
      phoneText: fmtNum(store.sourceTotal(date, pid, 'phone')),
      manualText: fmtNum(t.manual),
      adjustments,
      toValue: ''
    })

    this.applySource(this.data.source)
  },

  // 选中来源：重新取该来源当前净值，并重新校验输入
  applySource(source) {
    const from = store.sourceTotal(this.data.date, this.data.pid, source)
    this.setData({
      source,
      sourceLabel: SOURCE_LABEL[source],
      fromValue: from,
      fromText: fmtNum(from),
      ringHint: source === 'ring' && from <= 0
    })
    this.validate()
  },

  validate() {
    const raw = this.data.toValue
    const from = this.data.fromValue

    if (raw === '' || raw === null) {
      this.setData({ deltaText: '', errorText: '', canConfirm: false })
      return
    }

    const num = Number(raw)
    if (!Number.isFinite(num)) {
      this.setData({ deltaText: '', errorText: '请输入数字', canConfirm: false })
      return
    }
    if (!Number.isSafeInteger(num) || num < 0) {
      this.setData({ deltaText: '', errorText: '请输入不小于 0 的整数', canConfirm: false })
      return
    }
    if (num >= from) {
      this.setData({ deltaText: '', errorText: '修正后的数量需小于当前数量。新增请用手动记录。', canConfirm: false })
      return
    }

    this.setData({
      deltaText: `本次将减少 ${fmtNum(from - num)} ${this.data.unit}`,
      errorText: '',
      canConfirm: true
    })
  },

  // —— 交互 ——

  onSourceTap(e) {
    const source = e.currentTarget.dataset.source
    if (!SOURCE_LABEL[source] || source === this.data.source) return
    this.applySource(source)
  },

  onInput(e) {
    this.setData({ toValue: e.detail.value })
    this.validate()
  },

  onConfirm() {
    if (!this.data.canConfirm) return

    const num = Number(this.data.toValue)
    const from = this.data.fromValue
    const sourceLabel = this.data.sourceLabel
    const source = this.data.source
    const date = this.data.date
    const pid = this.data.pid

    wx.showModal({
      title: '确认修正？',
      content: `${sourceLabel}来源 ${fmtNum(from)} → ${fmtNum(num)}，差额 ${fmtNum(num - from)}；修正只用于纠错，记录会保留`,
      confirmText: '确认修正',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return
        try {
          store.addAdjustment({ date, practiceId: pid, source, toValue: num })
        } catch (err) {
          const msg = err && err.message === 'REDUCE_ONLY'
            ? '修正后的数量需小于当前数量。新增请用手动记录。'
            : '修正失败，请重试'
          wx.showToast({ title: msg, icon: 'none' })
          this.refresh()
          return
        }
        wx.showToast({ title: '已修正', icon: 'success' })
        this.refresh()
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  },

  onRestore(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '恢复这笔修正？',
      content: '将加回这笔修正扣除的数量，之后的其他记录不受影响。',
      confirmText: '恢复',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return
        try {
          store.undoAdjustment(id)
        } catch (err) {
          wx.showToast({ title: '恢复失败，请重试', icon: 'none' })
          return
        }
        this.refresh()
        wx.showToast({ title: '已恢复', icon: 'success' })
      }
    })
  }
})
