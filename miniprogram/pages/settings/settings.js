const store = getApp().globalData.store
const { version } = require('../../services/config')

Page({
  data: { ringEnabled: true, phoneEnabled: true, fillOnly: false, version },
  onShow() { this.refresh() },
  refresh() {
    const s = store.state.settings
    this.setData({ ringEnabled: s.ringEnabled !== false, phoneEnabled: s.phoneEnabled !== false, fillOnly: s.ringEnabled === false && s.phoneEnabled === false })
  },
  onRingChange(e) { store.setSetting('ringEnabled', !!e.detail.value); this.refresh() },
  onPhoneChange(e) { store.setSetting('phoneEnabled', !!e.detail.value); this.refresh() },
  onDevices() { wx.navigateTo({ url: '/pages/device-list/device-list' }) },
  onPhoneSettings() { wx.navigateTo({ url: '/pages/phone-settings/phone-settings' }) },
  onBackup() { wx.navigateTo({ url: '/pages/backup/backup' }) },
  onPrivacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }) },
  onNotifications() {
    wx.showModal({ title: '计时与提醒', content: '触屏计数的计时和时间提醒在小程序前台运行，切到后台后暂停，返回后继续。设备计数由配套设备独立记录，连接后同步。', showCancel: false, confirmText: '知道了' })
  },
  onAbout() { wx.showModal({ title: '念佛计数', content: '版本 ' + version + '\n用于记录日常修行的数量与时长。永久免费，无广告。\n记录保存在本机，可自行导出备份。', showCancel: false, confirmText: '知道了' }) }
})
