'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { dayKey, nextDay, prevDay, diffDays, addDays, startOfDayTs, endOfDayTs } = require('../miniprogram/services/domain/time')
const { D1_0800, D1_2350 } = require('./helpers')

test('dayKey 本地时区格式化', () => {
  assert.strictEqual(dayKey(D1_0800), '2026-10-21')
  assert.strictEqual(dayKey(D1_2350), '2026-10-21')
})

test('nextDay / prevDay / addDays 往返', () => {
  assert.strictEqual(nextDay('2026-10-21'), '2026-10-22')
  assert.strictEqual(prevDay('2026-10-01'), '2026-09-30')
  assert.strictEqual(prevDay('2026-01-01'), '2025-12-31')
  assert.strictEqual(addDays('2026-02-28', 1), '2026-03-01')
  assert.strictEqual(diffDays('2026-10-01', '2026-10-22'), 21)
})

test('startOfDayTs / endOfDayTs 覆盖全天', () => {
  const s = startOfDayTs(D1_2350)
  const e = endOfDayTs(D1_2350)
  assert.strictEqual(dayKey(s), '2026-10-21')
  assert.strictEqual(dayKey(e), '2026-10-21')
  assert.strictEqual(e - s, 86400000 - 1)
})
