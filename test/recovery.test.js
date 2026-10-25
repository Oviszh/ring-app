'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { createStore } = require('../miniprogram/services/store')

function storage() {
  const records = new Map()
  global.wx = {
    getStorageSync: key => records.has(key) ? JSON.parse(records.get(key)) : null,
    setStorageSync: (key, value) => records.set(key, JSON.stringify(value)),
    showModal() {}
  }
}

test('导入备份后可以恢复导入前的记录，坏备份不覆盖恢复副本', () => {
  storage()
  try {
    const s = createStore()
    const p = s.addPractice({ name: '念佛', dailyTarget: null })
    s.startRound('phone', p.id)
    s.tap('phone')
    const old = s.backup()
    s.addEntry({ practiceId: p.id, date: s.todayKey(), amount: 108 })
    s.restoreBackup(old)
    assert.equal(s.practiceTotalsAll(p.id).total, 1)
    const recovery = s.recoveryBackup()
    assert.ok(recovery)
    assert.throws(() => s.restoreBackup('not a backup'))
    assert.equal(s.inspectBackup(s.recoveryBackup()).entries[0].amount, 108)
    s.restoreBackup(recovery)
    assert.equal(s.practiceTotalsAll(p.id).total, 109)
  } finally { delete global.wx }
})

test('恢复副本中的静坐停留在导入时刻，之后等待的时间不计入', () => {
  storage()
  const realNow = Date.now
  let ts = new Date(2026, 9, 24, 9).getTime()
  Date.now = () => ts
  try {
    const s = createStore()
    const p = s.addPractice({ name: '禅坐', type: 'time', dailyTarget: 30 })
    const before = s.backup()
    s.startRound('phone', p.id)
    ts += 60000
    s.restoreBackup(before)
    ts += 3 * 3600000
    const recovery = s.recoveryBackup()
    s.restoreBackup(recovery)
    s.resume()
    assert.equal(s.dayTotals(s.todayKey(), p.id).durationMin, 1)
  } finally { Date.now = realNow; delete global.wx }
})
