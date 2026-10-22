'use strict'

const { dayKey } = require('./time')

let seq = 0
function genId(prefix, ts) {
  seq += 1
  return `${prefix}_${ts.toString(36)}_${seq}`
}

// 初始状态；ts 为当前时间（ms），由调用方注入
function createInitialState(ts) {
  return {
    schemaVersion: 1,
    currentDay: ts ? dayKey(ts) : '1970-01-01',
    practices: [],
    contexts: { ring: null, phone: null },
    todayCounts: {}, // { [practiceId]: { ring, phone, durationMin, times } } —— 仅当天，settle 后清空
    entries: [],     // 手动填报 { id, date, practiceId, amount, createdAt, tombstone }
    adjustments: [], // 修正 { id, date, practiceId, source(ring/phone), delta(恒负), createdAt, restored }
    archives: {},    // { [date]: { [practiceId]: ArchiveRow } }
    deviceSnapshots: {}, // 戒指日快照，键 `${deviceId}|${epoch}|${date}|${practiceId}`
    vows: [],
    devices: [],
    settings: {
      ringEnabled: true,
      phoneEnabled: true,
      sound: true,
      vibrate: true,
      theme: 'muyu',
      undoConfirm: true
    }
  }
}

function findPractice(state, practiceId) {
  return state.practices.find(p => p.id === practiceId && !p.deleted) || null
}

// 含已删除：历史归档查询必须仍能看到被删功课的历史
function findPracticeAny(state, practiceId) {
  return state.practices.find(p => p.id === practiceId) || null
}

module.exports = { genId, createInitialState, findPractice, findPracticeAny }
