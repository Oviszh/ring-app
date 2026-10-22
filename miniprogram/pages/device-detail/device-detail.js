// P12-A 单枚戒指页：信息、设为当前、切功课、触摸锁定、同步、解绑、mock 演示
const store = getApp().globalData.store

function toast(title) {
  wx.showToast({ title, icon: 'none' })
}

function relTime(ts) {
  if (!ts) return '尚未同步'
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

function metaOf(device) {
  const parts = []
  if (device.model) parts.push(device.model)
  if (device.firmware) parts.push(`固件 ${device.firmware}`)
  return parts.join(' · ') || '戒指信息未知'
}

Page({
  data: {
    ready: false,
    id: '',

    name: '',
    meta: '',
    batteryText: '',
    ownerMismatch: false,
    isCurrent: false,
    syncLine: '',

    locked: false,
    practices: [],
    isMock: false
  },

  onLoad(options) {
    const id = (options && options.id) || ''
    if (!id) {
      wx.navigateBack({ fail() { wx.switchTab({ url: '/pages/today/today' }) } })
      return
    }
    this.setData({ id })
    this.refresh()
  },

  onShow() {
    if (this.data.id) this.refresh()
  },

  refresh() {
    const id = this.data.id
    const device = store.devices().find(d => d.id === id)

    if (!device) {
      if (this._gone) return
      this._gone = true
      this.setData({ ready: false })
      toast('戒指已解绑')
      setTimeout(() => this.leave(), 400)
      return
    }

    const ringCtx = store.context('ring')
    const practices = store.practices().map(p => ({
      id: p.id,
      name: p.displayName || p.name,
      active: !!ringCtx && ringCtx.practiceId === p.id
    }))

    this.setData({
      ready: true,
      name: device.name || '念佛戒指',
      meta: metaOf(device),
      batteryText: typeof device.battery === 'number' ? `${device.battery}%` : '',
      ownerMismatch: !!device.ownerMismatch,
      isCurrent: !!device.isCurrent,
      syncLine: `最后同步 ${relTime(device.lastSyncAt)}`,
      locked: !!device.locked,
      practices,
      isMock: store.ringAdapter().kind === 'mock'
    })

    wx.setNavigationBarTitle({ title: device.name || '念佛戒指' })
  },

  // store 的戒指操作都作用于「当前戒指」：操作本页戒指前先把它设为当前
  ensureCurrent() {
    const current = store.currentDevice()
    if (current && current.id === this.data.id) return
    store.ringSetCurrent(this.data.id)
    this.refresh()
  },

  leave() {
    wx.navigateBack({
      fail() { wx.redirectTo({ url: '/pages/device-list/device-list' }) }
    })
  },

  // —— 设为当前 ——

  onSetCurrent() {
    try {
      this.ensureCurrent()
      toast('已设为当前戒指')
      this.refresh()
    } catch (err) {
      toast('戒指未连接')
    }
  },

  // —— 戒指可切功课 ——

  onPracticeTap(e) {
    const practiceId = e.currentTarget.dataset.id
    if (!practiceId) return

    wx.showModal({
      title: '开启新一轮？',
      content: '在戒指上开启该功课新一轮？本轮计数将清零',
      confirmText: '开启',
      success: res => {
        if (!res.confirm) return
        this.startRound(practiceId)
      }
    })
  },

  async startRound(practiceId) {
    try {
      this.ensureCurrent()
      await store.ringStartRound(practiceId)
      wx.showToast({ title: '已下发', icon: 'success' })
      this.refresh()
    } catch (err) {
      toast('戒指未连接')
    }
  },

  // —— 触摸锁定 ——

  async onLockChange(e) {
    const target = !!e.detail.value
    try {
      this.ensureCurrent()
      const locked = await store.ringSetLocked(target)
      this.setData({ locked: !!locked })
      toast(locked ? '戒指已锁定' : '戒指已解锁')
      this.refresh()
    } catch (err) {
      this.setData({ locked: !target })
      toast('戒指未连接')
    }
  },

  // —— 同步 ——

  async onSync() {
    wx.showLoading({ title: '同步中', mask: true })
    try {
      this.ensureCurrent()
      const result = await store.ringSync()
      wx.hideLoading()
      toast(result && result.ok ? '同步完成' : '戒指未连接')
      this.refresh()
    } catch (err) {
      wx.hideLoading()
      toast('戒指未连接')
    }
  },

  // —— 解绑 ——

  onUnbind() {
    wx.showModal({
      title: '解绑设备？',
      content: '解绑仅解除与本机的绑定，戒指内数据保留；若该戒指之后绑给其他用户，戒指数据才会被清空。',
      confirmText: '解绑',
      confirmColor: '#C2402F',
      success: res => {
        if (!res.confirm) return
        try {
          store.ringUnbind(this.data.id)
        } catch (err) {
          toast('戒指未连接')
          return
        }
        wx.showToast({ title: '已解绑', icon: 'none' })
        this._gone = true
        setTimeout(() => this.leave(), 400)
      }
    })
  },

  // —— mock 演示：模拟佩戴者点按戒指 ——

  async onSimulate(e) {
    const n = Number(e.currentTarget.dataset.n) || 1
    try {
      this.ensureCurrent()
      const result = await store.ringSimulateTap(n)
      if (result && result.ok) {
        toast(`戒指 +${n}，已同步`)
      } else if (result && result.reason === 'LOCKED') {
        toast('戒指已锁定')
      } else if (result && result.reason === 'NO_PRACTICE') {
        toast('请先开启一轮功课')
      } else {
        toast('戒指未连接')
      }
      this.refresh()
    } catch (err) {
      toast('戒指未连接')
    }
  }
})
