'use strict'
function exportFile(text) {
  const path = `${wx.env.USER_DATA_PATH}/nianfo-backup.json`
  wx.getFileSystemManager().writeFileSync(path, text, 'utf8')
  if (!wx.shareFileMessage) return Promise.reject(new Error('请在手机微信中导出备份'))
  return new Promise((resolve,reject) => wx.shareFileMessage({ filePath:path, fileName:'念佛修行备份.json', success:resolve, fail:reject }))
}
function importFile() {
  return new Promise((resolve,reject) => wx.chooseMessageFile({ count:1, type:'file', extension:['json'], success(res) {
    try {
      const f=res.tempFiles[0]
      if (!f || f.size > 8*1024*1024) throw new Error('文件过大')
      resolve(wx.getFileSystemManager().readFileSync(f.path,'utf8'))
    } catch(e) { reject(e) }
  }, fail:reject }))
}
module.exports = { exportFile, importFile }
