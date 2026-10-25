// 当日详情（P9）：各功课当日汇总、来源拆分、手动填报展开与撤销
const { sourceText, fmtNum, fmtDayCN, fmtMinutes } = require('../../utils/format')

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
    groups: [],
    empty: true,
    entryVisible: false,
    canEntry: false
  },

  onLoad(options) {
    this._edits = {}
    this._saving = {}
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
      let t = store.dayTotals(date, p.id)
      if (p.deleted && (!t || !(t.total || store.entriesFor(date, p.id).length))) continue
      if (!t) t = { practice: p, target: null, total: 0, ring: 0, phone: 0, manual: 0, durationMin: 0, times: 0, isDuration: p.type === 'time', status: 'none' }
      rows.push(this.rowOf(t, expanded))
    }

    // options.pid 对应的行在所属分组内置顶高亮
    if (this.pid) {
      const i = rows.findIndex(r => r.id === this.pid)
      if (i > 0) rows.unshift(rows.splice(i, 1)[0])
      if (rows.length && rows[0].id === this.pid) rows[0].highlight = true
    }

    rows.forEach((row, index) => { row.rowIndex = index })
    this.setData({ rows, groups: this.groupRows(rows), empty: rows.length === 0, canEntry: store.practices().length > 0 && date <= store.todayKey() })
  },

  groupRows(rows) {
    return [{ id: 'main', title: '主修功课' }, { id: 'common', title: '常用功课' }]
      .map(group => ({ ...group, rows: rows.filter(row => row.group === group.id) }))
      .filter(group => group.rows.length > 0)
  },

  rowOf(t, expanded) {
    const p = t.practice
    const hasTarget = t.target !== null && t.target !== undefined
    const entries = store.entriesFor(this.data.date, p.id).map(e => ({
      id: e.id,
      amount: e.amount,
      amountText: (e.amount > 0 ? '＋' : '−') + (p.type === 'time' ? String(Number(Math.abs(e.amount).toFixed(3))) : fmtNum(Math.abs(e.amount))),
      changeText: e.method === 'set-total' ? `${fmtNum(e.beforeTotal)} → ${fmtNum(e.afterTotal)} ${p.unit}` : '',
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
      name: nameOf(p),
      unit: p.type === 'time' ? '分钟' : (p.unit || '声'),
      isDuration: !!t.isDuration,
      statusClass: t.status || 'none',
      amountText,
      total: t.total,
      inputValue: this._edits && this._edits[p.id] ? this._edits[p.id].value : String(Math.round(t.total)),
      timingActive: t.isDuration && this.data.date === store.todayKey() && ['phone', 'ring'].some(side => store.context(side) && store.context(side).practiceId === p.id),
      canEdit: !p.deleted && this.data.date <= store.todayKey() && !(t.isDuration && this.data.date === store.todayKey() && ['phone', 'ring'].some(side => store.context(side) && store.context(side).practiceId === p.id)),
      groupName: p.group === 'common' ? '常用' : '主修',
      group: p.group === 'common' ? 'common' : 'main',
      targetText,
      sourceText: t.isDuration
        ? `仅计时 · ${t.times}座`
        : sourceText(t),
      entries,
      hasEntries: entries.length > 0,
      expanded: !!expanded[p.id],
      highlight: false
    }
  },

  // —— 交互 ——

  noop() {},

  onTotalFocus(e) {
    const id = e.currentTarget.dataset.id
    const row = this.data.rows.find(r => r.id === id)
    if (!row || !row.canEdit) return
    const current = store.dayTotals(this.data.date, id)
    this._edits[id] = { total: current ? current.total : 0, value: row.inputValue }
  },
  onTotalInput(e) {
    const id = e.currentTarget.dataset.id
    if (!this._edits[id]) return
    this._edits[id].value = e.detail.value
  },
  onTotalCommit(e) {
    const id = e.currentTarget.dataset.id
    const draft = this._edits[id]
    if (!draft || this._saving[id]) return
    const value = String(e.detail.value).trim()
    const total = Number(value)
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(total)) {
      delete this._edits[id]; this.refresh()
      wx.showToast({ title: '请填写 0 或正整数', icon: 'none' }); return
    }
    if (total === Math.round(draft.total)) { delete this._edits[id]; this.refresh(); return }
    this._saving[id] = true
    try {
      const entry = store.setDayTotal({ date: this.data.date, practiceId: id, total, expectedTotal: draft.total })
      delete this._edits[id]
      this.refresh()
      if (entry) wx.showToast({ title: `已补录 ${entry.amount > 0 ? '+' : ''}${Number(entry.amount.toFixed(3))}`, icon: 'none' })
    } catch (err) {
      delete this._edits[id]; this.refresh()
      wx.showToast({ title: err.message === 'TOTAL_CHANGED' ? '当前数值有更新，请核对后重填' : err.message === 'TIMING_ACTIVE' ? '请先结束静坐，再修改时长' : '未能保存，请重试', icon: 'none' })
    } finally { delete this._saving[id] }
  },

  openEntry() { this.setData({ entryVisible: true }) },
  closeEntry() { this.setData({ entryVisible: false }) },
  onEntrySaved() { this.refresh() },
  onRowTap(e) {
    const index = this.data.rows.findIndex(r => r.id === e.currentTarget.dataset.id)
    if (index >= 0 && this.data.rows[index].hasEntries) this.onToggleEntries({ currentTarget: { dataset: { index } } })
  },

  onToggleEntries(e) {
    const index = Number(e.currentTarget.dataset.index)
    const row = this.data.rows[index]
    if (!row) return
    const rows = this.data.rows.map((r, i) => i === index ? { ...r, expanded: !r.expanded } : r)
    this.setData({ rows, groups: this.groupRows(rows) })
  },

  onUndoEntry(e) {
    const ds = e.currentTarget.dataset
    wx.showModal({
      title: '撤销这笔补录？',
      content: `撤销补录 ${fmtNum(ds.amount)} ${ds.unit}（${ds.time} 补录），撤销后总量相应恢复`,
      confirmText: '撤销',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return
        try {
          store.undoEntry(ds.entryId)
        } catch (err) {
          wx.showToast({ title: err.message === 'NEGATIVE_RESULT' ? '请先撤销相关减少补录，避免总数小于 0' : '撤销失败，请重试', icon: 'none' })
          return
        }
        this.refresh()
        wx.showToast({ title: '已撤销', icon: 'success' })
      }
    })
  }
})
