'use strict'

const store = getApp().globalData.store

function nameOf(practice) {
  return practice.displayName || practice.name
}

Page({
  data: {
    rows: [], groupOptions: ['主修功课', '常用功课']
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = store.practices()
    const rows = list.map((p, i) => ({
        id: p.id, group: p.group || 'main', groupIndex: p.group === 'common' ? 1 : 0, orderIndex: i,
        name: nameOf(p),
        isFirst: i === 0,
        isLast: i === list.length - 1
      }))
    for (const row of rows) {
      const peers = rows.filter(p => p.group === row.group)
      row.isFirst = peers[0] === row
      row.isLast = peers[peers.length - 1] === row
    }
    this.setData({ rows, groups: [{ name: '主修功课', rows: rows.filter(p => p.group !== 'common') }, { name: '常用功课', rows: rows.filter(p => p.group === 'common') }] })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const practice = store.getPractice(id)
    if (!practice || this._deleting) return
    this._deleting = true
    wx.showModal({
      title: '删除功课？',
      content: `“${nameOf(practice)}”将从当前功课列表移除，历史修行记录会保留。`,
      confirmText: '删除', cancelText: '取消', confirmColor: '#B3372D',
      success: res => {
        if (!res.confirm) { this._deleting = false; return }
        try {
          if (!store.getPractice(id)) return
          store.removePractice(id)
          wx.showToast({ title: '已删除', icon: 'none' })
        } catch (err) { wx.showToast({ title: '删除失败，请重试', icon: 'none' }) }
        finally { this._deleting = false; this.refresh() }
      },
      fail: () => { this._deleting = false }
    })
  },
  onGroupChange(e) {
    const value = Number(e.detail.value)
    if (value !== 0 && value !== 1) return
    try {
      store.setPracticeGroup(e.currentTarget.dataset.id, value === 1 ? 'common' : 'main')
      this.refresh()
      wx.showToast({ title: value === 1 ? '已改为常用功课' : '已改为主修功课', icon: 'none' })
    } catch (err) { wx.showToast({ title: '未能保存，请重试', icon: 'none' }) }
  },

  onMoveUp(e) {
    this.move(Number(e.currentTarget.dataset.index), -1)
  },

  onMoveDown(e) {
    this.move(Number(e.currentTarget.dataset.index), 1)
  },

  // 与相邻行交换；向上/向下越界时忽略
  move(from, delta) {
    const list = store.practices()
    if (!list[from]) return
    const group = list[from].group || 'main'
    const indices = list.map((p, i) => (p.group || 'main') === group ? i : -1).filter(i => i >= 0)
    const to = indices[indices.indexOf(from) + delta]
    if (to === undefined) return

    const ids = list.map(p => p.id)
    const tmp = ids[from]
    ids[from] = ids[to]
    ids[to] = tmp
    store.reorderPractices(ids)
    this.refresh()
  },

  onOpenSettings(e) {
    wx.navigateTo({
      url: '/pages/practice-settings/practice-settings?id=' + e.currentTarget.dataset.id
    })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/practice-add/practice-add' })
  }
})
