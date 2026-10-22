'use strict'

const { fmtNum } = require('../../utils/format')

const store = getApp().globalData.store

function nameOf(practice) {
  return practice.displayName || practice.name
}

// 自动生成的愿名已带「功课名 · …」前缀时不重复拼接
function vowTitle(practiceName, vowName) {
  if (!practiceName) return vowName
  return vowName.indexOf(practiceName + ' · ') === 0 ? vowName : `${practiceName} · ${vowName}`
}

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
      const practiceName = practice ? nameOf(practice) : ''
      const title = vowTitle(practiceName, vow.name)

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
          etaText: progress.eta ? `预计 ${progress.eta.slice(0, 7)} 圆满` : '暂无估算'
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
