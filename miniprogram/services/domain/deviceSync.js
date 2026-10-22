'use strict'

const { ensureRow, liveCounts } = require('./archive')

// version 合并规则（与云端同构）：新覆盖旧、相同忽略、旧者拒绝
function compareVersion(a, b) {
  const x = a || 0
  const y = b || 0
  if (x > y) return 'newer'
  if (x < y) return 'older'
  return 'equal'
}

function resolveUpsert(existing, incoming) {
  if (!existing) return { action: 'accept', record: incoming }
  switch (compareVersion(incoming.version, existing.version)) {
    case 'newer': return { action: 'accept', record: incoming }
    case 'equal': return { action: 'ignore', record: existing }
    default: return { action: 'reject', record: existing }
  }
}

function snapshotKey(s) {
  return `${s.deviceId}|${s.epoch}|${s.date}|${s.practiceId}`
}

// 戒指日快照入库：按键 (deviceId, epoch, date, practiceId) 覆盖不追加；
// ring 合计 = 全部设备全部 epoch 的快照之和（多戒指分开存再汇总）
function applyDeviceSnapshot(state, snapshot) {
  const key = snapshotKey(snapshot)
  const r = resolveUpsert(state.deviceSnapshots[key], snapshot)
  if (r.action !== 'accept') return { applied: false, action: r.action }

  state.deviceSnapshots[key] = snapshot
  if (snapshot.date > state.currentDay) return { applied: true } // 戒指时钟超前：只存不映射

  const sum = Object.values(state.deviceSnapshots)
    .filter(s => s.date === snapshot.date && s.practiceId === snapshot.practiceId)
    .reduce((acc, s) => acc + s.total, 0)

  if (snapshot.date === state.currentDay) {
    liveCounts(state, snapshot.practiceId).ring = sum
  } else {
    const row = ensureRow(state, snapshot.date, snapshot.practiceId)
    row.ringRaw = sum
    row.version += 1
  }
  return { applied: true, action: 'accept' }
}

module.exports = { compareVersion, resolveUpsert, snapshotKey, applyDeviceSnapshot }
