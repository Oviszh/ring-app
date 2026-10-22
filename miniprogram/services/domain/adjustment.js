'use strict'

const { SOURCES } = require('./constants')
const { settleUpTo, sourceTotal } = require('./archive')
const { genId } = require('./state')

// 修正（纠错专用）：只许减少，必须标明来源（戒指/手机）；原始数与修正分开保存
// toValue = 用户确认后的该来源净值；差额 delta（恒负）记为修正
// 如需增加数量，走填报（手动来源），不在此生成
function addAdjustment(state, input) {
  const ts = input.ts
  settleUpTo(state, ts)
  const source = input.source
  if (source !== SOURCES.RING && source !== SOURCES.PHONE) throw new Error('SOURCE_REQUIRED')
  if (!Number.isSafeInteger(input.toValue)) throw new Error('BAD_AMOUNT')
  if (!require('./time').validDay(input.date) || input.date > state.currentDay) throw new Error('BAD_DATE')
  const p = state.practices.find(p => p.id === input.practiceId)
  if (!p || p.type === 'time') throw new Error('NO_COUNT_PRACTICE')
  const current = sourceTotal(state, input.date, input.practiceId, source)
  const delta = input.toValue - current
  if (!(delta < 0)) throw new Error('REDUCE_ONLY')
  if (input.toValue < 0) throw new Error('NEGATIVE_RESULT')
  const adjustment = {
    id: input.id || genId('adj', ts),
    date: input.date,
    practiceId: input.practiceId,
    source,
    delta,
    createdAt: ts,
    restored: false
  }
  state.adjustments.push(adjustment)
  return adjustment
}

// 撤销修正 = 恢复该修正，不产生新账目
function undoAdjustment(state, adjustmentId) {
  const adj = state.adjustments.find(a => a.id === adjustmentId)
  if (!adj || adj.restored) throw new Error('NO_ADJUSTMENT')
  adj.restored = true
}

module.exports = { addAdjustment, undoAdjustment }
