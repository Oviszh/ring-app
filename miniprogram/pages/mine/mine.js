// 我的 Tab（P1''）：本阶段仅游客模式 P1''-A，登录留到阶段3
const store = getApp().globalData.store

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
    deviceCount: 0
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    this.setData({ deviceCount: store.devices().length })
  },

  // —— P1''-A 游客卡片 ——

  onLogin() {
    wx.showToast({ title: '登录功能即将开放', icon: 'none' })
  },

  // —— 我的设备 ——

  onDevices() {
    navTo('/pages/device-list/device-list')
  },

  // —— 列表入口 ——

  goBackup() { navTo('/pages/backup/backup') },
  goPractices() { navTo('/pages/practice-manage/practice-manage') },
  goVows() {
    navTo('/pages/vow-list/vow-list')
  },

  goSummary() {
    navTo('/pages/summary/summary')
  },

  goSettings() {
    navTo('/pages/settings/settings')
  }
})
