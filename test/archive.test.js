'use strict'

const test = require('node:test')
const assert = require('node:assert')

const domain = require('../miniprogram/services/domain')
const { D1_0800, D2_0820 } = require('./helpers')

test('归档：settle 快照当日目标；修改目标次日生效，历史判断用快照', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 108 }, D1_0800)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 100)

  domain.settleUpTo(state, D2_0820) // 推进到 10-22

  const row = state.archives['2026-10-21'][p.id]
  assert.strictEqual(row.phoneRaw, 100)
  assert.strictEqual(row.targetSnapshot, 108)

  domain.setDailyTarget(state, p.id, 500)
  assert.strictEqual(domain.effectiveTarget(state, p.id, '2026-10-21'), 108) // 历史：快照
  assert.strictEqual(domain.effectiveTarget(state, p.id, '2026-10-22'), 108) // 当日快照不变，次日新目标
  assert.strictEqual(domain.effectiveTarget(state, p.id, '2026-10-23'), null) // 未来：不算
})

test('目标快照只写一次：补齐的历史行不被新目标污染', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 108 }, D1_0800)
  domain.settleUpTo(state, D2_0820)
  const row = state.archives['2026-10-21'][p.id]
  assert.strictEqual(row.targetSnapshot, 108)
  domain.setDailyTarget(state, p.id, 1000)
  // 再次触碰该行（例如补填），快照仍是最初值
  domain.addEntry(state, { date: '2026-10-21', practiceId: p.id, amount: 50, ts: D2_0820 })
  assert.strictEqual(state.archives['2026-10-21'][p.id].targetSnapshot, 108)
})

test('补归档：跨多天未打开，逐日封盘（含零计数日）', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛' }, D1_0800)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 7)

  const t4 = new Date(2026, 9, 24, 9, 0).getTime()
  domain.settleUpTo(state, t4)

  assert.strictEqual(state.currentDay, '2026-10-24')
  assert.strictEqual(state.archives['2026-10-21'][p.id].phoneRaw, 7)
  assert.ok(state.archives['2026-10-22'][p.id], '零计数日也应封盘')
  assert.strictEqual(state.archives['2026-10-22'][p.id].phoneRaw, 0)
  assert.ok(state.archives['2026-10-23'][p.id])
  assert.deepStrictEqual(state.todayCounts, {})
})

test('dayTotals 公式：总数 = 戒指 + 手机 + 手动 + 修正；状态判定正确', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)
  domain.startNewRound(state, 'ring', p.id, { ts: D1_0800 })
  domain.tap(state, 'ring', D1_0800, 60)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 50)
  domain.addEntry(state, { date: '2026-10-21', practiceId: p.id, amount: 20, ts: D1_0800 })
  domain.addAdjustment(state, { date: '2026-10-21', practiceId: p.id, source: 'ring', toValue: 40, ts: D1_0800 })

  const t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.ring, 40)      // 60 - 20
  assert.strictEqual(t.phone, 50)
  assert.strictEqual(t.manual, 20)
  assert.strictEqual(t.total, 110)
  assert.strictEqual(t.status, 'met')  // 110 >= 100

  domain.setDailyTarget(state, p.id, 500)
  assert.strictEqual(domain.dayTotals(state, '2026-10-21', p.id).status, 'met')
})

test('状态口径：零计数有目标 = missed；无目标 = none', () => {
  const state = domain.createInitialState(D1_0800)
  const p1 = domain.createPractice(state, { id: 'p1', name: '有目标', dailyTarget: 108 }, D1_0800)
  const p2 = domain.createPractice(state, { id: 'p2', name: '无目标', dailyTarget: null }, D1_0800)
  assert.strictEqual(domain.dayTotals(state, '2026-10-21', p1.id).status, 'missed')
  assert.strictEqual(domain.dayTotals(state, '2026-10-21', p2.id).status, 'none')
})

test('删除功课不影响历史统计', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 108 }, D1_0800)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 200)
  domain.settleUpTo(state, D2_0820)
  domain.removePractice(state, p.id)
  const t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.total, 200)
  assert.strictEqual(t.status, 'met')
})
