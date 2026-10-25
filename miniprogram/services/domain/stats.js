'use strict'

const { dayTotals } = require('./archive')

// 日历「全部功课」口径的日状态：●全达标 ◐部分 ○有缺 ·无功课
// 无每日目标的功课不参与"全部达标"判断
function calendarDayStatus(state, date, ts, group) {
  let anyTargeted = false
  let allMet = true
  let anyProgress = false
  for (const p of state.practices) {
    if (group && (p.group || 'main') !== group) continue
    const t = dayTotals(state, date, p.id, ts)
    if (!t || t.target === null || t.target === undefined) continue
    anyTargeted = true
    if (t.status === 'met') {
      anyProgress = true
    } else {
      allMet = false
      if (t.total > 0) anyProgress = true
    }
  }
  if (!anyTargeted) return 'none'
  if (allMet) return 'met'
  return anyProgress ? 'partial' : 'missed'
}

// 某功课历史全量汇总：各归档日 + 今天；修行天数 = total > 0 的天数
function practiceTotalsAll(state, practiceId, ts) {
  let ring = 0
  let phone = 0
  let manual = 0
  let durationMin = 0
  let times = 0
  let days = 0
  const acc = t => {
    if (!t) return
    ring += t.ring
    phone += t.phone
    manual += t.manual
    durationMin += t.durationMin
    times += t.times
    if (t.total > 0) days += 1
  }
  for (const date of Object.keys(state.archives).filter(d => d < state.currentDay)) acc(dayTotals(state, date, practiceId))
  acc(dayTotals(state, state.currentDay, practiceId, ts))
  return { total: ring + phone + manual, ring, phone, manual, durationMin, times, days }
}

module.exports = { calendarDayStatus, practiceTotalsAll }
