// P13 绑定流程：搜索 → 连接 → 归属校验（他人戒指需确认清空）→ 对时 → 同步 → 建档
const store = getApp().globalData.store

const STEPS = ['连接中…', '对时中…', '同步历史数据…']
const TAKEOVER_STEPS = ['清空旧归属…', '对时中…', '同步历史数据…']

function shortId(deviceId) {
  return String(deviceId || '').slice(-4).toUpperCase()
}

Page({
  data: {
    phase: 'scan', // scan | binding
    scanning: false,
    available: true,
    errorText: '',
    devices: [],

    progressText: '',
    progressDone: false
  },

  onLoad() {
    this._alive = true
    this.startScan()
  },

  onUnload() {
    this._alive = false
    clearInterval(this._stepTimer)
    if (this._loading) {
      wx.hideLoading()
      this._loading = false
    }
  },

  // —— 扫描 ——

  async startScan() {
    if (this._scanning || this._binding) return
    if (store.ringAdapter().ready === false) {
      this.setData({ scanning: false, available: false, devices: [], errorText: '配套设备尚未开放绑定' })
      return
    }
    this._scanning = true

    this.setData({ scanning: true, devices: [], progressDone: false })
    wx.showLoading({ title: '正在搜索附近的戒指…', mask: true })
    this._loading = true

    let found = []
    try {
      found = await store.ringScan()
    } catch (err) {
      found = []
    }

    this._scanning = false
    if (this._loading) {
      wx.hideLoading()
      this._loading = false
    }
    if (!this._alive) return

    this.setData({
      scanning: false,
      devices: (found || []).map(device => ({
        deviceId: device.deviceId,
        name: device.name || '念佛戒指',
        idText: `ID ${shortId(device.deviceId)}`,
        rssiText: typeof device.rssi === 'number' ? `${device.rssi} dBm` : '未知'
      }))
    })
  },

  goBack() { wx.navigateBack({ fail() { wx.switchTab({ url: '/pages/today/today' }) } }) },

  // —— 绑定 ——

  onConnect(e) {
    const deviceId = e.currentTarget.dataset.id
    if (deviceId) this.bind(deviceId, false)
  },

  async bind(deviceId, forceClear) {
    if (this._binding) return
    this._binding = true

    const steps = forceClear ? TAKEOVER_STEPS : STEPS
    let step = 0
    this.setData({ phase: 'binding', progressText: steps[0], progressDone: false })

    clearInterval(this._stepTimer)
    this._stepTimer = setInterval(() => {
      if (step >= steps.length - 1) return
      step += 1
      if (this._alive) this.setData({ progressText: steps[step] })
    }, 420)

    try {
      const device = await store.ringBind(deviceId, forceClear)
      clearInterval(this._stepTimer)
      this._binding = false
      if (!this._alive) return

      this._boundId = device.id
      this.setData({ progressText: '✓ 绑定成功', progressDone: true })
      wx.showToast({ title: '绑定成功', icon: 'success', duration: 1200 })
      setTimeout(() => this.finish(), 1100)
    } catch (err) {
      clearInterval(this._stepTimer)
      this._binding = false
      if (!this._alive) return
      this.setData({ phase: 'scan', progressText: '', progressDone: false })

      if (err && err.boundByOther) this.confirmTakeover(deviceId)
      else wx.showToast({ title: '连接失败，请重试', icon: 'none' })
    }
  },

  // 戒指归他人：确认后清空戒指数据（新 epoch），重新走绑定
  confirmTakeover(deviceId) {
    wx.showModal({
      title: '继续绑定？',
      content: '该戒指已绑定其他用户。继续绑定将清空戒指内的全部数据（含尚未同步的计数），原用户的 App 数据不受影响。',
      confirmText: '继续绑定',
      cancelText: '取消',
      success: res => {
        if (res.confirm) this.bind(deviceId, true)
      }
    })
  },

  finish() {
    if (!this._alive) return
    const id = this._boundId
    wx.navigateBack({
      fail() {
        if (id) wx.redirectTo({ url: `/pages/device-detail/device-detail?id=${id}` })
      }
    })
  }
})
