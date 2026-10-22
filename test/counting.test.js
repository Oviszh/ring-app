'use strict'

const test = require('node:test')
const assert = require('node:assert')

const domain = require('../miniprogram/services/domain')
const { D1_0800, D1_2350, D2_0010 } = require('./helpers')

function setup(ts = D1_0800) {
  const state = domain.createInitialState(ts)
  const practice = domain.createPractice(state, { id: 'p1', name: '南无阿弥陀佛', dailyTarget: 200 }, ts)
  return { state, practice }
}

test('tap：本轮与今日累积按来源 +1，双上下文各自独立', () => {
  const { state, practice } = setup()
  domain.startNewRound(state, 'ring', practice.id, { ts: D1_0800 })
  domain.startNewRound(state, 'phone', practice.id, { ts: D1_0800 })

  domain.tap(state, 'ring', D1_0800)
  domain.tap(state, 'ring', D1_0800)
  domain.tap(state, 'phone', D1_0800)

  assert.strictEqual(state.contexts.ring.roundCount, 2)
  assert.strictEqual(state.contexts.phone.roundCount, 1)
  const totals = domain.dayTotals(state, '2026-10-21', practice.id)
  assert.strictEqual(totals.ring, 2)
  assert.strictEqual(totals.phone, 1)
  assert.strictEqual(totals.total, 3)
})

test('vibrateEvery：每 108 次触发震动反馈', () => {
  const { state, practice } = setup()
  state.practices[0].vibrateEvery = 108
  domain.startNewRound(state, 'ring', practice.id, { ts: D1_0800 })
  let effect = null
  for (let i = 0; i < 108; i++) effect = domain.tap(state, 'ring', D1_0800)
  assert.strictEqual(effect.vibrate, true)
  effect = domain.tap(state, 'ring', D1_0800)
  assert.strictEqual(effect.vibrate, false)
})

test('跨零点：23:50 的计数归昨天，00:10 的归今天，本轮继续不清零', () => {
  const { state, practice } = setup(D1_2350)
  domain.startNewRound(state, 'ring', practice.id, { ts: D1_2350 })
  domain.tap(state, 'ring', D1_2350, 10)

  domain.tap(state, 'ring', D2_0010, 5) // 触发日切

  assert.strictEqual(state.currentDay, '2026-10-22')
  const y = domain.dayTotals(state, '2026-10-21', practice.id)
  assert.strictEqual(y.ring, 10)
  const t2 = domain.dayTotals(state, '2026-10-22', practice.id)
  assert.strictEqual(t2.ring, 5)
  assert.strictEqual(state.contexts.ring.roundCount, 15) // 本轮跨零点继续
})

test('startNewRound：切功课 + 本轮清零 + 提醒目标；取消提醒后计数继续', () => {
  const { state, practice } = setup()
  domain.startNewRound(state, 'ring', practice.id, { ts: D1_0800 })
  domain.tap(state, 'ring', D1_0800, 100)

  domain.startNewRound(state, 'ring', practice.id, {
    ts: D1_0800,
    reminder: { type: 'count', value: 500 }
  })
  assert.strictEqual(state.contexts.ring.roundCount, 0)
  assert.deepStrictEqual(state.contexts.ring.reminder, { type: 'count', value: 500 })

  domain.tap(state, 'ring', D1_0800, 200)
  const r = domain.reminderRemaining(state, 'ring', D1_0800)
  assert.strictEqual(r.remaining, 300)
  assert.strictEqual(r.done, false)

  domain.cancelReminder(state, 'ring')
  assert.strictEqual(domain.reminderRemaining(state, 'ring', D1_0800), null)
  domain.tap(state, 'ring', D1_0800, 1)
  assert.strictEqual(state.contexts.ring.roundCount, 201) // 计数不受取消影响
})

test('计时型提醒：按本轮起点算剩余时长，跨零点继续有效', () => {
  const { state, practice } = setup(D1_2350)
  domain.startNewRound(state, 'phone', practice.id, {
    ts: D1_2350,
    reminder: { type: 'time', value: 30 }
  })
  domain.tap(state, 'phone', D2_0010) // 跨零点操作触发日切

  const ctx = state.contexts.phone
  assert.deepStrictEqual(ctx.reminder, { type: 'time', value: 30 }) // 日切不清提醒
  const r = domain.reminderRemaining(state, 'phone', D2_0010)
  // 23:50 → 00:10 已过 20 分钟，30 分钟目标剩 10 分钟
  assert.strictEqual(r.remainingMs, 10 * 60000)
  assert.strictEqual(r.done, false)
})

test('计时型功课：锁计数，只计时；endRound 记时长与座数，跨零点按日切分', () => {
  const state = domain.createInitialState(D1_2350)
  const meditation = domain.createPractice(state, { id: 'pz', name: '禅坐', type: 'time', unit: '分钟', dailyTarget: 30 }, D1_2350)

  domain.startNewRound(state, 'phone', meditation.id, { ts: D1_2350 })
  assert.throws(() => domain.tap(state, 'phone', D1_2350), /TIME_PRACTICE_LOCKED/)

  domain.endRound(state, 'phone', D2_0010) // 00:10 结束，触发日切

  const y = domain.dayTotals(state, '2026-10-21', meditation.id)
  assert.ok(Math.abs(y.durationMin - 10) < 0.01, `昨天应约 10 分钟，实际 ${y.durationMin}`)
  const t2 = domain.dayTotals(state, '2026-10-22', meditation.id)
  assert.ok(Math.abs(t2.durationMin - 10) < 0.01, `今天应约 10 分钟，实际 ${t2.durationMin}`)
  assert.strictEqual(t2.times, 1)
})

test('无上下文点按报错', () => {
  const { state } = setup()
  assert.throws(() => domain.tap(state, 'ring', D1_0800), /NO_CONTEXT/)
})


test('undoTap：撤销一次本轮与该侧今日各 -1，减到 0 为止', () => {
  const { state, practice } = setup()
  domain.startNewRound(state, 'phone', practice.id, { ts: D1_0800 })
  domain.tap(state, 'phone', D1_0800, 3)
  assert.strictEqual(domain.undoTap(state, 'phone', D1_0800).undone, true)
  const t = domain.dayTotals(state, '2026-10-21', practice.id)
  assert.strictEqual(state.contexts.phone.roundCount, 2)
  assert.strictEqual(t.phone, 2)
  domain.undoTap(state, 'phone', D1_0800)
  domain.undoTap(state, 'phone', D1_0800)
  assert.strictEqual(domain.undoTap(state, 'phone', D1_0800).undone, false)
  assert.strictEqual(domain.dayTotals(state, '2026-10-21', practice.id).phone, 0)
})
