'use strict'

const { dayTotals } = require('./archive')
const { nextDay, diffDays, addDays } = require('./time')
const { genId, findPractice } = require('./state')

// 个人大愿：基于某功课的长期目标；累计口径 = 全部有效来源（戒指+手机+手动填报）+ 可选"已有累计"
function createVow(state, input, ts) {
  if (!findPractice(state, input.practiceId)) throw new Error('NO_PRACTICE')
  if (!(input.targetTotal > 0)) throw new Error('TARGET_POSITIVE')
  input = Object.assign({ startDate: nextDay(state.currentDay), existingTotal: 0 }, input)
  validateVow(input)
  const vow = {
    id: input.id || genId('vow', ts),
    practiceId: input.practiceId,
    name: input.name || '',
    targetTotal: input.targetTotal,
    startDate: input.startDate,
    deadline: input.deadline || null,
    existingTotal: input.existingTotal || 0, // 承接他处进度，视为手动来源
    status: 'active',
    createdAt: ts
  }
  state.vows.push(vow)
  return vow
}

function removeVow(state, vowId) {
  const i = state.vows.findIndex(v => v.id === vowId)
  if (i < 0) throw new Error('NO_VOW')
  state.vows.splice(i, 1)
}

// 进度快照；ts 用于当日进行中计时的展示估算（可省略）
function vowProgress(state, vow, ts) {
  let total = vow.existingTotal || 0
  let d = vow.startDate
  let guard = 0
  while (d <= state.currentDay && guard < 100000) {
    const t = dayTotals(state, d, vow.practiceId, ts)
    if (t) total += t.total
    d = nextDay(d)
    guard += 1
  }
  const days = vow.startDate <= state.currentDay ? diffDays(vow.startDate, state.currentDay) + 1 : 0
  const done = total >= vow.targetTotal
  const avgPerDay = days > 0 ? total / days : 0
  let eta = null
  if (!done && avgPerDay > 0) {
    eta = addDays(state.currentDay, Math.ceil((vow.targetTotal - total) / avgPerDay))
  }
  return {
    total,
    target: vow.targetTotal,
    percent: Math.min(100, Math.round((total / vow.targetTotal) * 100)),
    done,
    days,
    avgPerDay: Math.round(avgPerDay),
    eta,
    deadline: vow.deadline
  }
}

function validateVow(v) {
  if (!Number.isSafeInteger(v.targetTotal) || v.targetTotal <= 0) throw new Error('TARGET_POSITIVE')
  if (!Number.isSafeInteger(v.existingTotal || 0) || (v.existingTotal || 0) < 0) throw new Error('BAD_EXISTING')
  const { validDay } = require('./time')
  if (!validDay(v.startDate) || (v.deadline && (!validDay(v.deadline) || v.deadline < v.startDate))) throw new Error('BAD_DATE')
}
module.exports = { validateVow, createVow, removeVow, vowProgress }
