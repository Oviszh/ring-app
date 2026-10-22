const store = getApp().globalData.store
const files = require('../../services/storage/backup-file')
Page({
 data: { busy:false, preview:null },
 async onExport() {
  if(this.data.busy) return
  this.setData({busy:true})
  try { await files.exportFile(store.backup()); wx.showToast({title:'备份已导出'}) }
  catch(e) { if(!/cancel/.test(e.errMsg||'')) wx.showModal({title:'未能导出',content:'请在手机微信中使用此功能，将备份保存到文件传输助手。',showCancel:false}) }
  finally { this.setData({busy:false}) }
 },
 async onChoose() {
  if(this.data.busy) return
  this.setData({busy:true})
  try {
   const text=await files.importFile(); const state=store.inspectBackup(text)
   this._text=text
   this.setData({preview:{practices:state.practices.length,days:Object.keys(state.archives).length,date:state.currentDay}})
  } catch(e) { if(!/cancel/.test(e.errMsg||'')) wx.showModal({title:'无法读取备份',content:e.message||'请选择完整的 JSON 备份文件。',showCancel:false}) }
  finally { this.setData({busy:false}) }
 },
 onRestore() {
  if(!this._text) return
  wx.showModal({title:'用备份恢复本机数据？',content:'恢复将替换当前记录，不会与当前数量相加。请先导出当前数据。恢复前还会在本机保留一份副本。',confirmText:'恢复',success:r=>{
   if(!r.confirm) return
   try {store.restoreBackup(this._text);store.resume();this._text=null;this.setData({preview:null});wx.showToast({title:'已恢复'})}
   catch(e){wx.showModal({title:'恢复失败',content:e.message||'请检查文件和存储空间',showCancel:false})}
  }})
 }
})
