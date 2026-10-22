'use strict'

const test = require('node:test')
const assert = require('node:assert')

const domain = require('../miniprogram/services/domain')
const { D1_0800, D2_0820 } = require('./helpers')

test('version 合并：新覆盖旧、相同忽略、旧者拒绝', () => {
  assert.strictEqual(domain.compareVersion(2, 1), 'newer')
  assert.strictEqual(domain.compareVersion(1, 2), 'older')
  assert.strictEqual(domain.compareVersion(1, 1), 'equal')
  assert.strictEqual(domain.compareVersion(undefined, 1), 'older')

  assert.strictEqual(domain.resolveUpsert(null, { version: 1 }).action, 'accept')
  assert.strictEqual(domain.resolveUpsert({ version: 1 }, { version: 2 }).action, 'accept')
  assert.strictEqual(domain.resolveUpsert({ version: 2 }, { version: 2 }).action, 'ignore')
  assert.strictEqual(domain.resolveUpsert({ version: 3 }, { version: 2 }).action, 'reject')
})

test('同一快照重复同步：覆盖不追加，总数不变', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)
  domain.settleUpTo(state, D2_0820) // 10-21 已成历史

  const snap = { deviceId: 'r1', epoch: 1, date: '2026-10-21', practiceId: p.id, total: 800, version: 1 }
  assert.deepStrictEqual(domain.applyDeviceSnapshot(state, snap), { applied: true, action: 'accept' })
  assert.deepStrictEqual(domain.applyDeviceSnapshot(state, { ...snap }), { applied: false, action: 'ignore' })
  assert.deepStrictEqual(domain.applyDeviceSnapshot(state, { ...snap, version: 2, total: 850 }), { applied: true, action: 'accept' })
  assert.deepStrictEqual(domain.applyDeviceSnapshot(state, { ...snap, version: 1, total: 999 }), { applied: false, action: 'reject' })

  const t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.ring, 850) // 乱序到达的旧版本不会把 850 退回 999 或 800
})

test('多戒指：按设备分开存再汇总', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)
  domain.settleUpTo(state, D2_0820)

  domain.applyDeviceSnapshot(state, { deviceId: 'r1', epoch: 1, date: '2026-10-21', practiceId: p.id, total: 500, version: 1 })
  domain.applyDeviceSnapshot(state, { deviceId: 'r2', epoch: 1, date: '2026-10-21', practiceId: p.id, total: 300, version: 1 })

  const t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.ring, 800)
})

test('epoch：清空换绑后旧历史保留，新数据另起归属互不覆盖', () => {
  const state = domain.createInitialState(D1_0800)
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D1_0800)
  domain.settleUpTo(state, D2_0820)

  domain.applyDeviceSnapshot(state, { deviceId: 'r1', epoch: 1, date: '2026-10-21', practiceId: p.id, total: 800, version: 1 })
  // 戒指清空换绑（新 epoch），新主人同日只有 50
  domain.applyDeviceSnapshot(state, { deviceId: 'r1', epoch: 2, date: '2026-10-21', practiceId: p.id, total: 50, version: 1 })

  const t = domain.dayTotals(state, '2026-10-21', p.id)
  assert.strictEqual(t.ring, 850) // 旧 epoch 的 800 永远保留 + 新 epoch 50
})

test('今天的快照映射到今日累积；重复拉取不累加', () => {
  const state = domain.createInitialState(D2_0820) // 今天 10-22
  const p = domain.createPractice(state, { id: 'p1', name: '阿弥陀佛', dailyTarget: 100 }, D2_0820)

  const snap = { deviceId: 'r1', epoch: 1, date: '2026-10-22', practiceId: p.id, total: 120, version: 1 }
  domain.applyDeviceSnapshot(state, snap)
  domain.applyDeviceSnapshot(state, { ...snap }) // 相同版本再同步
  domain.applyDeviceSnapshot(state, { ...snap, version: 2, total: 130 })

  const t = domain.dayTotals(state, '2026-10-22', p.id)
  assert.strictEqual(t.ring, 130)

  // 次日 settle：快照数进归档
  const t3 = new Date(2026, 9, 23, 8, 0).getTime()
  domain.settleUpTo(state, t3)
  assert.strictEqual(state.archives['2026-10-22'][p.id].ringRaw, 130)
})
