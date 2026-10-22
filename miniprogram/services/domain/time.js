'use strict'

// 本地时区（用户手机）的日切，全部基于注入的 ms 时间戳，禁直接 Date.now()

const DAY_MS = 86400000

function pad(n) { return n < 10 ? '0' + n : '' + n }

function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDayTs(ts) { return parseDay(dayKey(ts)).getTime() }

function endOfDayTs(ts) { return startOfDayTs(ts) + DAY_MS - 1 }

function nextDay(key) { return addDays(key, 1) }

function prevDay(key) { return addDays(key, -1) }

// aKey 到 bKey 相差的天数（b 在 a 之后为正）
function diffDays(aKey, bKey) {
  return Math.round((parseDay(bKey) - parseDay(aKey)) / DAY_MS)
}

function addDays(key, n) { const d = parseDay(key); d.setDate(d.getDate() + n); return dayKey(d.getTime()) }
function validDay(key) { return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && dayKey(parseDay(key).getTime()) === key }

module.exports = { validDay, DAY_MS, dayKey, parseDay, startOfDayTs, endOfDayTs, nextDay, prevDay, diffDays, addDays }
