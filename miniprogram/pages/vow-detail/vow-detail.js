'use strict'

const { fmtNum, fmtDayCN } = require('../../utils/format')
const { displayVowName } = require('../../utils/vow-name')
const { addDays } = require('../../services/domain/index')

const store = getApp().globalData.store

const CHART_DAYS = 30
const CHART_HEIGHT = 180

function etaLabel(eta) {
  return eta ? eta.slice(0, 7) : '记录一段时间后可估算'
}

Page({
  data: {
    ready: false,
    done: false,
    totalText: '0',
    targetText: '0',
    percent: 0,
    unit: '声',
    startDate: '',
    deadline: '',
    avgText: '',
    etaText: '',
    days: 0,
    practiceId: '',
    bars: [],
    chartMaxText: '',
    axisStart: ''
  },

  onLoad(options) {
    this.vowId = (options && options.id) || ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    if (!this.vowId) {
      this.notFound()
      return
    }

    const vow = store.vows().find(v => v.id === this.vowId)
    const progress = vow ? store.vowProgress(vow.id) : null
    if (!vow || !progress) {
      this.notFound()
      return
    }

    const practice = store.getPracticeAny(vow.practiceId)
    const unit = practice ? practice.unit || '声' : '声'
    const title = displayVowName(vow, practice)
    wx.setNavigationBarTitle({ title })

    if (progress.done) {
      this.setData({
        ready: true,
        done: true,
        totalText: fmtNum(progress.total),
        unit,
        title,
        days: progress.days,
        practiceId: vow.practiceId
      })
      return
    }

    const today = store.todayKey()
    const days = []
    let max = 0

    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const date = addDays(today, -i)
      const totals = store.dayTotals(date, vow.practiceId)
      const total = totals ? totals.total : 0
      if (total > max) max = total
      days.push({ date, total })
    }

    // 柱高由 JS 拼好样式串，WXML 不做内联插值；空柱保留 4rpx 底线
    const bars = days.map(day => {
      const h = max > 0 && day.total > 0
        ? Math.max(10, Math.round((day.total / max) * CHART_HEIGHT))
        : 0
      return {
        date: day.date,
        empty: h === 0,
        barStyle: `height: ${h > 0 ? h : 4}rpx;`
      }
    })

    this.setData({
      ready: true,
      title,
      done: false,
      totalText: fmtNum(progress.total),
      targetText: fmtNum(progress.target),
      percent: progress.percent,
      barStyle: `width: ${progress.percent}%;`,
      unit,
      startDate: vow.startDate,
      deadline: vow.deadline || '',
      avgText: `${fmtNum(progress.avgPerDay)} ${unit}`,
      etaText: etaLabel(progress.eta),
      days: progress.days,
      practiceId: vow.practiceId,
      bars,
      chartMaxText: max > 0 ? fmtNum(max) : '',
      axisStart: fmtDayCN(addDays(today, -(CHART_DAYS - 1)))
    })
  },

  notFound() {
    wx.showToast({ title: '大愿不存在', icon: 'none' })
    setTimeout(() => wx.navigateBack(), 600)
  },

  goEdit() {
    wx.navigateTo({ url: `/pages/vow-new/vow-new?id=${this.vowId}` })
  },

  goNewVow() {
    wx.navigateTo({
      url: `/pages/vow-new/vow-new?pid=${this.data.practiceId}`
    })
  },

  onDelete() {
    wx.showModal({
      title: '删除大愿',
      content: '删除后不可恢复，历史计数不受影响',
      confirmText: '删除',
      confirmColor: '#B3372D',
      success: res => {
        if (!res.confirm) return
        try {
          store.removeVow(this.vowId)
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' })
          return
        }
        wx.navigateBack()
      }
    })
  }
})
