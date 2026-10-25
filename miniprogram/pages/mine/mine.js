const store = getApp().globalData.store
Page({
  data: { practiceCount: 0, recordDays: 0, deviceCount: 0 },
  onShow() {
    const days = new Set()
    for (const p of store.allPractices()) {
      for (const date of Object.keys(store.state.archives)) { const t = store.dayTotals(date, p.id); if (t && t.total > 0) days.add(date) }
      const t = store.dayTotals(store.todayKey(), p.id); if (t && t.total > 0) days.add(store.todayKey())
    }
    this.setData({ practiceCount: store.practices().length, recordDays: days.size, deviceCount: store.devices().length })
  },
  goDevices() { wx.navigateTo({ url: '/pages/device-list/device-list' }) },
  goBackup() { wx.navigateTo({ url: '/pages/backup/backup' }) },
  goPractices() { wx.navigateTo({ url: '/pages/practice-manage/practice-manage' }) },
  goVows() { wx.navigateTo({ url: '/pages/vow-list/vow-list' }) },
  goSummary() { wx.navigateTo({ url: '/pages/summary/summary' }) },
  goSettings() { wx.navigateTo({ url: '/pages/settings/settings' }) }
})
