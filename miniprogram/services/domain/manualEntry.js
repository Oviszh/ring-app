'use strict'

const { settleUpTo, ensureRow } = require('./archive')
const { genId, findPractice } = require('./state')

// 手动填报：记"本次新增数量"，手动来源，计入今日累积/每日目标/个人大愿；可整笔撤销
// 可补填过去日期（直接落到该日归档）；未来日期拒绝
function addEntry(state, input) {
  const ts = input.ts
  settleUpTo(state, ts)
  const amount = input.amount
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('AMOUNT_POSITIVE')
  if (!findPractice(state, input.practiceId)) throw new Error('NO_PRACTICE')
  if (input.date > state.currentDay) throw new Error('FUTURE_DATE')
  if (!require('./time').validDay(input.date)) throw new Error('BAD_DATE')
  const entry = {
    id: input.id || genId('me', ts),
    date: input.date,
    practiceId: input.practiceId,
    amount,
    times: 1,
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
function undoEntry(state, entryId) {
  const entry = state.entries.find(e => e.id === entryId)
  if (!entry || entry.tombstone) throw new Error('NO_ENTRY')
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

module.exports = { addEntry, undoEntry, activeEntries }
