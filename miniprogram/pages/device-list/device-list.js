// P12-L 设备列表：当前设备 / 电量 / 归属异常；进入单枚戒指页或绑定流程
const store = getApp().globalData.store

function metaOf(device) {
  const parts = []
  if (device.model) parts.push(device.model)
  if (device.firmware) parts.push(`固件 ${device.firmware}`)
  return parts.join(' · ')
}

function batteryOf(device) {
  return typeof device.battery === 'number' ? `${device.battery}%` : ''
}

Page({
  data: {
    devices: []
  },

  onShow() {
    this.refresh()
    this.silentSync()
  },

  refresh() {
    this.setData({
      devices: store.devices().map(device => ({
        id: device.id,
        name: device.name || '念佛戒指',
        meta: metaOf(device),
        isCurrent: !!device.isCurrent,
        ownerMismatch: !!device.ownerMismatch,
        batteryText: batteryOf(device)
      }))
    })
  },

  // 进页面顺手补一次同步；不弹 loading、不报错
  silentSync() {
    if (!store.currentDevice()) return
    store.ringSync()
      .then(result => { if (result && result.ok) this.refresh() })
      .catch(() => {})
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/device-detail/device-detail?id=${id}` })
  },

  goBind() {
    wx.navigateTo({ url: '/pages/device-bind/device-bind' })
  },

  // 没有戒指时回首页用触屏计数：列表页可能由「我的」进入，无上一页则切到今日
  goPhoneCount() {
    if (store.state.settings.phoneEnabled === false) {
      wx.navigateTo({ url: '/pages/settings/settings' })
      return
    }
    store.setSetting('countSide', 'phone')
    wx.switchTab({ url: '/pages/today/today' })
  }
})
