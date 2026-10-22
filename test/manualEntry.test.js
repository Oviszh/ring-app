'use strict'

const test = require('node:test')
const assert = require('node:assert')

const domain = require('../miniprogram/services/domain')
const { D1_0800, D2_0820 } = require('./helpers')

test('填报今日：计入今日累积/目标/大愿口径，可整笔撤销', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '南无阿弥陀佛', dailyTarget: 2000 }, D1_0800)

  const e = domain.addEntry(state, { date: '2026-10-21', practiceId: p.id, amount: 500, ts: D1_0800 })
  let t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.manual, 500)
  assert.strictEqual(t.total, 500)

  domain.undoEntry(state, e.id)
  t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.manual, 0)
  assert.strictEqual(t.total, 0)
})

test('补填过去日期：直接落到该日归档，撤销后日历同步更新', () => {
  const state = domain.createInitialState(D2_0820) // 今天是 10-22
  const p = domain.createPractice(state, { id: 'p1', name: '南无阿弥陀佛', dailyTarget: 100 }, D2_0820)

  const e = domain.addEntry(state, { date: '2026-10-21', practiceId: p.id, amount: 500, ts: D2_0820 })
  let y = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(y.manual, 500)
  assert.strictEqual(y.total, 500)
  assert.strictEqual(y.status, 'met')

  domain.undoEntry(state, e.id)
  y = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(y.manual, 0)
  assert.strictEqual(y.status, 'missed')
})

test('未来日期与非法数量拒绝', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '南无阿弥陀佛' }, D1_0800)
  assert.throws(() => domain.addEntry(state, { date: '2026-10-22', practiceId: p.id, amount: 10, ts: D1_0800 }), /FUTURE_DATE/)
  assert.throws(() => domain.addEntry(state, { date: '2026-10-21', practiceId: p.id, amount: 0, ts: D1_0800 }), /AMOUNT_POSITIVE/)
  assert.throws(() => domain.undoEntry(state, 'nope'), /NO_ENTRY/)
})

test('修正：只许减少、必须标来源、撤销即恢复', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)
  domain.startNewRound(state, 'ring', p.id, { ts: D1_0800 })
  domain.tap(state, 'ring', D1_0800, 100)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 60)

  // 把戒指来源从 100 减到 80
  const adj = domain.addAdjustment(state, { date: '2026-10-21', practiceId: p.id, source: 'ring', toValue: 80, ts: D1_0800 })
  assert.strictEqual(adj.delta, -20)
  let t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.ring, 80)
  assert.strictEqual(t.phone, 60)
  assert.strictEqual(t.total, 140)

  // 增加被拒绝（应走填报）
  assert.throws(() => domain.addAdjustment(state, { date: '2026-10-21', practiceId: p.id, source: 'ring', toValue: 90, ts: D1_0800 }), /REDUCE_ONLY/)
  // 不允许为负
  assert.throws(() => domain.addAdjustment(state, { date: '2026-10-21', practiceId: p.id, source: 'phone', toValue: -5, ts: D1_0800 }), /REDUCE_ONLY|NEGATIVE_RESULT/)
  // 来源必填
  assert.throws(() => domain.addAdjustment(state, { date: '2026-10-21', practiceId: p.id, source: 'manual', toValue: 1, ts: D1_0800 }), /SOURCE_REQUIRED/)

  // 撤销修正 = 恢复
  domain.undoAdjustment(state, adj.id)
  t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.ring, 100)
  assert.strictEqual(t.total, 160)
  assert.throws(() => domain.undoAdjustment(state, adj.id), /NO_ADJUSTMENT/)
})

test('修正作用于历史归档日：原始同步数与修正分开保存', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 300)
  domain.settleUpTo(state, D2_0820)

  domain.addAdjustment(state, { date: '2026-10-21', practiceId: p.id, source: 'phone', toValue: 250, ts: D2_0820 })
  const row = state.archives['2026-10-21'][p.id]
  assert.strictEqual(row.phoneRaw, 300) // 原始数不被触碰
  const t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.phone, 250)
  assert.strictEqual(t.total, 250)
})
