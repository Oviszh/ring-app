'use strict'

const { PRACTICE_TYPES } = require('./constants')
const { genId, findPractice } = require('./state')
const { settleUpTo, ensureRow } = require('./archive')
const { dayKey } = require('./time')

// 新建功课：默认目标 108 声、首页显示、计数型
function createPractice(state, input, ts) {
  if (!input.name || !input.name.trim()) throw new Error('NAME_REQUIRED')
  if (input.type && !['count', 'time'].includes(input.type)) throw new Error('BAD_TYPE')
  if (input.dailyTarget != null && (!Number.isSafeInteger(input.dailyTarget) || input.dailyTarget <= 0)) throw new Error('TARGET_POSITIVE_OR_NULL')
  settleUpTo(state, ts)
  const practice = {
    id: input.id || genId('p', ts),
    name: input.name,
    displayName: input.displayName || '',
    type: input.type || PRACTICE_TYPES.COUNT,
    unit: input.type === 'time' ? '分钟' : (input.unit || '声'),
    alias: input.alias || '',
    public: !!input.public,
    publicId: input.publicId || '',
    desc: input.desc || '',
    group: input.group === 'common' ? 'common' : 'main',
    dailyTarget: input.dailyTarget === undefined ? (input.type === 'time' ? 30 : 108) : input.dailyTarget,
    vibrateEvery: input.vibrateEvery || 0,
    showOnHome: input.showOnHome !== false,
    sort: input.sort === undefined ? state.practices.length : input.sort,
    createdAt: ts,
    deleted: false
  }
  state.practices.push(practice)
  ensureRow(state, state.currentDay, practice.id)
  return practice
}

function removePractice(state, practiceId, ts) {
  if (ts !== undefined) settleUpTo(state, ts)
  const p = findPractice(state, practiceId)
  if (!p) throw new Error('NO_PRACTICE')
  ensureRow(state, state.currentDay, p.id)
  for (const side of ['phone', 'ring']) {
    if (state.contexts[side] && state.contexts[side].practiceId === p.id) {
      require('./counting').endRound(state, side, ts === undefined ? state.contexts[side].lastTs : ts)
    }
  }
  p.deletedDate = state.currentDay
  p.deleted = true // 软删除：不影响历史统计与历史达标判断
}

// 修改每日目标立即用于今天；先归档跨日数据，只允许更新当日目标快照。
function setDailyTarget(state, practiceId, target, ts) {
  if (ts !== undefined) settleUpTo(state, ts)
  const p = findPractice(state, practiceId)
  if (!p) throw new Error('NO_PRACTICE')
  if (target !== null && (!Number.isSafeInteger(target) || target <= 0)) throw new Error('TARGET_POSITIVE_OR_NULL')
  const row = ensureRow(state, state.currentDay, p.id)
  p.dailyTarget = target
  if (row.targetSnapshot !== target) {
    row.targetSnapshot = target
    row.version += 1
  }
}

function displayNameOf(practice) {
  return practice.displayName || practice.name
}

module.exports = { createPractice, removePractice, setDailyTarget, displayNameOf }
