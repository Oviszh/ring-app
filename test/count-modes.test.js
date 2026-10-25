'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const { createRequire } = require('node:module')
const domain = require('../miniprogram/services/domain')
const { createStore } = require('../miniprogram/services/store')
const { ledDigits } = require('../miniprogram/utils/led')

function fixture(bound = false) {
  const ts = Date.now()
  const initial = domain.createInitialState(ts)
  const a = domain.createPractice(initial, { id: 'a', name: '念佛', dailyTarget: 108 }, ts)
  domain.createPractice(initial, { id: 'b', name: '诵经', dailyTarget: 3 }, ts)
  domain.startNewRound(initial, 'phone', a.id, { ts, reminder: { type: 'count', value: 500 } })
  domain.tap(initial, 'phone', ts, 7)
  if (bound) {
    domain.addDevice(initial, { id: 'dev-1', name: '计数设备', ts })
    domain.startNewRound(initial, 'ring', a.id, { ts, reminder: { type: 'count', value: 108 } })
    initial.contexts.ring.deviceId = 'dev-1'
    domain.tap(initial, 'ring', ts, 3)
  }
  const mem = new Map([['nianfo_state_v1', initial]])
  global.wx = {
    getStorageSync: k => mem.has(k) ? JSON.parse(JSON.stringify(mem.get(k))) : null,
    setStorageSync: (k, value) => mem.set(k, JSON.parse(JSON.stringify(value))),
    showModal() {}, navigateTo() {}, switchTab() {}, setNavigationBarTitle() {}
  }
  return createStore()
}

function loadPage(name, store) {
  const file = path.resolve(__dirname, `../miniprogram/pages/${name}/${name}.js`)
  let spec
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: createRequire(file), getApp: () => ({ globalData: { store } }),
    Page: p => { spec = p }, wx: global.wx, Date,
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}
  })
  const p = Object.assign({}, spec, { data: JSON.parse(JSON.stringify(spec.data)) })
  p.setData = function (data) { Object.assign(this.data, data) }
  if (p.onLoad) p.onLoad({ id: 'a' })
  if (p.onShow) p.onShow()
  return p
}

const side = (p, value) => p.onSideTab({ currentTarget: { dataset: { side: value } } })

test('双入口默认开启；未绑定显示未绑定，不创建或重置触屏本轮', () => {
  const s = fixture()
  const before = JSON.stringify(s.state.contexts)
  const p = loadPage('today', s)
  assert.equal(p.data.ringEnabled, true)
  assert.equal(p.data.phoneEnabled, true)
  assert.equal(p.data.side, 'ring')
  assert.equal(p.data.ringEmpty, true)
  assert.equal(p.data.roundText, '------')
  side(p, 'phone')
  assert.equal(p.data.roundText, '7')
  side(p, 'ring')
  assert.equal(JSON.stringify(s.state.contexts), before)
  delete global.wx
})

test('切换页签、浏览功课、开关任一入口都不改变双本轮及提醒', () => {
  const s = fixture(true)
  const before = JSON.stringify(s.state.contexts)
  const p = loadPage('today', s)
  assert.equal(p.data.roundText, '3')
  assert.equal(p.data.tabsVisible, true)
  side(p, 'phone'); assert.equal(p.data.roundText, '7')
  side(p, 'ring'); p.onNextPractice()
  side(p, 'phone'); assert.equal(p.data.currentPracticeId, 'a')
  side(p, 'ring'); assert.equal(p.data.currentPracticeId, 'b')
  const settings = loadPage('settings', s)
  settings.onPhoneChange({ detail: { value: false } })
  assert.equal(p.data.side, 'ring')
  assert.equal(p.data.tabsVisible, false)
  settings.onRingChange({ detail: { value: false } })
  assert.equal(p.data.fillOnly, true)
  assert.equal(p.data.tabsVisible, false)
  settings.onPhoneChange({ detail: { value: true } })
  assert.equal(p.data.side, 'phone')
  assert.equal(p.data.roundText, '7')
  assert.equal(p.data.tabsVisible, false)
  settings.onRingChange({ detail: { value: true } })
  assert.equal(p.data.ringEnabled, true)
  assert.equal(p.data.tabsVisible, true)
  assert.equal(JSON.stringify(s.state.contexts), before)
  assert.equal(s.dayTotals(s.todayKey(), 'a').total, 10)
  delete global.wx
})

test('功课详情选择设备计数不操作触屏上下文；全部关闭时只保留填报', () => {
  const s = fixture(true)
  const p = loadPage('practice-detail', s)
  const before = JSON.stringify(s.state.contexts)
  p.onCountSide({ currentTarget: { dataset: { side: 'ring' } } })
  assert.equal(p.data.side, 'ring')
  assert.equal(p.data.roundCount, 3)
  p.onCountSide({ currentTarget: { dataset: { side: 'phone' } } })
  assert.equal(p.data.roundCount, 7)
  assert.equal(JSON.stringify(s.state.contexts), before)
  s.setSetting('ringEnabled', false); s.setSetting('phoneEnabled', false)
  p.refresh()
  assert.equal(p.data.countAvailable, false)
  delete global.wx
})

test('LED 七段数字正确，前导零变淡，时钟冒号和长数字不截断', () => {
  const view = ledDigits('328')
  assert.equal(view.digits.map(d => d.char).join(''), '000328')
  assert.equal(view.digits.filter(d => d.muted).length, 3)
  const segments = char => ledDigits(char, 0).digits[0].segments.filter(s => s.on).map(s => s.segment).join('')
  assert.equal(segments('0'), 'abcdef')
  assert.equal(segments('1'), 'bc')
  assert.equal(segments('8'), 'abcdefg')
  assert.equal(ledDigits('12:34', 0).digits[2].colon, true)
  assert.equal(ledDigits('123456789012').label, '123456789012')
  assert.equal(ledDigits('123456789012').size, 'small')
})

test('关闭触屏计数后，旧计数页面不能绕过开关继续点按或开启新一轮', () => {
  const s = fixture(true)
  s.setSetting('phoneEnabled', false)
  const before = JSON.stringify(s.state.contexts)
  const p = loadPage('woodfish', s)
  p.onTapWoodfish()
  p.onStartNewSession()
  assert.equal(p.data.ready, false)
  assert.equal(JSON.stringify(s.state.contexts), before)
  delete global.wx
})

test('正式配置不允许旧备份中的模拟开关生成演示设备', () => {
  const ble = require('../miniprogram/services/ble')
  assert.equal(ble.getAdapter({ settings: { bleMock: true } }).kind, 'wechat')
})
