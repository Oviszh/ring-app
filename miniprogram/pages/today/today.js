// 今日 Tab（P1）：空状态 P1-F；仅手机计数态 P1-E；纯填报模式 P1-G；填报弹层 E3
const { fmtNum, fmtDayCN, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store
const PHONE = 'phone'

function nameOf(practice) {
  return practice.displayName || practice.name
}

// 首页只显示 showOnHome 的功课；当前正在计数的功课即使被隐藏也保留在列表里
function visiblePractices() {
  const list = store.homePractices()
  const ctx = store.context(PHONE)
  const current = ctx ? store.getPractice(ctx.practiceId) : null
  if (current && !list.some(p => p.id === current.id)) {
    list.push(current)
    list.sort((a, b) => a.sort - b.sort)
  }
  return list
}

// 目标页尚未实现时给个明确提示，避免点了没反应
function navTo(url) {
  wx.navigateTo({
    url,
    fail() {
      wx.showToast({ title: '页面开发中', icon: 'none' })
    }
  })
}

Page({
  data: {
    empty: true,
    emptyHidden: false,
    todayKey: '',

    phoneEnabled: true,
    fillOnly: false,

    currentName: '',
    currentPracticeId: '',
    currentIndex: 0,
    canSwitch: false,
    ledText: '0',
    todayText: '今日累积 0',

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
    this.offStore = store.onChange(() => this.refresh())
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  onUnload() {
    if (this.offStore) this.offStore()
    this.offStore = null
  },

  // —— view-model ——

  refresh() {
    const all = store.practices()
    const list = visiblePractices()
    const today = store.todayKey()
    const phoneEnabled = store.state.settings.phoneEnabled !== false
    // P1-G：戒指未绑定且手机计数入口关闭 → 只留手动填报
    const fillOnly = !phoneEnabled && store.state.devices.length === 0

    if (!list.length) {
      this.setData({
        empty: true,
        emptyHidden: all.length > 0,
        todayKey: today,
        practices: [],
        entryVisible: false,
        phoneEnabled,
        fillOnly
      })
      return
    }

    const ctx = store.context(PHONE)
    let current = ctx ? list.find(p => p.id === ctx.practiceId) : null
    if (!current) current = list[0]

    const rows = list.map(p => ({
      id: p.id,
      name: nameOf(p),
      current: p.id === current.id,
      progressText: this.progressText(store.dayTotals(today, p.id))
    }))

    const totals = store.dayTotals(today, current.id)
    const roundCount = ctx && ctx.practiceId === current.id ? ctx.roundCount : 0

    this.setData({
      empty: false,
      emptyHidden: false,
      todayKey: today,
      currentName: nameOf(current),
      currentPracticeId: current.id,
      currentIndex: list.indexOf(current),
      canSwitch: list.length > 1,
      ledText: fmtNum(roundCount),
      todayText: totals.isDuration
        ? `今日 ${fmtMinutes(totals.durationMin)}`
        : `今日累积 ${fmtNum(totals.total)}`,
      practices: rows,
      phoneEnabled,
      fillOnly
    })
  },

  progressText(totals) {
    if (!totals) return '今日 0'
    if (totals.isDuration) return `今日 ${fmtMinutes(totals.durationMin)}`
    if (totals.target === null || totals.target === undefined) return `今日 ${fmtNum(totals.total)}`
    return `今日 ${fmtNum(totals.total)}/${fmtNum(totals.target)}`
  },

  // —— 切换当前功课（切换即清零本轮） ——

  onPrevPractice() {
    this.switchBy(-1)
  },

  onNextPractice() {
    this.switchBy(1)
  },

  switchBy(delta) {
    const list = visiblePractices()
    if (list.length < 2) return

    const target = list[(this.data.currentIndex + delta + list.length) % list.length]
    const ctx = store.context(PHONE)
    if (ctx && ctx.practiceId === target.id) return

    const start = () => {
      store.startRound(PHONE, target.id)
      this.refresh()
    }

    if (ctx && ctx.roundCount > 0) {
      wx.showModal({
        title: '切换功课？',
        content: '切换功课将清零本轮计数，今日累积不受影响',
        confirmText: '切换',
        cancelText: '取消',
        success: res => {
          if (res.confirm) start()
        }
      })
    } else {
      start()
    }
  },

  // —— 跳转 ——

  goWoodfish() {
    wx.navigateTo({ url: '/pages/woodfish/woodfish' })
  },

  goPracticeAdd() {
    wx.navigateTo({ url: '/pages/practice-add/practice-add' })
  },

  goSettings() {
    navTo('/pages/settings/settings')
  },

  onPracticeTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    navTo(`/pages/practice-detail/practice-detail?id=${id}`)
  },

  onConfig() {
    navTo('/pages/practice-manage/practice-manage')
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

  saveEntry() {
    this.submitEntry(true)
  },

  saveEntryAndContinue() {
    this.submitEntry(false)
  },

  submitEntry(close) {
    const amount = Number(this.data.entryAmount)
    if (!Number.isInteger(amount) || amount <= 0) {
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
    else this.setData({ entryAmount: '' })
  },

  noop() {}
})
