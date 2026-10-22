'use strict'

const test = require('node:test')
const assert = require('node:assert')

const domain = require('../miniprogram/services/domain')
const { D1_0800, D2_0820 } = require('./helpers')

test('calendarDayStatus：全部达标● / 部分◐ / 有缺○ / 无目标功课不参与', () => {
  const state = domain.createInitialState(D1_0800)
  const p1 = domain.createPractice(state, { id: 'p1', name: '六字', dailyTarget: 100 }, D1_0800)
  const p2 = domain.createPractice(state, { id: 'p2', name: '四字', dailyTarget: 100 }, D1_0800)
  domain.createPractice(state, { id: 'p3', name: '无目标', dailyTarget: null }, D1_0800)

  domain.startNewRound(state, 'phone', p1.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 100)
  assert.strictEqual(domain.calendarDayStatus(state, '2026-10-21'), 'partial') // p1达标 p2缺

  domain.startNewRound(state, 'phone', p2.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 50)
  assert.strictEqual(domain.calendarDayStatus(state, '2026-10-21'), 'partial')

  domain.tap(state, 'phone', D1_0800, 50)
  assert.strictEqual(domain.calendarDayStatus(state, '2026-10-21'), 'met') // 全部达标（无目标的 p3 不影响）

  // 全新一天无任何计数：有目标功课全缺 → missed
  domain.settleUpTo(state, D2_0820)
  assert.strictEqual(domain.calendarDayStatus(state, '2026-10-22'), 'missed')

  // 没有有目标的功课时 → none
  const s2 = domain.createInitialState(D1_0800)
  domain.createPractice(s2, { id: 'x', name: '无目标', dailyTarget: null }, D1_0800)
  assert.strictEqual(domain.calendarDayStatus(s2, '2026-10-21'), 'none')
})

test('practiceTotalsAll：跨归档日汇总 + 来源拆分 + 修行天数', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '六字', dailyTarget: 100 }, D1_0800)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 100)
  domain.settleUpTo(state, D2_0820)

  domain.startNewRound(state, 'phone', p.id, { ts: D2_0820 })
  domain.tap(state, 'phone', D2_0820, 50)
  domain.addEntry(state, { date: '2026-10-22', practiceId: p.id, amount: 30, ts: D2_0820 })

  const all = domain.practiceTotalsAll(state, p.id, D2_0820)
  assert.strictEqual(all.total, 180)
  assert.strictEqual(all.phone, 150)
  assert.strictEqual(all.manual, 30)
  assert.strictEqual(all.days, 2) // 两天都有量
})
