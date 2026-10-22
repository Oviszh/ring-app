'use strict'

const { PRACTICE_TYPES } = require('./constants')
const { genId, findPractice } = require('./state')

// 新建功课：默认目标 108 声、首页显示、计数型
function createPractice(state, input, ts) {
  const practice = {
    id: input.id || genId('p', ts),
    name: input.name,
    displayName: input.displayName || '',
    type: input.type || PRACTICE_TYPES.COUNT,
    unit: input.unit || '声',
    alias: input.alias || '',
    public: !!input.public,
    dailyTarget: input.dailyTarget === undefined ? 108 : input.dailyTarget,
    vibrateEvery: input.vibrateEvery || 0,
    showOnHome: input.showOnHome !== false,
    sort: input.sort === undefined ? state.practices.length : input.sort,
    createdAt: ts,
    deleted: false
  }
  state.practices.push(practice)
  return practice
}

function removePractice(state, practiceId) {
  const p = findPractice(state, practiceId)
  if (!p) throw new Error('NO_PRACTICE')
  p.deleted = true // 软删除：不影响历史统计与历史达标判断
}

// 修改每日目标：次日生效（当日及历史用快照，见 archive.effectiveTarget）
function setDailyTarget(state, practiceId, target) {
  const p = findPractice(state, practiceId)
  if (!p) throw new Error('NO_PRACTICE')
  if (target !== null && !(target > 0)) throw new Error('TARGET_POSITIVE_OR_NULL')
  p.dailyTarget = target
}

function displayNameOf(practice) {
  return practice.displayName || practice.name
}

module.exports = { createPractice, removePractice, setDailyTarget, displayNameOf }
