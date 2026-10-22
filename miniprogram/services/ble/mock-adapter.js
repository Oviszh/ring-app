'use strict'

// ============================================================
// 模拟戒指（mock BLE）：供无硬件开发/演示。
// 内置持久化（独立于业务 state），模拟真实戒指的完整行为：
// 离线计数、RTC 日切快照、owner_token、epoch、锁定、提醒。
// 真机就绪后由 wechat-adapter.js 以同一接口替换，页面零改动。
// ============================================================

const KEY = 'mock_ring_v1'

const DEFAULT_STATE = () => ({
  deviceId: 'ring-demo-a3f2',
  name: '念佛戒指 R1-DEMO',
  model: 'R11M',
  firmware: 'v0.1-mock',
  battery: 82,
  ownerToken: null,      // null=未绑定；否则为绑定方 token
  epoch: 1,
  locked: false,
  currentPracticeId: null,
  roundCount: 0,
  roundStartTs: null,
  snapshots: {},         // { 'YYYY-MM-DD|practiceId': { date, practiceId, total, version } }
  ops: {},               // { opId: true } 幂等回执
  reminder: null         // { type, value, baseRound }
})

let ring = null
let connected = false

function now() { return Date.now() }

function dayKey(ts) {
  const d = new Date(ts)
  const p = n => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function load() {
  if (ring) return ring
  try {
    ring = JSON.parse(wx.getStorageSync(KEY)) || DEFAULT_STATE()
  } catch (e) {
    ring = DEFAULT_STATE()
  }
  return ring
}

function save() {
  try { wx.setStorageSync(KEY, JSON.stringify(ring)) } catch (e) {}
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms || 120))
}

function mustConnect() {
  if (!connected) return Promise.reject(new Error('RING_NOT_CONNECTED'))
  return null
}

function snapKey(date, pid) { return `${date}|${pid}` }

function bumpSnapshot(pid, ts) {
  const date = dayKey(ts)
  const k = snapKey(date, pid)
  if (!ring.snapshots[k]) ring.snapshots[k] = { date, practiceId: pid, total: 0, version: 0 }
  ring.snapshots[k].total += 1
  ring.snapshots[k].version += 1
}

// 调试/演示用：模拟戒指被触摸点按（真实戒指在手指上离线完成的事）
function simulateTap(n) {
  load()
  const count = n || 1
  if (!ring.currentPracticeId) return { ok: false, reason: 'NO_PRACTICE' }
  if (ring.locked) return { ok: false, reason: 'LOCKED' }
  for (let i = 0; i < count; i++) bumpSnapshot(ring.currentPracticeId, now())
  ring.roundCount += count
  save()
  return { ok: true, roundCount: ring.roundCount }
}

module.exports = {
  kind: 'mock',

  // —— 扫描/连接 ——
  scan() {
    load()
    save()
    return delay(600).then(() => ([{
      deviceId: ring.deviceId,
      name: ring.name,
      rssi: -45 + Math.floor(Math.random() * 10)
    }]))
  },

  connect(deviceId) {
    load()
    if (deviceId !== ring.deviceId) return Promise.reject(new Error('DEVICE_NOT_FOUND'))
    return delay(400).then(() => { connected = true; return { deviceId } })
  },

  disconnect() {
    connected = false
    return Promise.resolve()
  },

  isConnected() { return connected },

  // —— 状态与归属 ——
  readDeviceState() {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => ({
      deviceId: ring.deviceId,
      name: ring.name,
      model: ring.model,
      firmware: ring.firmware,
      battery: ring.battery,
      locked: ring.locked,
      epoch: ring.epoch,
      ownerToken: ring.ownerToken,
      currentPracticeId: ring.currentPracticeId,
      roundCount: ring.roundCount,
      roundStartTs: ring.roundStartTs,
      reminder: ring.reminder
    }))
  },

  syncTime() {
    const err = mustConnect()
    if (err) return err
    return delay().then(() => ({ ok: true }))
  },

  writeOwnerToken(token) {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => { ring.ownerToken = token; save(); return { ok: true } })
  },

  clearAllAndCreateEpoch(opId) {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => {
      ring.epoch += 1
      ring.ownerToken = null
      ring.currentPracticeId = null
      ring.roundCount = 0
      ring.roundStartTs = null
      ring.snapshots = {}
      ring.reminder = null
      ring.ops = {}
      ring.ops[opId] = true
      save()
      return { ok: true, epoch: ring.epoch }
    })
  },

  // —— 操作（带 opId 幂等） ——
  startNewRound({ practiceId, reminder, opId }) {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => {
      if (ring.ops[opId]) return { ok: true, idempotent: true }
      ring.ops[opId] = true
      ring.currentPracticeId = practiceId
      ring.roundCount = 0
      ring.roundStartTs = now()
      ring.reminder = reminder || null
      save()
      return { ok: true }
    })
  },

  cancelReminder({ opId }) {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => {
      if (ring.ops[opId]) return { ok: true, idempotent: true }
      ring.ops[opId] = true
      ring.reminder = null
      save()
      return { ok: true }
    })
  },

  setLocked(locked) {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => { ring.locked = !!locked; save(); return { ok: true, locked: ring.locked } })
  },

  // —— 快照同步 ——
  pullSnapshots() {
    const err = mustConnect()
    if (err) return err
    load()
    return delay().then(() => ({
      epoch: ring.epoch,
      snapshots: Object.values(ring.snapshots)
    }))
  },

  // —— 调试 ——
  simulateTap,
  _reset() {
    ring = DEFAULT_STATE()
    connected = false
    save()
  }
}
