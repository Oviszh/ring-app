'use strict'
const { validDay } = require('./time')
// 完整性校验用于发现截断/误改；不是加密或身份认证。
function checksum(text) {
  let hash = 2166136261
  for (let i=0; i<text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}
function validateState(s) {
  const fail = () => { throw new Error('备份数据结构不正确') }
  const obj = v => v && typeof v === 'object' && !Array.isArray(v)
  const nonnegative = n => Number.isFinite(n) && n >= 0
  if (!obj(s) || s.schemaVersion !== 1 || !validDay(s.currentDay)) fail()
  for (const k of ['practices','entries','adjustments','vows','devices']) if (!Array.isArray(s[k])) fail()
  for (const k of ['contexts','todayCounts','archives','deviceSnapshots','settings']) if (!obj(s[k])) fail()
  const ids = new Set()
  for (const p of s.practices) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || !['time','count'].includes(p.type) || !nonnegative(p.createdAt) || (p.dailyTarget !== null && !nonnegative(p.dailyTarget))) fail()
    ids.add(p.id)
  }
  for (const e of s.entries) if (!e || !ids.has(e.practiceId) || !validDay(e.date) || !Number.isSafeInteger(e.amount) || e.amount <= 0) fail()
  for (const a of s.adjustments) if (!a || !ids.has(a.practiceId) || !validDay(a.date) || !['phone','ring'].includes(a.source) || !Number.isSafeInteger(a.delta) || a.delta >= 0) fail()
  for (const v of s.vows) { if (!v || !ids.has(v.practiceId)) fail(); require('./vow').validateVow(v) }
  for (const [date, rows] of Object.entries(s.archives)) {
    if (!validDay(date) || !obj(rows)) fail()
    for (const [id,row] of Object.entries(rows)) {
      if (!ids.has(id) || !obj(row)) fail()
      for (const k of ['ringRaw','phoneRaw','manualTotal','durationMin','times','version']) if (!nonnegative(row[k])) fail()
      if (row.targetSnapshot !== null && !nonnegative(row.targetSnapshot)) fail()
    }
  }
  for (const [id,row] of Object.entries(s.todayCounts)) {
    if (!ids.has(id) || !obj(row)) fail()
    for (const k of ['ring','phone','durationMin','times']) if (!nonnegative(row[k])) fail()
  }
  for (const side of ['phone','ring']) {
    const c=s.contexts[side]
    if (c && (!ids.has(c.practiceId) || !nonnegative(c.startTs) || !nonnegative(c.roundCount))) fail()
  }
  return s
}
function exportBackup(state, ts) {
  const copy = JSON.parse(JSON.stringify(state))
  // 备份恢复后保留累计和本轮，不让离线时间变成计时时长。
  require('./counting').pausePhone(copy, ts)
  const payload = JSON.stringify(copy)
  return JSON.stringify({ format:'nianfo-backup', version:1, createdAt:ts, checksum:checksum(payload), payload })
}
function importBackup(text) {
  if (typeof text !== 'string' || text.length > 8 * 1024 * 1024) throw new Error('备份过大或格式不正确')
  const envelope = JSON.parse(text)
  if (envelope.format !== 'nianfo-backup' || envelope.version !== 1 || typeof envelope.payload !== 'string' || checksum(envelope.payload) !== envelope.checksum) throw new Error('备份校验失败，请选择完整的备份文件')
  const state = JSON.parse(envelope.payload, (key,value) => {
    if (['__proto__','constructor','prototype'].includes(key)) throw new Error('备份包含非法字段')
    return value
  })
  return validateState(state)
}
module.exports = { exportBackup, importBackup, validateState }
