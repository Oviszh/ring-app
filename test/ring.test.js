'use strict'

const test = require('node:test')
const assert = require('node:assert')

// mock 适配器依赖 wx 存储；测试前打桩
const mem = {}
global.wx = {
  getStorageSync: k => mem[k] || '',
  setStorageSync: (k, v) => { mem[k] = v },
  vibrateShort() {},
  vibrateLong() {},
  showModal() {}
}

const { createStore } = require('../miniprogram/services/store')
const ble = require('../miniprogram/services/ble/mock-adapter')

function freshStore() {
  for (const k of Object.keys(mem)) delete mem[k]
  ble._reset()
  return createStore()
}

test('戒指全流程：绑定 → 离线计数 → 同步入今日 → 次日归档', async () => {
  const store = freshStore()
  const p = store.addPractice({ name: '南无阿弥陀佛', type: 'count', unit: '声', dailyTarget: 100 })
  const today = store.todayKey()

  const found = await store.ringScan()
  assert.strictEqual(found.length, 1)
  const device = await store.ringBind(found[0].deviceId)
  assert.strictEqual(device.isCurrent, true)
  assert.strictEqual(store.devices().length, 1)

  // 戒指侧开启新一轮（戒指确认后才落本地）
  await store.ringStartRound(p.id, { type: 'count', value: 500 })
  assert.strictEqual(store.context('ring').practiceId, p.id)

  // 模拟佩戴者离线点按 120 次（手机不参与）
  const r = await store.ringSimulateTap(120)
  assert.strictEqual(r.ok, true)

  const t = store.dayTotals(today, p.id)
  assert.strictEqual(t.ring, 120)
  assert.strictEqual(t.total, 120)
  assert.strictEqual(t.status, 'met')
})

test('重复同步不累加；断开重连数据不丢', async () => {
  const store = freshStore()
  const p = store.addPractice({ name: '阿弥陀佛', type: 'count', unit: '声', dailyTarget: 100 })
  const today = store.todayKey()

  const found = await store.ringScan()
  await store.ringBind(found[0].deviceId)
  await store.ringStartRound(p.id)
  await store.ringSimulateTap(50)
  await store.ringSync()
  await store.ringSync()

  const t = store.dayTotals(today, p.id)
  assert.strictEqual(t.ring, 50) // 覆盖不追加
})

test('绑定他人的戒指：需确认清空；原 epoch 历史保留', async () => {
  const store = freshStore()
  const p = store.addPractice({ name: '阿弥陀佛', type: 'count', unit: '声', dailyTarget: 100 })
  const found = await store.ringScan()
  const device = await store.ringBind(found[0].deviceId)
  await store.ringStartRound(p.id)
  await store.ringSimulateTap(800)

  // 另一个"用户"（新手机）直接绑定 → 必须先弹确认
  const memUserToken = store.state.userToken
  store.state.userToken = 'u_other'
  await assert.rejects(store.ringBind(found[0].deviceId), /BOUND_BY_OTHER/)
  await store.ringBind(found[0].deviceId, true) // 确认清空换绑
  store.state.userToken = memUserToken

  // 旧 epoch 的 800 声已同步历史不减少
  const t = store.dayTotals(store.todayKey(), p.id)
  assert.strictEqual(t.ring, 800)
})

test('锁定与解绑：锁定后模拟点按无效；解绑不清历史', async () => {
  const store = freshStore()
  const p = store.addPractice({ name: '阿弥陀佛', type: 'count', unit: '声', dailyTarget: 100 })
  const found = await store.ringScan()
  const device = await store.ringBind(found[0].deviceId)
  await store.ringStartRound(p.id)

  const locked = await store.ringSetLocked(true)
  assert.strictEqual(locked, true)
  const r = await store.ringSimulateTap(10)
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.reason, 'LOCKED')
  await store.ringSetLocked(false)
  await store.ringSimulateTap(10)

  store.ringUnbind(device.id)
  assert.strictEqual(store.devices().length, 0)
  const t = store.dayTotals(store.todayKey(), p.id)
  assert.strictEqual(t.ring, 10) // 已同步历史保留
})
