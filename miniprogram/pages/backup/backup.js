const store = getApp().globalData.store
const files = require('../../services/storage/backup-file')

Page({
  data: { busy: false, preview: null, hasRecovery: false, fromRecovery: false },

  onShow() { this.refreshRecovery() },
  refreshRecovery() {
    try { this.setData({ hasRecovery: !!store.recoveryBackup() }) }
    catch (e) { this.setData({ hasRecovery: false }) }
  },
  onRecovery() {
    try {
      const text = store.recoveryBackup()
      if (!text) return
      const state = store.inspectBackup(text)
      this._text = text
      this.setData({ fromRecovery: true, preview: { practices: state.practices.length, days: Object.keys(state.archives).length, date: state.currentDay } })
    } catch (e) { wx.showToast({ title: '暂时无法读取恢复副本', icon: 'none' }) }
  },

  async onExport() {
    if (this.data.busy) return
    this.setData({ busy: true })
    try {
      await files.exportFile(store.backup())
      wx.showToast({ title: '备份已导出' })
    } catch (e) {
      if (!/cancel/.test(e.errMsg || '')) {
        wx.showModal({
          title: '未能导出',
          content: '请在手机微信中使用此功能，将备份保存到文件传输助手。',
          showCancel: false
        })
      }
    } finally {
      this.setData({ busy: false })
    }
  },

  async onChoose() {
    if (this.data.busy) return
    this.setData({ busy: true })
    try {
      const text = await files.importFile()
      const state = store.inspectBackup(text)
      this._text = text
      this.setData({
        fromRecovery: false,
        preview: {
          practices: state.practices.length,
          days: Object.keys(state.archives).length,
          date: state.currentDay
        }
      })
    } catch (e) {
      if (!/cancel/.test(e.errMsg || '')) {
        wx.showModal({
          title: '无法读取备份',
          content: '未能校验这个文件。请选择由本小程序导出的完整备份文件。',
          showCancel: false
        })
      }
    } finally {
      this.setData({ busy: false })
    }
  },

  onRestore() {
    if (!this._text) return
    wx.showModal({
      title: '用备份恢复本机数据？',
      content: '恢复将替换当前记录，不会与当前数量相加。请先导出当前数据。恢复前还会在本机保留一份副本。',
      confirmText: '恢复',
      success: r => {
        if (!r.confirm) return
        try {
          store.restoreBackup(this._text)
          store.resume()
          this._text = null
          this.setData({ preview: null })
          this.refreshRecovery()
          wx.showToast({ title: '已恢复' })
        } catch (e) {
          wx.showModal({
            title: '恢复失败',
            content: '暂时未能恢复，请检查备份文件和手机存储空间后重试。',
            showCancel: false
          })
        }
      }
    })
  },

  onCancelPreview() {
    this._text = null
    this.setData({ preview: null })
  }
})
