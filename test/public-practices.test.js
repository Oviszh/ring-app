'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const LIB = require('../miniprogram/data/publicPractices')
const SOURCES = require('../miniprogram/data/publicPracticeSources')
const { normalize, searchPractices } = require('../miniprogram/utils/public-practice-search')
const visible = LIB.filter(p => !p.deprecated)
const find = keyword => searchPractices(LIB, keyword)
function pageWith(records = []) {
  let spec
  const added = [], file = path.resolve(__dirname, '../miniprogram/pages/practice-add/practice-add.js')
  const store = { practices: () => records.concat(added), addPractice: p => added.push(p) }
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: createRequire(file), getApp: () => ({ globalData: { store } }), Page: p => { spec = p },
    wx: { showToast() {}, navigateBack() {} }
  })
  const page = Object.assign({}, spec, { data: JSON.parse(JSON.stringify(spec.data)) })
  page.setData = patch => Object.assign(page.data, patch)
  page.onLoad()
  return { page, added }
}
test('功课库名称和稳定标识唯一，每项有可追溯来源与正确记录方式', () => {
  assert.equal(new Set(LIB.map(p => p.id)).size, LIB.length)
  assert.equal(new Set(visible.map(p => p.name)).size, visible.length)
  for (const p of LIB) {
    assert.ok(p.id && p.name && p.desc)
    assert.ok(['name', 'sutra', 'mantra', 'prayer', 'practice'].includes(p.category), p.id)
    assert.ok(['count', 'time'].includes(p.type) && p.unit, p.id)
    assert.ok(p.sources.length && p.sources.every(key => SOURCES[key]), p.id)
    assert.equal(new Set(p.aliases).size, p.aliases.length, p.id)
    if (p.deprecated) assert.ok(visible.some(v => v.id === p.replacedBy))
  }
  assert.equal(LIB.find(p => p.id === 'jingzuo').type, 'time')
})
test('三皈依和四皈依分别可添加，大拜等称呼指向同一大礼拜记录', () => {
  assert.equal(find('三皈依')[0].id, 'san-guiyi')
  assert.equal(find('四皈依')[0].id, 'si-guiyi')
  for (const keyword of ['大拜', '天意运动', '磕大头', '磕长头', '叩長頭']) assert.equal(find(keyword)[0].id, 'dabai-san', keyword)
  assert.equal(find('拜佛')[0].id, 'libai')
  assert.ok(visible.every(p => !/加行之一|净除业障|长寿修法|藏传财神修法/.test(p.desc)))
})
test('百字明、短心咒、长陀罗尼及礼赞不混作同一功课', () => {
  const hundred = find('百字明')[0]
  assert.equal(hundred.name, '金刚萨埵百字明')
  assert.ok(hundred.incipit && hundred.desc.includes('萨玛雅') && /[\u0f00-\u0fff]/.test(hundred.tibetan))
  assert.equal(find('金刚萨埵心咒')[0].id, 'jingang-saduo-xinzhou')
  assert.ok(!find('金刚萨埵心咒').some(p => p.id === hundred.id))
  assert.equal(find('佛顶尊胜陀罗尼')[0].id, 'zunsheng-tuoluoni')
  assert.equal(find('尊胜佛母心咒')[0].id, 'zunsheng-fomu')
  assert.equal(find('二十一度母礼赞')[0].id, 'ershiyi-dumu-zan')
  assert.equal(find('七句祈请文')[0].id, 'lianshi-qiju')
})
test('繁简称呼、空格标点与藏文起句均可检索，不改写原始咒文', () => {
  assert.equal(find('金剛薩埵百字明')[0].id, 'jingang-saduo-baiziming')
  assert.equal(find('三歸依')[0].id, 'san-guiyi')
  assert.equal(find('南無普賢菩薩')[0].id, 'nanmo-puxian')
  assert.equal(find('嗡，阿 惹 帕 查 纳 谛')[0].id, 'wenshu-xinzhou')
  const original = LIB.find(p => p.id === 'jingang-saduo-baiziming').tibetan
  assert.equal(find('བཛྲ་ས་ཏྭ་ས་མ་ཡ')[0].id, 'jingang-saduo-baiziming')
  assert.equal(LIB.find(p => p.id === 'jingang-saduo-baiziming').tibetan, original)
  assert.equal(normalize('大禮拜'), '大礼拜')
})
test('分类能浏览全部系统功课，搜索跨分类，旧重复条目不再重复出现', () => {
  const { page } = pageWith()
  for (const id of ['name', 'sutra', 'mantra', 'prayer', 'practice']) {
    page.onCategory({ currentTarget: { dataset: { id } } })
    assert.ok(page.data.results.length && page.data.results.every(p => p.category === id))
  }
  page.onSearch({ detail: { value: '百字明' } })
  assert.equal(page.data.results[0].id, 'jingang-saduo-baiziming')
  page.onCategory({ currentTarget: { dataset: { id: 'all' } } })
  assert.equal(page.data.results.length, visible.length)
  assert.ok(!page.data.results.some(p => p.deprecated))
  assert.equal(page.data.results.find(p => p.id === 'chaojing').category, 'practice')
  assert.equal(page.data.results.find(p => p.id === 'guiyi').category, 'prayer')
  assert.equal(find('阿弥陀佛根本秘密神咒')[0].id, 'wangsheng-zhou')
})
test('旧库标识仍识别已添加，短心咒独立添加不会改动旧百字明记录', () => {
  const records = [{ public: true, publicId: 'jingang-saduo-baiziming', name: '金刚萨垛百字明', total: 123 },
    { public: true, publicId: 'fo-shuofa-shenzhou', name: '佛说阿弥陀佛根本秘密神咒', total: 456 }]
  const before = JSON.stringify(records), { page, added } = pageWith(records)
  page.onSearch({ detail: { value: '百字明' } })
  assert.equal(page.data.results[0].added, true)
  page.onSearch({ detail: { value: '金刚萨埵心咒' } })
  assert.equal(page.data.results[0].added, false)
  page.onGroup({ currentTarget: { dataset: { group: 'common' } } })
  page.onPick({ currentTarget: { dataset: { name: page.data.results[0].name } } })
  assert.equal(added[0].publicId, 'jingang-saduo-xinzhou')
  assert.equal(added[0].group, 'common'); assert.equal(added[0].unit, '遍')
  page.onSearch({ detail: { value: '往生咒' } })
  assert.equal(page.data.results[0].added, true)
  assert.equal(JSON.stringify(records), before)
})
