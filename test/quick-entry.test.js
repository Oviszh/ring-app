'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const { createRequire } = require('node:module')
const domain = require('../miniprogram/services/domain')
const backup = require('../miniprogram/services/domain/backup')
const { createStore } = require('../miniprogram/services/store')
const { D1_0800: ts, D2_0820: nextTs } = require('./helpers')
const date = domain.dayKey(ts)
function initial(time = ts) {
  const s = domain.createInitialState(time)
  domain.createPractice(s, { id: 'a', name: '念佛', dailyTarget: 500 }, time)
  domain.createPractice(s, { id: 'b', name: '诵经', group: 'common', dailyTarget: 3 }, time)
  domain.startNewRound(s, 'ring', 'a', { ts: time, reminder: { type: 'count', value: 500 } })
  domain.tap(s, 'ring', time, 300)
  domain.startNewRound(s, 'phone', 'a', { ts: time, reminder: { type: 'count', value: 108 } })
  domain.tap(s, 'phone', time, 28)
  return s
}
function set(s, total, expectedTotal, day = date, time = ts, practiceId = 'a') {
  return domain.setDayTotal(s, { date: day, practiceId, total, expectedTotal, ts: time })
}
test('快速补录：328 改 500 生成 +172，再改 200 生成 −300，原始来源和双本轮不动', () => {
  const s = initial(), contexts = JSON.stringify(s.contexts)
  const snapshot = s.archives[date].a.targetSnapshot
  const plus = set(s, 500, 328)
  assert.equal(plus.amount, 172)
  assert.equal(plus.beforeTotal, 328)
  assert.equal(plus.afterTotal, 500)
  const minus = set(s, 200, 500)
  assert.equal(minus.amount, -300)
  const totals = domain.dayTotals(s, date, 'a')
  assert.equal(totals.total, 200); assert.equal(totals.ring, 300); assert.equal(totals.phone, 28)
  assert.equal(JSON.stringify(s.contexts), contexts)
  assert.equal(s.archives[date].a.targetSnapshot, snapshot)
  domain.undoEntry(s, minus.id, ts)
  assert.equal(domain.dayTotals(s, date, 'a').total, 500)
  domain.undoEntry(s, plus.id, ts)
  assert.equal(domain.dayTotals(s, date, 'a').total, 328)
})
test('相同合计不生成补录；减为 0 合法；空值、小数、负数及超安全范围拒绝', () => {
  const s = initial()
  assert.equal(set(s, 328, 328), null)
  for (const n of [-1, 1.5, Infinity, NaN, '400', null, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => set(s, n, 328), /TOTAL_NONNEGATIVE/)
  assert.equal(s.entries.length, 0)
  assert.equal(set(s, 0, 328).amount, -328)
  assert.equal(domain.dayTotals(s, date, 'a').total, 0)
})
test('编辑时新点按/同步不能被目标数值抵消，旧基准提交拒绝', () => {
  const s = initial()
  domain.tap(s, 'phone', ts)
  assert.throws(() => set(s, 500, 328), /TOTAL_CHANGED/)
  assert.equal(s.entries.length, 0)
  assert.equal(domain.dayTotals(s, date, 'a').total, 329)
})
test('跨日后补录、撤销保持历史目标及原始数据，新的同步快照继续按版本覆盖', () => {
  const s = initial()
  domain.settleUpTo(s, nextTs)
  const e = set(s, 600, 328, date, nextTs)
  const row = s.archives[date].a
  assert.equal(row.phoneRaw, 28); assert.equal(row.ringRaw, 300)
  assert.equal(row.manualTotal, 272); assert.equal(row.targetSnapshot, 500)
  domain.undoEntry(s, e.id, nextTs)
  assert.equal(domain.dayTotals(s, date, 'a').total, 328)
  const snap = { deviceId: 'd', epoch: 1, date, practiceId: 'b', total: 2, version: 1 }
  domain.applyDeviceSnapshot(s, snap)
  domain.applyDeviceSnapshot(s, snap)
  assert.equal(domain.dayTotals(s, date, 'b').total, 2)
})
test('未来日期/坏日期/删除功课拒绝；可为创建之前的日期补录并撤销', () => {
  const s = initial()
  assert.throws(() => set(s, 1, 0, '2026-10-99'), /BAD_DATE/)
  assert.throws(() => set(s, 1, 0, '2026-10-22'), /FUTURE_DATE/)
  const e = set(s, 12, 0, '2026-10-20')
  assert.equal(domain.dayTotals(s, '2026-10-20', 'a').total, 12)
  domain.undoEntry(s, e.id, ts)
  assert.equal(domain.dayTotals(s, '2026-10-20', 'a').total, 0)
  domain.removePractice(s, 'b', ts)
  assert.throws(() => set(s, 1, 0, date, ts, 'b'), /NO_PRACTICE/)
})
test('计时功课保留原秒数，按目标分钟补录差额；备份恢复和撤销均准确', () => {
  const s = initial()
  domain.createPractice(s, { id: 'sit', name: '静坐', type: 'time' }, ts)
  domain.startNewRound(s, 'phone', 'sit', { ts })
  assert.throws(() => set(s, 10, 1.5, date, ts + 90000, 'sit'), /TIMING_ACTIVE/)
  domain.endRound(s, 'phone', ts + 90000)
  const e = set(s, 10, 1.5, date, ts + 90000, 'sit')
  assert.equal(e.amount, 8.5)
  assert.equal(domain.dayTotals(s, date, 'sit').total, 10)
  const restored = backup.importBackup(backup.exportBackup(s, ts + 90000))
  assert.equal(domain.dayTotals(restored, date, 'sit').total, 10)
  domain.undoEntry(restored, e.id, ts + 90000)
  assert.equal(domain.dayTotals(restored, date, 'sit').total, 1.5)
})
test('有依赖的正补录不能先撤销至负数，先撤销负补录后可恢复', () => {
  const s = initial()
  const e = set(s, 500, 328)
  const reduction = set(s, 0, 500)
  assert.throws(() => domain.undoEntry(s, e.id, ts), /NEGATIVE_RESULT/)
  assert.equal(e.tombstone, false)
  domain.undoEntry(s, reduction.id, ts)
  domain.undoEntry(s, e.id, ts)
  assert.equal(domain.dayTotals(s, date, 'a').total, 328)
})

function makeStore() {
  const time = Date.now(), s = initial(time), mem = new Map([['nianfo_state_v1', s]])
  const toast = []
  global.wx = {
    getStorageSync: k => mem.has(k) ? JSON.parse(JSON.stringify(mem.get(k))) : null,
    setStorageSync: (k, v) => mem.set(k, JSON.parse(JSON.stringify(v))),
    setNavigationBarTitle() {}, showModal() {}, showToast: o => toast.push(o.title),
    navigateTo() {}, hideTabBar() {}, showTabBar() {}
  }
  return { store: createStore(), toast, mem }
}
function load(name, store, options = {}) {
  const file = path.resolve(__dirname, `../miniprogram/pages/${name}/${name}.js`)
  let spec
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { require: createRequire(file), getApp: () => ({ globalData: { store } }), Page: p => { spec = p }, wx: global.wx, Date, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {} })
  const p = Object.assign({}, spec, { data: JSON.parse(JSON.stringify(spec.data)) })
  p.setData = function (patch, done) {
    for (const [key, value] of Object.entries(patch)) {
      const keys = key.replace(/\[(\d+)\]/g, '.$1').split('.')
      let at = this.data
      for (const k of keys.slice(0, -1)) at = at[k]
      at[keys[keys.length - 1]] = value
    }
    if (done) done()
  }
  if (p.onLoad) p.onLoad(options)
  if (p.onShow) p.onShow()
  return p
}
const event = (id, value) => ({ currentTarget: { dataset: { id } }, detail: { value } })
test('补录页包含无记录常用功课；改数后自动出现一笔补录，confirm + blur 不重复保存', () => {
  const { store } = makeStore(), p = load('day-detail', store)
  assert.ok(p.data.rows.some(r => r.id === 'b'))
  p.onTotalFocus(event('a'))
  p.onTotalInput(event('a', '500'))
  p.onTotalCommit(event('a', '500'))
  p.onTotalCommit(event('a', '500'))
  assert.equal(store.entriesFor(store.todayKey(), 'a').length, 1)
  assert.equal(p.data.rows.find(r => r.id === 'a').entries[0].amount, 172)
  assert.equal(p.data.rows.find(r => r.id === 'a').inputValue, '500')
  delete global.wx
})
test('补录页输入负数/空串还原显示，新计数到达时保护输入并要求核对', () => {
  const { store, toast } = makeStore(), p = load('day-detail', store)
  for (const value of ['', '-1', '1.5']) { p.onTotalFocus(event('a')); p.onTotalCommit(event('a', value)) }
  assert.equal(store.state.entries.length, 0)
  p.onTotalFocus(event('a')); p.onTotalInput(event('a', '500'))
  store.tap('phone')
  assert.equal(p.data.rows.find(r => r.id === 'a').inputValue, '500')
  p.onTotalCommit(event('a', '500'))
  assert.equal(store.state.entries.length, 0)
  assert.equal(p.data.rows.find(r => r.id === 'a').inputValue, '329')
  assert.match(toast[toast.length - 1], /有更新/)
  delete global.wx
})
test('管理页可双向切换分组，不改变功课标识、每日目标、历史和双本轮', () => {
  const { store } = makeStore(), p = load('practice-manage', store)
  const before = JSON.stringify({ ctx: store.state.contexts, counts: store.state.todayCounts, archives: store.state.archives })
  p.onGroupChange(event('a', '1'))
  assert.equal(store.getPractice('a').group, 'common')
  assert.equal(p.data.groups[1].rows.length, 2)
  p.onGroupChange(event('b', '0'))
  assert.equal(store.getPractice('b').group, 'main')
  assert.equal(p.data.groups[0].rows[0].id, 'b')
  assert.equal(store.getPractice('a').dailyTarget, 500)
  assert.equal(JSON.stringify({ ctx: store.state.contexts, counts: store.state.todayCounts, archives: store.state.archives }), before)
  delete global.wx
})
test('日历主修汇总不受常用达标状态影响，分类变化后刷新；单功课仍可选常用', () => {
  const { store } = makeStore()
  store.setDayTotal({ date: store.todayKey(), practiceId: 'a', total: 500, expectedTotal: 328 })
  assert.equal(store.mainDayStatus(store.todayKey()), 'met')
  assert.equal(store.calendarDayStatus(store.todayKey()), 'partial')
  const p = load('calendar', store)
  assert.equal(p.data.viewName, '主修功课')
  assert.equal(p.data.cells.find(c => c.date === store.todayKey()).dot, 'met')
  p.onViewChange({ detail: { value: p.data.viewOptions.findIndex(o => o.id === 'b') } })
  assert.equal(p.data.viewPid, 'b')
  store.setPracticeGroup('b', 'main')
  assert.equal(store.mainDayStatus(store.todayKey()), 'partial')
  delete global.wx
})
test('存储写入失败时快速补录回滚，重试不会产生多余记录', () => {
  const { store } = makeStore(), save = global.wx.setStorageSync
  global.wx.setStorageSync = () => { throw new Error('QUOTA') }
  assert.throws(() => store.setDayTotal({ date: store.todayKey(), practiceId: 'a', total: 500, expectedTotal: 328 }), /QUOTA/)
  assert.equal(store.state.entries.length, 0)
  assert.equal(store.dayTotals(store.todayKey(), 'a').total, 328)
  global.wx.setStorageSync = save
  store.setDayTotal({ date: store.todayKey(), practiceId: 'a', total: 500, expectedTotal: 328 })
  assert.equal(store.state.entries.length, 1)
  delete global.wx
})
test('功课设置目标立即同步首页、详情及主修日历，取消后不再判断达标', () => {
  const { store } = makeStore(), settings = load('practice-settings', store, { id: 'a' })
  const before = JSON.stringify(store.state.contexts)
  settings.saveTarget('100')
  assert.equal(store.dayTotals(store.todayKey(), 'a').target, 100)
  const today = load('today', store)
  assert.equal(today.data.practices.find(p => p.id === 'a').done, true)
  const detail = load('practice-detail', store, { id: 'a', side: 'phone' })
  assert.equal(detail.data.targetText, '100'); assert.equal(detail.data.percent, 100)
  const calendar = load('calendar', store)
  assert.equal(calendar.data.cells.find(c => c.date === store.todayKey()).dot, 'met')
  settings.saveTarget('1000')
  assert.equal(store.mainDayStatus(store.todayKey()), 'partial')
  assert.equal(detail.data.targetText, '1,000')
  settings.saveTarget('')
  assert.equal(store.dayTotals(store.todayKey(), 'a').target, null)
  assert.equal(detail.data.hasTarget, false)
  assert.equal(store.mainDayStatus(store.todayKey()), 'none')
  assert.equal(JSON.stringify(store.state.contexts), before)
  delete global.wx
})
test('旧版已保存但尚未生效的同值目标，重新保存后立即应用到今天', () => {
  const { store } = makeStore()
  store.getPractice('a').dailyTarget = 700
  assert.equal(store.dayTotals(store.todayKey(), 'a').target, 500)
  const settings = load('practice-settings', store, { id: 'a' })
  settings.saveTarget('700')
  assert.equal(store.dayTotals(store.todayKey(), 'a').target, 700)
  delete global.wx
})
test('从历史日期进入补录再返回，保留选中日期并刷新该日记录', () => {
  const { store } = makeStore(), p = load('calendar', store)
  const selected = domain.addDays(store.todayKey(), -3)
  p.onDayTap({ currentTarget: { dataset: { date: selected } } })
  let url
  global.wx.navigateTo = options => { url = options.url }
  p.onDayDetails()
  assert.equal(url, '/pages/day-detail/day-detail?date=' + selected)
  p.onHide()
  store.addEntry({ date: selected, practiceId: 'a', amount: 5 })
  p.onShow()
  assert.equal(p.data.selectedDate, selected)
  assert.equal(p.data.cells.find(c => c.date === selected).selected, true)
  assert.equal(p.data.dayGroups[0].rows.find(r => r.id === 'a').amount, '5 声')
  delete global.wx
})
test('返回日历保留历史月份和单功课筛选；新打开日历才默认今天', () => {
  const { store } = makeStore(), p = load('calendar', store)
  assert.equal(p.data.selectedDate, store.todayKey())
  p.onPrevMonth()
  p.onViewChange({ detail: { value: p.data.viewOptions.findIndex(o => o.id === 'b') } })
  const before = { date: p.data.selectedDate, year: p.data.year, month: p.data.month }
  p.onHide(); p.onShow()
  assert.equal(p.data.selectedDate, before.date)
  assert.equal(p.data.year, before.year)
  assert.equal(p.data.month, before.month)
  assert.equal(p.data.viewPid, 'b')
  assert.equal(load('calendar', store).data.selectedDate, store.todayKey())
  delete global.wx
})
test('日历可直接跨两年选月份，选日期进入补录返回仍保留该年月与筛选', () => {
  const { store } = makeStore(), p = load('calendar', store)
  const month = `${Number(store.todayKey().slice(0, 4)) - 2}-${store.todayKey().slice(5, 7)}`
  p.onViewChange({ detail: { value: p.data.viewOptions.findIndex(o => o.id === 'b') } })
  p.onMonthPick({ detail: { value: month } })
  assert.equal(p.data.monthValue, month)
  assert.equal(p.data.year, Number(month.slice(0, 4)))
  assert.equal(p.data.monthEnd, store.todayKey().slice(0, 7))
  p.onDayTap({ currentTarget: { dataset: { date: month + '-22' } } })
  let url; global.wx.navigateTo = o => { url = o.url }
  p.onDayDetails()
  assert.equal(url, '/pages/day-detail/day-detail?date=' + month + '-22')
  p.onHide(); p.onShow()
  assert.equal(p.data.selectedDate, month + '-22')
  assert.equal(p.data.monthValue, month)
  assert.equal(p.data.viewPid, 'b')
  assert.equal(p.data.isTodaySelected, false)
  delete global.wx
})
test('选月份保留日号，闰年和短月自动取当月最后一天，当前月不选未来日期', () => {
  const { store } = makeStore(), p = load('calendar', store)
  p.setData({ year: 2024, month: 1, selectedDate: '2024-01-31' })
  p.onMonthPick({ detail: { value: '2024-02' } })
  assert.equal(p.data.selectedDate, '2024-02-29')
  p.onMonthPick({ detail: { value: '2023-02' } })
  assert.equal(p.data.selectedDate, '2023-02-28')
  p.setData({ selectedDate: '2024-01-31' })
  p.onMonthPick({ detail: { value: store.todayKey().slice(0, 7) } })
  assert.equal(p.data.selectedDate, store.todayKey())
  delete global.wx
})
test('月份选择拒绝非法和未来月份；回到今天保留功课筛选与所有记录', () => {
  const { store } = makeStore(), p = load('calendar', store)
  const before = JSON.stringify(store.state)
  p.onMonthPick({ detail: { value: '2024-02' } })
  for (const value of ['2024-00', '2024-13', '2024-2', 'bad', undefined, '9999-01', '1899-12']) {
    p.onMonthPick({ detail: { value } })
    assert.equal(p.data.monthValue, '2024-02')
  }
  p.onViewChange({ detail: { value: p.data.viewOptions.findIndex(o => o.id === 'b') } })
  p.onToday()
  assert.equal(p.data.monthValue, store.todayKey().slice(0, 7))
  assert.equal(p.data.selectedDate, store.todayKey())
  assert.equal(p.data.isTodaySelected, true)
  assert.equal(p.data.viewPid, 'b')
  assert.equal(JSON.stringify(store.state), before)
  p.onMonthPick({ detail: { value: '1900-01' } })
  assert.equal(p.data.canPrev, false)
  p.onPrevMonth()
  assert.equal(p.data.monthValue, '1900-01')
  delete global.wx
})
test('大愿标题各入口只显示愿名，兼容旧自动前缀，不改写原有数据', () => {
  const { store } = makeStore()
  const custom = store.createVow({ practiceId: 'a', name: '安心持名', targetTotal: 1000, startDate: store.todayKey() })
  const legacy = store.createVow({ practiceId: 'a', name: '念佛 · 100万声', targetTotal: 1000000, startDate: store.todayKey() })
  const before = JSON.stringify(store.state.vows)
  const list = load('vow-list', store)
  assert.equal(list.data.active.find(v => v.id === custom.id).title, '安心持名')
  assert.equal(list.data.active.find(v => v.id === legacy.id).title, '100万声')
  const calendar = load('calendar', store)
  assert.equal(calendar.data.vows.find(v => v.id === custom.id).title, '安心持名')
  assert.equal(calendar.data.vows.find(v => v.id === legacy.id).title, '100万声')
  assert.equal(load('vow-detail', store, { id: custom.id }).data.title, '安心持名')
  assert.equal(load('vow-detail', store, { id: legacy.id }).data.title, '100万声')
  assert.equal(load('practice-detail', store, { id: 'a' }).data.vow.name, '100万声')
  assert.equal(load('vow-new', store, { id: legacy.id }).data.name, '100万声')
  assert.equal(JSON.stringify(store.state.vows), before)
  delete global.wx
})
test('新建大愿按功课与目标生成名称，修改目标或关联功课不会覆盖手填名称', () => {
  const { store } = makeStore(), p = load('vow-new', store, { pid: 'a' })
  assert.equal(p.data.name, '念佛')
  p.onTargetInput({ detail: { value: '10000' } })
  assert.equal(p.data.name, '念佛1万声')
  p.onPracticeChange({ detail: { value: 1 } })
  assert.equal(p.data.name, '诵经1万声')
  p.onTargetInput({ detail: { value: '' } })
  assert.equal(p.data.name, '诵经')
  p.onNameInput({ detail: { value: '日日精进' } })
  p.onTargetInput({ detail: { value: '20000' } })
  p.onPracticeChange({ detail: { value: 1 } })
  assert.equal(p.data.name, '日日精进')
  delete global.wx
})

