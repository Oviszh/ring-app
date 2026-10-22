'use strict'

const store = getApp().globalData.store

const ABOUT_TEXT = '念佛计数 v0.1 · 永久免费无广告'

Page({
  data: {
    ringEnabled: true,
    phoneEnabled: true
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const s = store.state.settings
    this.setData({
      ringEnabled: s.ringEnabled !== false,
      phoneEnabled: s.phoneEnabled !== false
    })
  },

  onPhoneChange(e) {
    store.setSetting('phoneEnabled', e.detail.value)
    this.refresh()
  },

  onNotifications() {
    wx.showModal({ title:'前台计时与提醒', content:'手机计数仅在小程序前台使用。切到后台时，计时和倒计时暂停；返回后继续。每轮可选择时长或次数提醒，达到目标后提醒一次，计数继续。', showCancel:false })
  },

  onAccount() {
    wx.showToast({ title: '下一阶段开放', icon: 'none' })
  },

  onPhoneSettings() { wx.navigateTo({url:'/pages/phone-settings/phone-settings'}) },
  onBackup() {
    wx.navigateTo({url:'/pages/backup/backup'})
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: ABOUT_TEXT,
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
