'use strict'

const { settleUpTo, ensureRow, dayTotals } = require('./archive')
const { genId, findPractice } = require('./state')

// 补录：按选择增加或减少，保存有符号数量，保留设备/触屏原始数据；可整笔撤销
// 可补填过去日期（直接落到该日归档）；未来日期拒绝
function addEntry(state, input) {
  const ts = input.ts
  settleUpTo(state, ts)
  const magnitude = input.amount
  const amount = input.direction === 'subtract' ? -magnitude : magnitude
  if (!Number.isSafeInteger(magnitude) || magnitude <= 0) throw new Error('AMOUNT_POSITIVE')
  if (!findPractice(state, input.practiceId)) throw new Error('NO_PRACTICE')
  if (input.date > state.currentDay) throw new Error('FUTURE_DATE')
  if (!require('./time').validDay(input.date)) throw new Error('BAD_DATE')
  const current = dayTotals(state, input.date, input.practiceId, ts)
  if (amount < 0 && (!current || current.total + amount < 0)) throw new Error('NEGATIVE_RESULT')
  const entry = {
    id: input.id || genId('me', ts),
    date: input.date,
    practiceId: input.practiceId,
    amount,
    times: amount > 0 ? 1 : 0,
    direction: amount < 0 ? 'subtract' : 'add',
    createdAt: ts,
    tombstone: false
  }
  state.entries.push(entry)
  if (input.date < state.currentDay) {
    const row = ensureRow(state, input.date, input.practiceId)
    row.manualTotal += amount
    row.version += 1
  }
  return entry
}

// 撤销填报 = 整笔移除（tombstone），不产生反向账目
function undoEntry(state, entryId, ts) {
  const entry = state.entries.find(e => e.id === entryId)
  if (!entry || entry.tombstone) throw new Error('NO_ENTRY')
  const current = dayTotals(state, entry.date, entry.practiceId, ts)
  if (entry.amount > 0 && current && current.total - entry.amount < 0) throw new Error('NEGATIVE_RESULT')
  entry.tombstone = true
  if (entry.date < state.currentDay) {
    const row = ensureRow(state, entry.date, entry.practiceId)
    row.manualTotal -= entry.amount
    row.version += 1
  }
}

function activeEntries(state, date, practiceId) {
  return state.entries.filter(e => e.date === date && e.practiceId === practiceId && !e.tombstone)
}

// 输入希望达到的当日合计，只记录差额，不改写任何原始来源。
// expectedTotal 防止编辑期间的同步/点按被静默抵消。
function setDayTotal(state, input) {
  settleUpTo(state, input.ts)
  if (!require('./time').validDay(input.date)) throw new Error('BAD_DATE')
  if (input.date > state.currentDay) throw new Error('FUTURE_DATE')
  const practice = findPractice(state, input.practiceId)
  if (!practice) throw new Error('NO_PRACTICE')
  if (!Number.isSafeInteger(input.total) || input.total < 0) throw new Error('TOTAL_NONNEGATIVE')
  const current = dayTotals(state, input.date, practice.id, input.ts) || { total: 0 }
  if (input.expectedTotal !== current.total) throw new Error('TOTAL_CHANGED')
  if (practice.type === 'time' && ['phone', 'ring'].some(side => state.contexts[side] && state.contexts[side].practiceId === practice.id && input.date === state.currentDay)) throw new Error('TIMING_ACTIVE')
  const delta = input.total - current.total
  if (!delta) return null
  if (!Number.isFinite(delta) || (practice.type !== 'time' && !Number.isSafeInteger(delta))) throw new Error('TOTAL_NONNEGATIVE')
  const entry = {
    id: genId('me', input.ts), date: input.date, practiceId: practice.id,
    amount: delta, times: delta > 0 ? 1 : 0, direction: delta > 0 ? 'add' : 'subtract',
    method: 'set-total', beforeTotal: current.total, afterTotal: input.total,
    createdAt: input.ts, tombstone: false
  }
  state.entries.push(entry)
  if (input.date < state.currentDay) {
    const row = ensureRow(state, input.date, practice.id)
    row.manualTotal += delta
    row.version += 1
  }
  return entry
}

module.exports = { addEntry, undoEntry, activeEntries, setDayTotal }