test('一座专修默认一炷香 35 分钟；取消不改记录，确认仅重置当前来源本轮', () => {
  const { store } = makeStore(), p = load('practice-detail', store, { id: 'a', side: 'phone' })
  let modal, calls = 0
  global.wx.showModal = o => { modal = o; calls++ }
  const before = JSON.stringify(store.state.contexts)
  p.onOpenSheet()
  assert.equal(p.data.reminderType, 'time'); assert.equal(p.data.reminderTime, 35)
  p.onStartRound(); p.onStartRound()
  assert.equal(calls, 1)
  assert.equal(modal.content, '本轮将重新计数，已累计的计数会保留。')
  modal.success({ confirm: false })
  assert.equal(JSON.stringify(store.state.contexts), before)
  p.onStartRound(); modal.success({ confirm: true })
  assert.equal(store.context('phone').roundCount, 0)
  assert.equal(store.context('phone').reminder.value, 35)
  assert.equal(store.context('ring').roundCount, 300)
  assert.equal(store.dayTotals(store.todayKey(), 'a').total, 328)
  assert.equal(store.lastReminder().value, 35)
  delete global.wx
})
test('专修支持自定义分钟与次数；无效值不启动，不再接受不提醒选项', () => {
  const { store } = makeStore(), p = load('practice-detail', store, { id: 'a', side: 'phone' })
  let modal
  global.wx.showModal = o => { modal = o }
  p.onOpenSheet()
  p.onPickReminderType({ currentTarget: { dataset: { type: 'none' } } })
  assert.equal(p.data.reminderType, 'time')
  for (const value of ['', '0', '-1', '1.5', 'Infinity']) {
    p.onCustomTime({ detail: { value } }); p.onStartRound()
    assert.ok(p.data.reminderError); assert.equal(modal, undefined)
  }
  p.onCustomTime({ detail: { value: '47' } }); p.onStartRound(); modal.success({ confirm: true })
  assert.equal(store.context('phone').reminder.value, 47)
  p.onOpenSheet(); assert.equal(p.data.reminderTime, 47)
  p.onPickReminderType({ currentTarget: { dataset: { type: 'count' } } })
  p.onCustomCount({ detail: { value: '321' } }); p.onStartRound(); modal.success({ confirm: true })
  assert.equal(store.context('phone').reminder.type, 'count')
  assert.equal(store.context('phone').reminder.value, 321)
  assert.equal(store.dayTotals(store.todayKey(), 'a').total, 328)
  delete global.wx
})
test('普通开始计数的确认框没有小字，不沿用专修目标或影响设备本轮', () => {
  const { store } = makeStore()
  store.saveReminder({ type: 'time', value: 47 })
  const p = load('practice-detail', store, { id: 'b', side: 'phone' })
  let modal
  global.wx.showModal = o => { modal = o }
  p.onContinue()
  assert.equal(modal.title, '开始计数？'); assert.equal(modal.content, '')
  modal.success({ confirm: true })
  assert.equal(store.context('phone').practiceId, 'b')
  assert.equal(store.context('phone').reminder, null)
  assert.equal(store.context('ring').roundCount, 300)
  assert.equal(store.lastReminder().value, 47)
  delete global.wx
})

