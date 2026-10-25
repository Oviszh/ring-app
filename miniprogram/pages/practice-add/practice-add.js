'use strict'

const store = getApp().globalData.store
const LIB = require('../../data/publicPractices')
const { normalize, searchPractices } = require('../../utils/public-practice-search')

const MAX_NAME = 12
const DEFAULT_TYPE = 'count'
const DEFAULT_UNIT = '声'
const DEFAULT_TARGET = 108

const RECOMMENDED = ['南无阿弥陀佛', '阿弥陀佛', '南无观世音菩萨', '心经', '大悲咒', '金刚经', '三皈依', '四皈依', '金刚萨埵百字明', '大礼拜', '静坐']
const CATEGORIES = [{ id: 'recommended', name: '常见' }, { id: 'name', name: '圣号' }, { id: 'sutra', name: '经文' }, { id: 'mantra', name: '咒语' }, { id: 'prayer', name: '祈愿礼忏' }, { id: 'practice', name: '行持' }, { id: 'all', name: '全部' }]

function truncate(text) {
  return text.length > MAX_NAME ? text.slice(0, MAX_NAME) : text
}

function alreadyAdded(item) {
  const names = [item.name].concat(item.aliases || [], item.legacyNames || []).map(normalize)
  const ids = [item.id].concat(item.legacyPublicIds || [])
  return store.practices().some(p => normalize(p.name) === normalize(item.name) ||
    (p.public && (p.publicId ? ids.includes(p.publicId) : names.includes(normalize(p.name)))))
}

Page({
  data: {
    keyword: '', group: 'main', category: 'recommended', categories: CATEGORIES,
    sectionTitle: '常见功课',
    results: [],
    showCreate: false,
    createName: '',
    creating: false,
    customType: 'count',
    units: ['声', '部', '遍', '拜', '座', '圈', '息', '页', '次'],
    unitIndex: 0,
    customTarget: '108'
  },

  onLoad() {
    this.setData(this.viewFor(''))
  },

  // 关键字 → 视图数据：公共库过滤 + 已添加标记 + 自建入口
  viewFor(keyword, category = this.data.category) {
    const kw = keyword.trim()
    const candidates = kw
      ? searchPractices(LIB, kw)
      : category === 'recommended'
        ? RECOMMENDED.map(name => LIB.find(p => p.name === name && !p.deprecated)).filter(Boolean)
        : LIB.filter(p => !p.deprecated && (category === 'all' || p.category === category))
    const results = candidates
      .map(p => Object.assign({}, p, { added: alreadyAdded(p) }))
    return {
      keyword, category,
      sectionTitle: kw ? '搜索结果' : category === 'recommended' ? '常见功课' : category === 'all' ? '全部功课' : (CATEGORIES.find(c => c.id === category) || {}).name,
      results,
      showCreate: !results.length && !!kw,
      createName: kw.length > MAX_NAME ? truncate(kw) + '…' : kw
    }
  },

  onGroup(e) { this.setData({ group: e.currentTarget.dataset.group }) },
  onCategory(e) {
    const id = e.currentTarget.dataset.id
    if (CATEGORIES.some(c => c.id === id)) this.setData(this.viewFor('', id))
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
    if (!item || item.added || alreadyAdded(item)) return
    try { store.addPractice({
      name: item.name,
      group: this.data.group,
      alias: (item.aliases || []).join(' '),
      publicId: item.id,
      desc: item.desc,
      type: item.type,
      unit: item.unit,
      dailyTarget: item.dailyTarget,
      public: true
    }) } catch (e) { return }
    this.finish()
  },

  onCreate() {
    const name = this.data.keyword.trim()
    if (!name) { this.setData({ creating: true, createName: '', customName: '', customType: 'count', customTarget: '108' }); return }
    this.setData({ creating: true, customName: name, createName: name })
  },
  onCustomName(e) { this.setData({ customName: e.detail.value }) },
  closeCreate() { this.setData({creating:false}) },
  noop() {},
  onType(e) {
    const type=e.currentTarget.dataset.type
    this.setData({customType:type,customTarget:type==='time'?'30':'108'})
  },
  onUnit(e) { this.setData({unitIndex:Number(e.detail.value)}) },
  onCustomTarget(e) {this.setData({customTarget:e.detail.value})},
  saveCustom() {
    const name=String(this.data.customName || '').trim()
    if(!name || name.length>MAX_NAME) {wx.showToast({title:'功课名请填写 1–12 个字',icon:'none'});return}
    const target=this.data.customTarget.trim()==='' ? null : Number(this.data.customTarget)
    if(target!==null && (!Number.isSafeInteger(target)||target<=0)) {wx.showToast({title:'目标请输入正整数',icon:'none'});return}
    if(store.practices().some(p => normalize(p.name) === normalize(name))) {wx.showToast({title:'已添加这项功课',icon:'none'});return}
    try { store.addPractice({name,group:this.data.group,type:this.data.customType,unit:this.data.customType==='time'?'分钟':this.data.units[this.data.unitIndex],dailyTarget:target,public:false}) } catch (e) { return }
    this.finish()
  },

  finish() {
    wx.showToast({ title: '已添加' })
    wx.navigateBack()
  }
})
