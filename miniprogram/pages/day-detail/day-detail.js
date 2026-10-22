// 当日详情（P9）：各功课当日汇总、来源拆分、手动填报展开与撤销
const { fmtNum, fmtDayCN, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store

function nameOf(practice) {
  return practice.displayName || practice.name
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmtClock(ts) {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

Page({
  data: {
    date: '',
    dateLabel: '',
    rows: [],
    empty: true
  },

  onLoad(options) {
    const date = (options && options.date) || store.todayKey()
    this.pid = (options && options.pid) || ''
    wx.setNavigationBarTitle({ title: fmtDayCN(date) })
    this.setData({ date, dateLabel: fmtDayCN(date) })
    this.offStore = store.onChange(() => {
      if (this.visible) this.refresh()
    })
    this.refresh()
  },

  onShow() {
    this.visible = true
    this.refresh()
  },

  onHide() {
    this.visible = false
  },

  onUnload() {
    if (this.offStore) this.offStore()
    this.offStore = null
  },

  // —— view-model ——

  refresh() {
    const date = this.data.date
    const expanded = {}
    for (const r of this.data.rows) if (r.expanded) expanded[r.id] = true

    const rows = []
    for (const p of store.allPractices()) {
      const t = store.dayTotals(date, p.id)
      if (!t) continue
      const hasTarget = t.target !== null && t.target !== undefined
      if (!(t.total > 0 || hasTarget)) continue
      rows.push(this.rowOf(t, expanded))
    }

    // options.pid 对应的行置顶高亮
    if (this.pid) {
      const i = rows.findIndex(r => r.id === this.pid)
      if (i > 0) rows.unshift(rows.splice(i, 1)[0])
      if (rows.length && rows[0].id === this.pid) rows[0].highlight = true
    }

    this.setData({ rows, empty: rows.length === 0 })
  },

  rowOf(t, expanded) {
    const p = t.practice
    const hasTarget = t.target !== null && t.target !== undefined
    const entries = store.entriesFor(this.data.date, p.id).map(e => ({
      id: e.id,
      amount: e.amount,
      amountText: fmtNum(e.amount),
      timeText: fmtClock(e.createdAt)
    }))

    let amountText = ''
    let targetText = ''

    if (t.isDuration) {
      amountText = fmtMinutes(t.durationMin)
      targetText = hasTarget ? `/ ${fmtMinutes(t.target)}` : ''
    } else {
      amountText = fmtNum(t.total)
      targetText = hasTarget ? `/ ${fmtNum(t.target)}` : ''
    }

    return {
      id: p.id,
      name: nameOf(p) + (p.deleted ? '（已删除）' : ''),
      unit: p.unit || '声',
      isDuration: !!t.isDuration,
      statusClass: t.status || 'none',
      amountText,
      targetText,
      sourceText: t.isDuration
        ? `仅计时 · ${t.times}座`
        : `戒指 ${fmtNum(t.ring)} · 手机 ${fmtNum(t.phone)} · 手动 ${fmtNum(t.manual)}`,
      entries,
      hasEntries: entries.length > 0,
      expanded: !!expanded[p.id],
      highlight: false
    }
  },

  // —— 交互 ——

  onRowTap(e) {
    const pid = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/correction/correction?date=${this.data.date}&pid=${pid}`
    })
  },

  onToggleEntries(e) {
    const index = Number(e.currentTarget.dataset.index)
    const row = this.data.rows[index]
    if (!row) return
    this.setData({ [`rows[${index}].expanded`]: !row.expanded })
  },

  onUndoEntry(e) {
    const ds = e.currentTarget.dataset
    wx.showModal({
      title: '撤销这笔填报？',
      content: `撤回 ${fmtNum(ds.amount)} ${ds.unit}（${ds.time} 填报），撤销后总量相应减少`,
      confirmText: '撤销',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return
        try {
          store.undoEntry(ds.entryId)
        } catch (err) {
          wx.showToast({ title: '撤销失败，请重试', icon: 'none' })
          return
        }
        this.refresh()
        wx.showToast({ title: '已撤销', icon: 'success' })
      }
    })
  }
})
