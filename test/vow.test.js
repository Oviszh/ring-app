'use strict'

const test = require('node:test')
const assert = require('node:assert')

const domain = require('../miniprogram/services/domain')
const { D1_0800, D1_2350, D2_0010 } = require('./helpers')

test('大愿：累计含全部有效来源（戒指+手机+手动）+ 已有累计', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)

  const vow = domain.createVow(state, {
    id: 'v1', practiceId: p.id, name: '百万佛号',
    targetTotal: 1000, startDate: '2026-10-21', existingTotal: 100
  }, D1_0800)

  domain.startNewRound(state, 'ring', p.id, { ts: D1_0800 })
  domain.tap(state, 'ring', D1_0800, 100)
  domain.startNewRound(state, 'phone', p.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 200)
  domain.addEntry(state, { date: '2026-10-21', practiceId: p.id, amount: 200, ts: D1_0800 })

  let progress = domain.vowProgress(state, vow)
  assert.strictEqual(progress.total, 600) // 100 已有 + 100 戒指 + 200 手机 + 200 手动
  assert.strictEqual(progress.percent, 60)
  assert.strictEqual(progress.done, false)
  assert.strictEqual(progress.days, 1)
  assert.strictEqual(progress.avgPerDay, 600)
})

test('大愿跨日累加，数据归档后仍准确', () => {
  const state = domain.createInitialState(D1_2350)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_2350)
  const vow = domain.createVow(state, {
    id: 'v1', practiceId: p.id, targetTotal: 1000, startDate: '2026-10-21'
  }, D1_2350)

  domain.startNewRound(state, 'phone', p.id, { ts: D1_2350 })
  domain.tap(state, 'phone', D1_2350, 400)
  domain.tap(state, 'phone', D2_0010, 300) // 跨零点

  const progress = domain.vowProgress(state, vow)
  assert.strictEqual(progress.total, 700)
  assert.strictEqual(progress.days, 2)
  assert.strictEqual(progress.avgPerDay, 350)
  assert.strictEqual(progress.eta, '2026-10-23') // 还差 300，日均 350 → 1 天后
})

test('大愿圆满与开始日期在未来', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛' }, D1_0800)
  const vow = domain.createVow(state, {
    id: 'v1', practiceId: p.id, targetTotal: 100, startDate: '2026-10-25', existingTotal: 0
  }, D1_0800)
  let progress = domain.vowProgress(state, vow)
  assert.strictEqual(progress.total, 0)
  assert.strictEqual(progress.days, 0)

  const v2 = domain.createVow(state, {
    id: 'v2', practiceId: p.id, targetTotal: 100, startDate: '2026-10-21', existingTotal: 150
  }, D1_0800)
  progress = domain.vowProgress(state, v2)
  assert.strictEqual(progress.done, true)
  assert.strictEqual(progress.percent, 100)
})