test('专修时间为一柱香、15分钟、30分钟与自定义；重开恢复自定义值', () => {
  const { store } = makeStore(), p = load('practice-detail', store, { id: 'a', side: 'phone' })
  assert.deepEqual(Array.from(p.data.timeOptions, o => o.value), [35, 15, 30])
  p.onPickReminderTime({ currentTarget: { dataset: { value: 15 } } })
  assert.equal(p.data.reminderTime, 15); assert.equal(p.data.reminderTimeCustom, false)
  p.onPickReminderTime({ currentTarget: { dataset: { custom: true } } })
  assert.equal(p.data.reminderTimeCustom, true)
  p.onCustomTime({ detail: { value: '47' } })
  store.saveReminder({ type: 'time', value: 47 }); p.onOpenSheet()
  assert.equal(p.data.reminderTime, 47); assert.equal(p.data.reminderTimeCustom, true)
  p.onPickReminderTime({ currentTarget: { dataset: { value: 30 } } })
  assert.equal(p.data.reminderTime, 30); assert.equal(p.data.reminderTimeCustom, false)
  delete global.wx
})
test('专修进行中显示本座计数和结束倒计时，结束保留累计且不影响另一来源', async () => {
  const { store } = makeStore()
  store.startRound('phone', 'a', { type: 'time', value: 35 }); store.tap('phone')
  const p = load('practice-detail', store, { id: 'a', side: 'phone' })
  assert.equal(p.data.statusText, '一座专修已计 1 声')
  assert.match(p.data.reminderText, /^距结束 (34:59|35:00)$/)
  const before = store.dayTotals(store.todayKey(), 'a').total
  const ring = JSON.stringify(store.context('ring'))
  let modal
  global.wx.showModal = o => { modal = o }
  p.onCancelReminder(); assert.equal(modal.title, '结束本座专修？')
  await modal.success({ confirm: false })
  assert.ok(store.context('phone').reminder)
  p.onCancelReminder(); await modal.success({ confirm: true })
  assert.equal(store.context('phone').reminder, null)
  assert.equal(store.context('phone').roundCount, 1)
  assert.equal(store.dayTotals(store.todayKey(), 'a').total, before)
  assert.equal(JSON.stringify(store.context('ring')), ring)
  assert.equal(p.data.reminderText, '')
  delete global.wx
})
test('结束静坐专修会结算时长，次数专修显示距结束的剩余次数', async () => {
  const { store } = makeStore(), p = load('practice-detail', store, { id: 'a', side: 'phone' })
  assert.equal(p.data.reminderText, '距结束还差 80 声')
  store.addPractice({ id: 'sit', name: '静坐', type: 'time' })
  store.startRound('phone', 'sit', { type: 'time', value: 15 })
  const sit = load('practice-detail', store, { id: 'sit', side: 'phone' })
  assert.match(sit.data.statusText, /^一座专修已计 /)
  let modal; global.wx.showModal = o => { modal = o }
  sit.onCancelReminder(); await modal.success({ confirm: true })
  assert.equal(store.context('phone'), null)
  assert.equal(store.dayTotals(store.todayKey(), 'sit').times, 1)
  delete global.wx
})

