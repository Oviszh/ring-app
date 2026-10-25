'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const { createRequire } = require('node:module')

function page(name, store, wx = {}) {
  const file = path.resolve(__dirname, `../miniprogram/pages/${name}/${name}.js`)
  let spec
  const intervals = []
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: createRequire(file), getApp: () => ({ globalData: { store } }),
    Page: p => { spec = p }, wx, Date,
    setTimeout: () => 0, clearTimeout() {},
    setInterval: fn => { intervals.push(fn); return intervals.length }, clearInterval() {}
  })
  const instance = Object.assign({}, spec, { data: JSON.parse(JSON.stringify(spec.data)) })
  instance.setData = function (patch) { Object.assign(this.data, patch) }
  return instance
}

test('首页浏览功课不重置实际本轮，进入另一功课前可取消', () => {
  let starts = 0, navigations = 0, modal
  const store = {
    context: () => ({ practiceId: 'a', roundCount: 27 }),
    startRound: () => starts++, getPractice: () => ({ type: 'count' })
  }
  const p = page('today', store, { showModal: o => { modal = o }, navigateTo: () => navigations++ })
  p.data.practices = [{ id: 'a' }, { id: 'b' }]
  p.data.currentIndex = 0
  p.refresh = () => {}
  p.onNextPractice()
  assert.equal(p.data.currentPracticeId, 'b')
  assert.equal(starts, 0)
  p.goWoodfish()
  assert.equal(starts, 0)
  assert.equal(navigations, 0)
  modal.success({ confirm: false })
  assert.equal(starts, 0)
  modal.success({ confirm: true })
  assert.equal(starts, 1)
  assert.equal(navigations, 1)
})

test('禅坐保留时间提醒偏好，排除次数提醒', () => {
  let preference = { type: 'time', value: 15 }
  const store = { lastReminder: () => preference, getPractice: () => ({ type: 'time' }) }
  for (const name of ['practice-detail']) {
    const p = page(name, store)
    p.data.isTime = true
    assert.equal(p.readLastReminder().type, 'time')
    assert.equal(p.readLastReminder().time, 15)
    preference = { type: 'count', value: 108 }
    assert.equal(p.readLastReminder().type, 'time')
    assert.equal(p.readLastReminder().time, 35)
    preference = { type: 'time', value: 15 }
  }
})

test('静坐结束后返回页面不会自动重开，计时页拒绝点按计数', () => {
  let starts = 0, taps = 0
  const store = { state: { settings: {} }, practices: () => [{ id: 'time' }], context: () => null, startRound: () => starts++, tap: () => taps++ }
  const p = page('woodfish', store)
  p.data.ended = true
  p.refresh = () => {}
  p.onShow()
  assert.equal(starts, 0)
  store.context = () => ({ practiceId: 'time' })
  p.data.isTime = true
  p.onTapWoodfish()
  assert.equal(taps, 0)
})

test('手动记录组件用分钟填报计时功课，校验失败不写入且连续填报保留日期', () => {
  const file = path.resolve(__dirname, '../miniprogram/components/entry-sheet/entry-sheet.js')
  const entries = [], events = []
  const store = {
    practices: () => [{ id: 'sit', name: '禅坐', type: 'time', unit: '分钟' }, { id: 'chant', name: '念佛', type: 'count', unit: '声' }],
    todayKey: () => '2026-10-24', dayTotals: () => ({ total: 0 }), addEntry: e => entries.push(e)
  }
  let spec
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: createRequire(file), getApp: () => ({ globalData: { store } }),
    getCurrentPages: () => [{ route: 'pages/day-detail/day-detail' }],
    wx: { showToast() {} }, Component: c => { spec = c }
  })
  const c = Object.assign({}, spec.methods, {
    properties: { practiceId: 'sit', date: '2026-10-21' }, data: JSON.parse(JSON.stringify(spec.data)),
    setData(patch) { Object.assign(this.data, patch) }, triggerEvent(name) { events.push(name) }
  })
  spec.observers.visible.call(c, true)
  assert.equal(c.data.unit, '分钟')
  assert.equal(c.data.isTime, true)
  c.save()
  assert.equal(entries.length, 0)
  assert.ok(c.data.error)
  c.onAmount({ detail: { value: '1.5' } })
  c.save()
  assert.equal(entries.length, 0)
  c.onAmount({ detail: { value: '30' } })
  c.saveMore()
  assert.equal(entries.length, 1)
  assert.equal(entries[0].amount, 30)
  assert.equal(entries[0].practiceId, 'sit')
  assert.equal(entries[0].date, '2026-10-21')
  assert.equal(c.data.unit, '声')
  assert.equal(c.data.amount, '')
  assert.equal(c.data.selectedDate, '2026-10-21')
})

test('保存手动记录后直到弹层关闭前保持提交锁，连续点击不重复入账', () => {
  const file = path.resolve(__dirname, '../miniprogram/components/entry-sheet/entry-sheet.js')
  let spec, writes = 0, closes = 0
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: createRequire(file),
    getApp: () => ({ globalData: { store: { addEntry: () => writes++ } } }),
    Component: c => { spec = c }, wx: { showToast() {} }
  })
  const c = Object.assign({}, spec.methods, {
    data: { busy: false, amount: '108', practices: [{ id: 'p' }], index: 0, selectedDate: '2026-10-24' },
    setData(p) { Object.assign(this.data, p) }, triggerEvent(name) { if (name === 'close') closes++ }
  })
  c.save()
  c.save()
  assert.equal(writes, 1)
  assert.equal(closes, 1)
})
