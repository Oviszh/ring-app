'use strict'

const { fmtNum } = require('../../utils/format')
const { displayVowName } = require('../../utils/vow-name')

const store = getApp().globalData.store

Page({
  data: {
    ready: false,
    total: 0,
    active: [],
    done: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const vows = store.vows()
    const active = []
    const done = []

    for (const vow of vows) {
      const progress = store.vowProgress(vow.id)
      if (!progress) continue

      const practice = store.getPracticeAny(vow.practiceId)
      const title = displayVowName(vow, practice)

      if (progress.done) {
        done.push({ id: vow.id, title, days: progress.days })
      } else {
        active.push({
          id: vow.id,
          title,
          totalText: fmtNum(progress.total),
          targetText: fmtNum(progress.target),
          percent: progress.percent,
          barStyle: `width: ${progress.percent}%;`,
          avgText: fmtNum(progress.avgPerDay),
          etaText: progress.eta ? `预计 ${progress.eta.slice(0, 7)} 圆满` : '记录一段时间后可估算'
        })
      }
    }

    this.setData({ ready: true, total: vows.length, active, done })
  },

  goNew() {
    wx.navigateTo({ url: '/pages/vow-new/vow-new' })
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/vow-detail/vow-detail?id=${e.currentTarget.dataset.id}`
    })
  }
})