test('补录按主修与常用分组，高亮留在所属组，展开和改数同步到分组视图', () => {
  const { store } = makeStore(), p = load('day-detail', store, { pid: 'b' })
  assert.deepEqual(Array.from(p.data.groups, g => g.title), ['主修功课', '常用功课'])
  assert.equal(p.data.groups[0].rows[0].id, 'a')
  assert.equal(p.data.groups[1].rows[0].id, 'b')
  assert.equal(p.data.groups[1].rows[0].highlight, true)
  p.onTotalFocus(event('b')); p.onTotalInput(event('b', '3')); p.onTotalCommit(event('b', '3'))
  let row = p.data.groups[1].rows[0]
  assert.equal(row.inputValue, '3'); assert.equal(row.entries.length, 1)
  p.onToggleEntries({ currentTarget: { dataset: { index: row.rowIndex } } })
  assert.equal(p.data.groups[1].rows[0].expanded, true)
  assert.equal(p.data.groups[0].rows[0].expanded, false)
  p.refresh(); assert.equal(p.data.groups[1].rows[0].expanded, true)
  store.setPracticeGroup('b', 'main')
  assert.equal(p.data.groups.length, 1)
  assert.ok(p.data.groups[0].rows.some(r => r.id === 'b'))
  delete global.wx
})

