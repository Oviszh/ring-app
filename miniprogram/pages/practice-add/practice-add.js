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
    createName: ''
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

  onCreate() {
    const name = truncate(this.data.keyword.trim())
    if (!name || alreadyAdded(name)) return
    store.addPractice({
      name,
      type: DEFAULT_TYPE,
      unit: DEFAULT_UNIT,
      dailyTarget: DEFAULT_TARGET,
      public: false
    })
    this.finish()
  },

  finish() {
    wx.showToast({ title: '已添加' })
    wx.navigateBack()
  }
})
