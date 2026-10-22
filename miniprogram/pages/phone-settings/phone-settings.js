'use strict'

const store = getApp().globalData.store

const SOUND_OPTIONS = [
  { key: 'muyu', name: '木鱼' },
  { key: 'qing', name: '引磬' },
  { key: 'silent', name: '静音震动' }
]

const THEME_OPTIONS = [
  { key: 'muyu', name: '木鱼' },
  { key: 'lotus', name: '莲花' },
  { key: 'beads', name: '念珠' }
]

function indexOfKey(options, key, fallback) {
  const i = options.findIndex(o => o.key === key)
  return i >= 0 ? i : fallback
}

function toast(title) {
  wx.showToast({ title, icon: 'none' })
}

Page({
  data: {
    sound: true,
    soundIndex: 0,
    soundName: SOUND_OPTIONS[0].name,
    soundOptions: SOUND_OPTIONS,
    vibrate: true,
    themeIndex: 0,
    themeName: THEME_OPTIONS[0].name,
    themeOptions: THEME_OPTIONS,
    undoConfirm: true
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const s = store.state.settings
    const soundIndex = indexOfKey(SOUND_OPTIONS, s.soundName, 0)
    const themeIndex = indexOfKey(THEME_OPTIONS, s.theme, 0)
    this.setData({
      sound: s.sound !== false,
      soundIndex,
      soundName: SOUND_OPTIONS[soundIndex].name,
      vibrate: s.vibrate !== false,
      themeIndex,
      themeName: THEME_OPTIONS[themeIndex].name,
      undoConfirm: s.undoConfirm !== false
    })
  },

  onSoundChange(e) {
    const value = !!e.detail.value
    store.setSetting('sound', value)
    this.refresh()
    toast(value ? '音效已开启' : '音效已关闭')
  },

  onSoundNameChange(e) {
    const option = SOUND_OPTIONS[Number(e.detail.value)] || SOUND_OPTIONS[0]
    store.setSetting('soundName', option.key)
    this.refresh()
    toast('音效选择：' + option.name)
  },

  onVibrateChange(e) {
    const value = !!e.detail.value
    store.setSetting('vibrate', value)
    this.refresh()
    toast(value ? '震动已开启' : '震动已关闭')
  },

  onThemeChange(e) {
    const option = THEME_OPTIONS[Number(e.detail.value)] || THEME_OPTIONS[0]
    store.setSetting('theme', option.key)
    this.refresh()
    toast('外观：' + option.name)
  },

  onUndoConfirmChange(e) {
    const value = !!e.detail.value
    store.setSetting('undoConfirm', value)
    this.refresh()
    toast(value ? '撤销前会询问' : '撤销不再询问')
  }
})
