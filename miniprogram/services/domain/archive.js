'use strict'

const { SOURCES, PRACTICE_TYPES } = require('./constants')
const { dayKey, startOfDayTs, endOfDayTs, nextDay } = require('./time')
const { findPracticeAny } = require('./state')

// —— 行与目标快照 ————————————————————————————————

function ensureDay(state, date) {
  if (!state.archives[date]) state.archives[date] = {}
  return state.archives[date]
}

// 取（或补建）某日的归档行；targetSnapshot 只写一次，永不覆盖
function ensureRow(state, date, practiceId) {
  const day = ensureDay(state, date)
  if (!day[practiceId]) {
    day[practiceId] = {
      ringRaw: 0,
      phoneRaw: 0,
      manualTotal: 0,
      targetSnapshot: undefined,
      durationMin: 0,
      times: 0,
      version: 0
    }
  }
  const row = day[practiceId]
  const practice = findPracticeAny(state, practiceId)
  if (row.targetSnapshot === undefined && practice) {
    row.targetSnapshot = practice.dailyTarget
  }
  return row
}

// 某日期的目标生效口径：当日用当前目标；历史用当日快照（无快照时近似为当前目标）
function effectiveTarget(state, practiceId, date) {
  const practice = findPracticeAny(state, practiceId)
  if (!practice) return undefined
  if (date > state.currentDay) return null // 未来日期不算
  if (date === state.currentDay) return practice.dailyTarget
  const row = state.archives[date] && state.archives[date][practiceId]
  if (row && row.targetSnapshot !== undefined) return row.targetSnapshot
  return practice.dailyTarget
}

// ——  settle（零点切日 / 补归档） ————————————————————————

function manualTotalFor(state, date, practiceId) {
  return state.entries
    .filter(e => e.date === date && e.practiceId === practiceId && !e.tombstone)
    .reduce((s, e) => s + e.amount, 0)
}

function liveCounts(state, practiceId) {
  if (!state.todayCounts[practiceId]) {
    state.todayCounts[practiceId] = { ring: 0, phone: 0, durationMin: 0, times: 0 }
  }
  return state.todayCounts[practiceId]
}

// 把 state.currentDay 这一天封盘进 archives（ts = 结算时刻，用于切分进行中计时会话）
function settleDay(state, date, ts) {
  const ids = new Set()
  for (const p of state.practices) if (!p.deleted) ids.add(p.id)
  for (const pid of Object.keys(state.todayCounts)) ids.add(pid)
  for (const e of state.entries) {
    if (e.date === date && !e.tombstone) ids.add(e.practiceId)
  }

  const cap = Math.min(ts, endOfDayTs(startOfDayTs(parseDayTs(date))))

  for (const pid of ids) {
    const row = ensureRow(state, date, pid)
    const live = state.todayCounts[pid]
    if (live) {
      row.ringRaw += live.ring || 0
      row.phoneRaw += live.phone || 0
      row.durationMin += live.durationMin || 0
      row.times += live.times || 0
    }
    row.manualTotal = manualTotalFor(state, date, pid)

    // 计时型进行中会话：当日部分按起止时间切分计入（endRound/startNewRound 已结算的不再重复）
    for (const side of [SOURCES.RING, SOURCES.PHONE]) {
      const ctx = state.contexts[side]
      if (!ctx || ctx.practiceId !== pid) continue
      const practice = findPracticeAny(state, pid)
      if (!practice || practice.type !== PRACTICE_TYPES.TIME) continue
      const from = Math.max(ctx.startTs, startOfDayTs(parseDayTs(date)))
      // 进行中会话视为持续到结算时刻（计时型无点按，lastTs 不更新）
      const lastKnown = Math.max(ctx.lastTs === undefined ? ctx.startTs : ctx.lastTs, ts)
      const to = Math.min(lastKnown, cap)
      if (to > from) row.durationMin += (to - from) / 60000
    }
    row.version += 1
  }
}

