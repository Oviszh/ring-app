'use strict'

const store = getApp().globalData.store
const VIBRATE_OPTIONS = ['无', '每100次', '每108次', '自定义']

function vibrateIndexOf(n) {
  if (!n) return 0
  if (n === 100) return 1
  if (n === 108) return 2
  return 3
}

Page({
  data: {
    ready: false,
    name: '',
    isPublic: false,
    displayName: '',
    placeholderName: '',
    isTime: false,
    unit: '声',
    dailyTargetInput: '',
    vibrateOptions: VIBRATE_OPTIONS,
    vibrateIndex: 0,
    vibrateLabel: VIBRATE_OPTIONS[0],
    vibrateEvery: 0,
    showCustomHint: false,
    showOnHome: true
  },

  onLoad(options) {
    this._id = options && options.id
    if (!this._id) {
      this.leaveMissing('功课不存在')
      return
    }

    const practice = store.getPractice(this._id)
    if (!practice) {
      this.leaveMissing('功课不存在')
      return
    }

    this.setData(this.viewFor(practice))
  },

  onShow() {
    if (!this._id) return
    const practice = store.getPractice(this._id)
    if (!practice) {
      this.leaveMissing('功课已被删除')
      return
    }
    this.setData(this.viewFor(practice))
  },

  onUnload() {
    clearTimeout(this._backTimer)
  },

  leaveMissing(message) {
    if (this._backTimer) return
    wx.showToast({ title: message, icon: 'none' })
    this._backTimer = setTimeout(() => {
      wx.navigateBack({
        delta: 1,
        fail() { wx.switchTab({ url: '/pages/today/today' }) }
      })
    }, 800)
  },

  viewFor(practice) {
    const target = practice.dailyTarget
    const vibrateIndex = vibrateIndexOf(practice.vibrateEvery)
    return {
      ready: true,
      name: practice.name,
      isPublic: !!practice.public,
      displayName: practice.displayName || '',
      placeholderName: practice.name,
      isTime: practice.type === 'time',
      unit: practice.type === 'time' ? '分钟' : (practice.unit || '声'),
      dailyTargetInput: target === null || target === undefined ? '' : String(target),
      vibrateIndex,
      vibrateLabel: VIBRATE_OPTIONS[vibrateIndex],
      vibrateEvery: practice.vibrateEvery || 0,
      showCustomHint: vibrateIndex === 3,
      showOnHome: practice.showOnHome !== false
    }
  },

  // —— 我的显示名 ——

  onDisplayNameInput(e) {
    this.setData({ displayName: e.detail.value })
  },

  onDisplayNameBlur(e) {
    this.saveDisplayName(e.detail.value)
  },

  onDisplayNameConfirm(e) {
    this.saveDisplayName(e.detail.value)
  },

  saveDisplayName(raw) {
    const practice = store.getPractice(this._id)
    if (!practice) return

    const text = raw === undefined ? this.data.displayName : raw
    const value = String(text || '').trim()
    if (value === (practice.displayName || '')) return

    store.setDisplayName(this._id, value)
    this.setData({ displayName: value })
    wx.showToast({ title: value ? '已保存' : '已恢复实名显示', icon: 'none' })
  },

  // —— 每日目标 ——

  onTargetInput(e) {
    this.setData({ dailyTargetInput: e.detail.value })
  },

  onTargetBlur(e) {
    this.saveTarget(e.detail.value)
  },

  onTargetConfirm(e) {
    this.saveTarget(e.detail.value)
  },

  saveTarget(raw) {
    const practice = store.getPractice(this._id)
    if (!practice) return

    const text = String(raw === undefined ? this.data.dailyTargetInput : raw).trim()

    if (!text) {
      const alreadyEmpty = practice.dailyTarget === null || practice.dailyTarget === undefined
      store.setDailyTarget(this._id, null)
      this.setData({ dailyTargetInput: '' })
      if (!alreadyEmpty) wx.showToast({ title: '已设为无目标', icon: 'none' })
      return
    }

    const target = Number(text)
    if (!Number.isInteger(target) || target <= 0) {
      wx.showToast({ title: '请输入大于 0 的整数', icon: 'none' })
      this.setData({
        dailyTargetInput: practice.dailyTarget === null || practice.dailyTarget === undefined
          ? ''
          : String(practice.dailyTarget)
      })
      return
    }

    if (practice.dailyTarget === target) {
      this.setData({ dailyTargetInput: String(target) })
      return
    }

    store.setDailyTarget(this._id, target)
    this.setData({ dailyTargetInput: String(target) })
    wx.showToast({ title: '已保存，次日生效', icon: 'none' })
  },

  // —— 震动提醒 ——

  onVibrateChange(e) {
    const index = Number(e.detail.value)
    if (index === 3) {
      this.openCustomVibrate()
      return
    }

    const value = index === 0 ? 0 : index === 1 ? 100 : 108
    store.setVibrateEvery(this._id, value)
    this.setData({
      vibrateIndex: index,
      vibrateLabel: VIBRATE_OPTIONS[index],
      vibrateEvery: value,
      showCustomHint: false
    })
    wx.showToast({
      title: value ? '已保存' : '已关闭震动提醒',
      icon: 'none'
    })
  },

  openCustomVibrate() {
    const practice = store.getPractice(this._id)
    if (!practice) return
    const current = practice.vibrateEvery || 0

    wx.showModal({
      title: '自定义震动提醒',
      content: current ? `当前为每 ${current} 次` : '',
      editable: true,
      placeholderText: '例如 300',
      confirmText: '保存',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return

        const value = Number(String(res.content || '').trim())
        if (!Number.isInteger(value) || value <= 0) {
          wx.showToast({ title: '请输入大于 0 的整数', icon: 'none' })
          return
        }

        store.setVibrateEvery(this._id, value)
        const index = vibrateIndexOf(value)
        this.setData({
          vibrateIndex: index,
          vibrateLabel: VIBRATE_OPTIONS[index],
          vibrateEvery: value,
          showCustomHint: index === 3
        })
        wx.showToast({
          title: index === 3 ? `已设为每 ${value} 次` : '已保存',
          icon: 'none'
        })
      }
    })
  },

  // —— 首页显示 / 删除 ——

  onShowOnHomeChange(e) {
    const checked = !!e.detail.value
    store.setShowOnHome(this._id, checked)
    this.setData({ showOnHome: checked })
    wx.showToast({
      title: checked ? '已显示在首页' : '已从首页隐藏',
      icon: 'none'
    })
  },

  onDelete() {
    wx.showModal({
      title: '删除功课？',
      content: '不影响历史统计与历史记录',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#B3372D',
      success: res => {
        if (!res.confirm) return

        try {
          store.removePractice(this._id)
        } catch (e) {
          wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          return
        }

        wx.showToast({ title: '已删除', icon: 'none' })
        clearTimeout(this._backTimer)
        this._backTimer = setTimeout(() => {
          wx.navigateBack({
            delta: 1,
            fail() { wx.switchTab({ url: '/pages/today/today' }) }
          })
        }, 500)
      }
    })
  }
})
