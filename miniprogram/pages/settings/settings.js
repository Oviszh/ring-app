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
    wx.showToast({ title: '开发中', icon: 'none' })
  },

  onAccount() {
    wx.showToast({ title: '下一阶段开放', icon: 'none' })
  },

  onBackup() {
    wx.showToast({ title: '下一阶段开放', icon: 'none' })
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