function parseDayTs(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

// 惰性结算：任何写操作前调用。把 currentDay 推进到 ts 所在日期（跨多天逐日封盘）
function settleUpTo(state, ts) {
  const target = dayKey(ts)
  while (state.currentDay < target) {
    const settling = state.currentDay
    settleDay(state, settling, ts)
    state.todayCounts = {}
    state.currentDay = nextDay(settling)
  }
}

// —— 查询 ————————————————————————————————————

function adjustmentsSum(state, date, practiceId, source) {
  return state.adjustments
    .filter(a => a.date === date && a.practiceId === practiceId && a.source === source && !a.restored)
    .reduce((s, a) => s + a.delta, 0)
}

function rawOf(state, date, practiceId, source) {
  if (date === state.currentDay) {
    const live = state.todayCounts[practiceId]
    return live ? live[source] || 0 : 0
  }
  const row = state.archives[date] && state.archives[date][practiceId]
  return row ? row[source === SOURCES.RING ? 'ringRaw' : 'phoneRaw'] || 0 : 0
}

// 某来源当日净值 = 原始 + 修正（delta 恒为负）
function sourceTotal(state, date, practiceId, source) {
  return rawOf(state, date, practiceId, source) + adjustmentsSum(state, date, practiceId, source)
}

// 某日某功课汇总；未来日期返回 null；ts 用于估算当日进行中计时会话已进行时长（可省略）
function dayTotals(state, date, practiceId, ts) {
  const practice = findPracticeAny(state, practiceId)
  if (!practice || date > state.currentDay) return null

  let ringRaw = 0
  let phoneRaw = 0
  let manualTotal = 0
  let durationMin = 0
  let times = 0

  if (date === state.currentDay) {
    const live = state.todayCounts[practiceId]
    if (live) {
      ringRaw = live.ring || 0
      phoneRaw = live.phone || 0
      durationMin = live.durationMin || 0
      times = live.times || 0
    }
    manualTotal = manualTotalFor(state, date, practiceId)
    if (ts !== undefined) durationMin += ongoingTimingMinutes(state, practiceId, ts)
  } else {
    const row = state.archives[date] && state.archives[date][practiceId]
    if (row) {
      ringRaw = row.ringRaw
      phoneRaw = row.phoneRaw
      manualTotal = row.manualTotal
      durationMin = row.durationMin
      times = row.times
    }
  }

  const ring = ringRaw + adjustmentsSum(state, date, practiceId, SOURCES.RING)
  const phone = phoneRaw + adjustmentsSum(state, date, practiceId, SOURCES.PHONE)
  const isDuration = practice.type === PRACTICE_TYPES.TIME
  const total = isDuration ? durationMin : ring + phone + manualTotal
  const target = effectiveTarget(state, practiceId, date)

  let status = 'none' // 无目标功课不参与达标判断
  if (target !== null && target !== undefined) {
    if (total >= target) status = 'met'
    else if (total > 0) status = 'partial'
    else status = 'missed'
  }

  return { practice, date, ring, phone, manual: manualTotal, total, durationMin, times, target, isDuration, status }
}

// 进行中计时会话截至 ts 的已进行分钟（展示用；settle 时另按日切分）
function ongoingTimingMinutes(state, practiceId, ts) {
  let minutes = 0
  for (const side of [SOURCES.RING, SOURCES.PHONE]) {
    const ctx = state.contexts[side]
    if (!ctx || ctx.practiceId !== practiceId) continue
    const practice = findPracticeAny(state, practiceId)
    if (!practice || practice.type !== PRACTICE_TYPES.TIME) continue
    const end = ctx.lastTs === undefined ? ts : Math.max(ctx.lastTs, ts)
    if (end > ctx.startTs) minutes += (end - ctx.startTs) / 60000
  }
  return minutes
}

module.exports = {
  ensureRow,
  effectiveTarget,
  settleUpTo,
  settleDay,
  manualTotalFor,
  liveCounts,
  adjustmentsSum,
  sourceTotal,
  dayTotals,
  ongoingTimingMinutes
}