test('管理页删除只移出当前列表，取消不变更，历史日历与累计保留名称和数量', () => {
  const { store } = makeStore(), p = load('practice-manage', store)
  store.addEntry({ date: store.todayKey(), practiceId: 'a', amount: 12 })
  const before = store.dayTotals(store.todayKey(), 'a')
  const entries = JSON.stringify(store.entriesFor(store.todayKey(), 'a'))
  let modal, calls = 0
  global.wx.showModal = o => { modal = o; calls++ }
  const e = { currentTarget: { dataset: { id: 'a' } } }
  p.onDelete(e); p.onDelete(e)
  assert.equal(calls, 1); assert.match(modal.content, /历史修行记录会保留/)
  modal.success({ confirm: false })
  assert.ok(store.getPractice('a')); assert.equal(p.data.rows.length, 2)
  p.onDelete(e); modal.success({ confirm: true })
  assert.equal(store.getPractice('a'), null)
  assert.ok(!p.data.rows.some(r => r.id === 'a'))
  const after = store.dayTotals(store.todayKey(), 'a')
  for (const key of ['total', 'ring', 'phone', 'manual', 'target']) assert.equal(after[key], before[key], key)
  assert.equal(JSON.stringify(store.entriesFor(store.todayKey(), 'a')), entries)
  const calendar = load('calendar', store)
  const historical = calendar.data.dayGroups.flatMap(g => g.rows).find(r => r.id === 'a')
  assert.equal(historical.name, '念佛')
  const detail = load('day-detail', store)
  assert.equal(detail.data.rows.find(r => r.id === 'a').name, '念佛')
  assert.equal(detail.data.rows.find(r => r.id === 'a').canEdit, false)
  const summary = load('summary', store)
  assert.equal(summary.data.practices.find(r => r.id === 'a').name, '念佛')
  delete global.wx
})
test('管理页删除失败后可重试，另一功课和历史记录不受影响', () => {
  const { store, toast } = makeStore(), p = load('practice-manage', store)
  let modal
  global.wx.showModal = o => { modal = o }
  const original = store.removePractice
  store.removePractice = () => { throw new Error('QUOTA') }
  p.onDelete({ currentTarget: { dataset: { id: 'b' } } }); modal.success({ confirm: true })
  assert.ok(store.getPractice('b')); assert.equal(p._deleting, false)
  assert.equal(toast.at(-1), '删除失败，请重试')
  store.removePractice = original
  p.onDelete({ currentTarget: { dataset: { id: 'b' } } }); modal.success({ confirm: true })
  assert.equal(store.getPractice('b'), null); assert.ok(store.getPractice('a'))
  assert.equal(store.dayTotals(store.todayKey(), 'a').total, 328)
  delete global.wx
})
