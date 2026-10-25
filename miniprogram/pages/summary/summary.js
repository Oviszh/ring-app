'use strict'

const { fmtNum, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store

function nameOf(practice) {
  return practice.displayName || practice.name
}

Page({
  data: {
    ready: false,
    practices: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const practices = store.allPractices().map(practice => {
      const totals = store.practiceTotalsAll(practice.id)

      if (practice.type === 'time') {
        return {
          id: practice.id,
          name: nameOf(practice),
          isTime: true,
          totalText: fmtMinutes(totals.durationMin || 0),
          timesText: `${totals.times} 座`
        }
      }

      return {
        id: practice.id,
        name: nameOf(practice),
        isTime: false,
        unit: practice.unit || '声',
        totalText: fmtNum(totals.total),
        daysText: `修行 ${totals.days} 天`,
        ringText: fmtNum(totals.ring), hasRing: !!totals.ring, hasPhone: !!totals.phone, hasManual: !!totals.manual,
        phoneText: fmtNum(totals.phone),
        manualText: fmtNum(totals.manual)
      }
    })

    this.setData({ ready: true, practices })
  },

  onHistory(e) { getApp().globalData.calendarPid = e.currentTarget.dataset.id; wx.switchTab({ url: '/pages/calendar/calendar' }) },
  goPracticeAdd() {
    wx.navigateTo({ url: '/pages/practice-add/practice-add' })
  }
})
