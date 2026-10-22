'use strict'

const store = getApp().globalData.store
const LIB = require('../../data/publicPractices')

const MAX_NAME = 12
const DEFAULT_TYPE = 'count'
const DEFAULT_UNIT = '声'
const DEFAULT_TARGET = 108

function matchKeyword(practice, keyword) {
  if (!keyword) return true
  if (practice.name.includes(keyword)) return true
  return String(practice.alias || '')
    .split(' ')
    .some(alias => alias && alias.includes(keyword))
}

function truncate(text) {
  return text.length > MAX_NAME ? text.slice(0, MAX_NAME) : text
}

function alreadyAdded(name) {
  return store.practices().some(p => p.name === name)
}

Page({
  data: {
    keyword: '',
    results: [],
    showCreate: false,
    createName: '',
    creating: false,
    customType: 'count',
    units: ['声', '遍', '座', '次'],
    unitIndex: 0,
    customTarget: '108'
  },

  onLoad() {
    this.setData(this.viewFor(''))
  },

  // 关键字 → 视图数据：公共库过滤 + 已添加标记 + 自建入口
  viewFor(keyword) {
    const kw = keyword.trim()
    const results = LIB
      .filter(p => matchKeyword(p, kw))
      .map(p => Object.assign({}, p, { added: alreadyAdded(p.name) }))
    return {
      keyword,
      results,
      showCreate: !results.length && !!kw,
      createName: kw.length > MAX_NAME ? truncate(kw) + '…' : kw
    }
  },

  onSearch(e) {
    this.setData(this.viewFor(e.detail.value))
  },

  onClear() {
    this.setData(this.viewFor(''))
  },

  onPick(e) {
    const name = e.currentTarget.dataset.name
    const item = this.data.results.find(r => r.name === name)
    if (!item || item.added || alreadyAdded(name)) return
    store.addPractice({
      name: item.name,
      alias: item.alias,
      type: item.type,
      unit: item.unit,
      dailyTarget: item.dailyTarget,
      public: true
    })
    this.finish()
  },

  onCreate() { this.setData({creating:true}) },
  closeCreate() { this.setData({creating:false}) },
  noop() {},
  onType(e) {
    const type=e.currentTarget.dataset.type
    this.setData({customType:type,customTarget:type==='time'?'30':'108'})
  },
  onUnit(e) { this.setData({unitIndex:Number(e.detail.value)}) },
  onCustomTarget(e) {this.setData({customTarget:e.detail.value})},
  saveCustom() {
    const name=this.data.keyword.trim()
    if(!name || name.length>MAX_NAME) {wx.showToast({title:'功课名请填写 1–12 个字',icon:'none'});return}
    const target=this.data.customTarget.trim()==='' ? null : Number(this.data.customTarget)
    if(target!==null && (!Number.isSafeInteger(target)||target<=0)) {wx.showToast({title:'目标请输入正整数',icon:'none'});return}
    if(alreadyAdded(name)) {wx.showToast({title:'已添加这项功课',icon:'none'});return}
    store.addPractice({name,type:this.data.customType,unit:this.data.customType==='time'?'分钟':this.data.units[this.data.unitIndex],dailyTarget:target,public:false})
    this.finish()
  },

  finish() {
    wx.showToast({ title: '已添加' })
    wx.navigateBack()
  }
})
