'use strict'

const store = getApp().globalData.store

function nameOf(practice) {
  return practice.displayName || practice.name
}

Page({
  data: {
    rows: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = store.practices()
    this.setData({
      rows: list.map((p, i) => ({
        id: p.id,
        name: nameOf(p),
        showOnHome: !!p.showOnHome,
        isFirst: i === 0,
        isLast: i === list.length - 1
      }))
    })
  },

  onToggleShow(e) {
    try {
      store.setShowOnHome(e.currentTarget.dataset.id, e.detail.value)
    } catch (err) {
      return
    }
    this.refresh()
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
    const to = from + delta
    if (!(from >= 0 && from < list.length && to >= 0 && to < list.length)) return

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
