'use strict'

const { PRACTICE_TYPES } = require('./constants')
const { settleUpTo, liveCounts } = require('./archive')
const { findPractice } = require('./state')
const { dayKey } = require('./time')

// 计时型进行中的会话：把截至 ts 的时长计入今日（一整座记一次 times），并清出上下文
function creditOngoingTiming(state, ctx, ts) {
  const practice = findPractice(state, ctx.practiceId)
  if (!practice || practice.type !== PRACTICE_TYPES.TIME) return
  const end = ctx.pausedAt !== undefined ? ctx.pausedAt : ts
  const from = ctx.creditedTs || ctx.startTs
  if (end < from) return
  const live = liveCounts(state, ctx.practiceId)
  live.durationMin += (end - from) / 60000
  live.times += 1
  ctx.creditedTs = end
}

// 点按 +1：作用于该侧上下文（戒指/手机各自独立）；计时型功课锁计数
function tap(state, side, ts, amount = 1) {
  if (!['phone', 'ring'].includes(side)) throw new Error('BAD_SIDE')
  settleUpTo(state, ts)
  const ctx = state.contexts[side]
  if (!ctx) throw new Error('NO_CONTEXT')
  const practice = findPractice(state, ctx.practiceId)
  if (!practice) throw new Error('NO_PRACTICE')
  if (practice.type === PRACTICE_TYPES.TIME) throw new Error('TIME_PRACTICE_LOCKED')
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('BAD_AMOUNT')
  const live = liveCounts(state, practice.id)
  live[side] = (live[side] || 0) + amount
  ctx.roundCount += amount
  ctx.lastTs = ts
  ctx.undoAvailable = (ctx.undoDate === dayKey(ts) ? (ctx.undoAvailable || 0) : 0) + amount
  ctx.undoDate = dayKey(ts)
  return {
    vibrate: practice.vibrateEvery > 0 && ctx.roundCount % practice.vibrateEvery === 0
  }
}

// 开启新一轮 = 该侧切功课 + 本轮清零 + 可选提醒目标（跨零点继续，不随日切丢失）
function startNewRound(state, side, practiceId, opts = {}) {
  const ts = opts.ts
  settleUpTo(state, ts)
  const practice = findPractice(state, practiceId)
  if (!practice) throw new Error('NO_PRACTICE')
  const reminder = opts.reminder || null
  validateReminder(reminder)
  if (practice.type === 'time' && reminder && reminder.type === 'count') throw new Error('TIME_PRACTICE_LOCKED')
  const prev = state.contexts[side]
  if (prev) creditOngoingTiming(state, prev, ts)
  state.contexts[side] = {
    side,
    practiceId,
    startTs: ts,
    creditedTs: ts,
    pausedMs: 0,
    lastTs: ts,
    roundCount: 0,
    reminder
  }
}

// 计时型结束一座
function endRound(state, side, ts) {
  settleUpTo(state, ts)
  const ctx = state.contexts[side]
  if (!ctx) throw new Error('NO_CONTEXT')
  creditOngoingTiming(state, ctx, ts)
  state.contexts[side] = null
}

function cancelReminder(state, side) {
  const ctx = state.contexts[side]
  if (!ctx) throw new Error('NO_CONTEXT')
  ctx.reminder = null // 只取消提醒，计数继续
}

// 提醒目标进度；到点由调用方 cancelReminder（过期不补发）
function reminderRemaining(state, side, ts) {
  const ctx = state.contexts[side]
  if (!ctx || !ctx.reminder) return null
  const r = ctx.reminder
  if (r.type === 'count') {
    return { type: 'count', remaining: Math.max(0, r.value - ctx.roundCount), done: ctx.roundCount >= r.value }
  }
  const remainMs = r.value * 60000 - elapsedMs(ctx, ts)
  return { type: 'time', remainingMs: Math.max(0, remainMs), done: remainMs <= 0 }
}

// 撤销一次点按：本轮与该侧今日累积各 -1（P2「撤销一次」用；减到 0 为止）
function undoTap(state, side, ts) {
  settleUpTo(state, ts)
  const ctx = state.contexts[side]
  if (!ctx) throw new Error('NO_CONTEXT')
  const practice = findPractice(state, ctx.practiceId)
  if (!practice) throw new Error('NO_PRACTICE')
  if (practice.type === PRACTICE_TYPES.TIME) throw new Error('TIME_PRACTICE_LOCKED')
  if (ctx.roundCount <= 0) return { undone: false }
  // 只撤销本轮最近一次点按所在日，不能误减零点后的今日数据。
  const date = ctx.undoDate || dayKey(ctx.lastTs)
  const available = ctx.undoAvailable === undefined ? ctx.roundCount : ctx.undoAvailable
  if (available <= 0) return { undone: false }
  const live = date === state.currentDay ? liveCounts(state, practice.id) : null
  const row = !live && state.archives[date] && state.archives[date][practice.id]
  const raw = live ? live[side] : (row && row[side === 'phone' ? 'phoneRaw' : 'ringRaw'])
  if (!(raw > 0) || require('./archive').sourceTotal(state, date, practice.id, side) <= 0) return { undone: false }
  if (live) live[side] -= 1
  else { row[side === 'phone' ? 'phoneRaw' : 'ringRaw'] -= 1; row.version += 1 }
  ctx.roundCount -= 1
  ctx.undoAvailable = available - 1
  return { undone: true }
}

function elapsedMs(ctx, ts) {
  return Math.max(0, (ctx.pausedAt === undefined ? ts : ctx.pausedAt) - ctx.startTs - (ctx.pausedMs || 0))
}
function pausePhone(state, ts) {
  settleUpTo(state, ts)
  const ctx = state.contexts.phone
  if (ctx && ctx.pausedAt === undefined) ctx.pausedAt = ts
}
function resumePhone(state, ts) {
  const ctx = state.contexts.phone
  if (ctx && ctx.pausedAt !== undefined) {
    settleUpTo(state, ts)
    const p = findPractice(state, ctx.practiceId)
    if (p && p.type === 'time') {
      const from = Math.max(ctx.creditedTs || ctx.startTs, require('./time').startOfDayTs(ts))
      liveCounts(state, p.id).durationMin += Math.max(0, ctx.pausedAt - from) / 60000
      ctx.creditedTs = ts
    }
    ctx.pausedMs = (ctx.pausedMs || 0) + Math.max(0, ts - ctx.pausedAt)
    delete ctx.pausedAt
  }
}
function validateReminder(reminder) {
  if (reminder === null) return
  if (!reminder || (reminder.type !== 'count' && reminder.type !== 'time') || (!Number.isSafeInteger(reminder.value) || reminder.value <= 0)) {
    throw new Error('BAD_REMINDER')
  }
}

module.exports = { elapsedMs, pausePhone, resumePhone, tap, undoTap, startNewRound, endRound, cancelReminder, reminderRemaining }
