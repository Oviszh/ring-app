'use strict'

const { fmtNum } = require('../../utils/format')
const { dayKey, addDays, diffDays } = require('../../services/domain')

const store = getApp().globalData.store

const START_OPTIONS = ['明天开始', '今天开始', '选择过去日期…']
const DEADLINE_OPTIONS = ['不限', '1年', '3年', '5年', '自定义日期…']
const PRESET_YEARS = [0, 1, 3, 5, 0]

function nameOf(practice) {
  return practice.displayName || practice.name
}

// 目标格式化：>= 1 万显示「X万声」，如 1000000 -> 100万声
function fmtTarget(n, unit) {
  if (n >= 10000) {
    const wan = n / 10000
    const text = Number.isInteger(wan) ? String(wan) : wan.toFixed(1).replace(/\.0$/, '')
    return `${text}万${unit}`
  }
  return fmtNum(n) + unit
}

function autoName(practiceName, target, unit) {
  return target > 0 ? `${practiceName} · ${fmtTarget(target, unit)}` : practiceName
}

function addYears(key, n) {
  const parts = key.split('-').map(Number)
  const y = parts[0] + n
  const m = parts[1]
  const d = parts[2]
  const dt = new Date(y, m - 1, d)
  if (dt.getMonth() !== m - 1) dt.setDate(0) // 2/29 -> 2/28
  return dayKey(dt.getTime())
}

function detectDeadlineIndex(startDate, deadline) {
  if (!deadline) return 0
  for (let i = 1; i <= 3; i++) {
    if (addYears(startDate, PRESET_YEARS[i]) === deadline) return i
  }
  return 4
}

Page({
  data: {
    ready: false,
    noPractices: false,
    isEdit: false,
    editId: '',

    practices: [],
    practiceIndex: 0,
    practiceName: '',
    unit: '声',

    target: '',
    name: '',
    existingTotal: '0',

    today: '',
    startOptions: START_OPTIONS,
    startIndex: 0,
    startText: START_OPTIONS[0],
    startDate: '',
    startDesc: '',

    deadlineOptions: DEADLINE_OPTIONS,
    deadlineIndex: 0,
    deadlineText: '不限',
    deadline: '',
    showDeadlinePicker: false,
    dailyHint: '',

    submitText: '发愿'
  },

  onLoad(options) {
    this._nameTouched = false
    this._pid = (options && options.pid) || ''
    const id = (options && options.id) || ''
    if (id) this.initEdit(id)
    else this.initCreate(this._pid)
  },

  onShow() {
    // 从「添加功课」返回时重新初始化
    if (this.data.noPractices) this.initCreate(this._pid)
  },

  // —— 初始化 ——

  practiceList() {
    return store.practices().map(p => ({
      id: p.id,
      name: nameOf(p),
      unit: p.unit || '声'
    }))
  },

  initCreate(pid) {
    const practices = this.practiceList()
    const today = store.todayKey()

    if (!practices.length) {
      this.setData({ ready: false, noPractices: true, today })
      return
    }

    let index = practices.findIndex(p => p.id === pid)
    if (index < 0) index = 0
    const practice = practices[index]
    const startDate = addDays(today, 1)

    this._nameTouched = false
    this.setData({
      ready: true,
      noPractices: false,
      isEdit: false,
      editId: '',
      practices,
      practiceIndex: index,
      practiceName: practice.name,
      unit: practice.unit,
      target: '',
      name: practice.name,
      existingTotal: '0',
      today,
      startIndex: 0,
      startText: START_OPTIONS[0],
      startDate,
      startDesc: `开始于 ${startDate}`,
      deadlineIndex: 0,
      deadlineText: DEADLINE_OPTIONS[0],
      deadline: '',
      showDeadlinePicker: false,
      dailyHint: '',
      submitText: '发愿'
    })
    wx.setNavigationBarTitle({ title: '新建大愿' })
  },

  initEdit(vowId) {
    const vow = store.vows().find(v => v.id === vowId)
    if (!vow) {
      wx.showToast({ title: '大愿不存在', icon: 'none' })
      wx.navigateBack()
      return
    }

    const practices = this.practiceList()
    const practice = store.getPractice(vow.practiceId)
    const practiceName = practice ? nameOf(practice) : ''
    let index = practices.findIndex(p => p.id === vow.practiceId)
    if (index < 0) index = 0

    const today = store.todayKey()
    let startIndex = 2
    if (vow.startDate === today) startIndex = 1
    else if (vow.startDate === addDays(today, 1)) startIndex = 0

    const deadlineIndex = detectDeadlineIndex(vow.startDate, vow.deadline)
    const deadline = vow.deadline || ''

    this._nameTouched = true
    this.setData({
      ready: true,
      noPractices: false,
      isEdit: true,
      editId: vow.id,
      practices,
      practiceIndex: index,
      practiceName,
      unit: practice ? practice.unit || '声' : '声',
      target: String(vow.targetTotal),
      name: vow.name,
      existingTotal: String(vow.existingTotal || 0),
      today,
      startIndex,
      startText: START_OPTIONS[startIndex],
      startDate: vow.startDate,
      startDesc: '开始日期不可修改',
      deadlineIndex,
      deadlineText: this.deadlineTextFor(deadlineIndex, deadline),
      deadline,
      showDeadlinePicker: deadlineIndex === 4,
      dailyHint: this.dailyHintFor(vow.targetTotal, vow.existingTotal, vow.startDate, deadline, practice ? practice.unit || '声' : '声'),
      submitText: '保存修改'
    })
    wx.setNavigationBarTitle({ title: '修改大愿' })
  },

  // —— 派生文案 ——

  deadlineTextFor(index, deadline) {
    if (index === 0) return '不限'
    if (index === 4) return deadline ? `至 ${deadline}` : '请选择日期'
    return `${PRESET_YEARS[index]}年（至 ${deadline}）`
  },

  dailyHintFor(targetVal, existingVal, startDate, deadline, unit) {
    const target = Number(targetVal)
    const existing = Number(existingVal) || 0
    if (!(target > 0) || !deadline) return ''
    const days = diffDays(startDate, deadline) + 1
    if (days <= 0) return '期限需晚于开始日期'
    const remain = Math.max(0, target - existing)
    if (remain === 0) return '已有累计已达目标'
    return `设期限则推算日均：约 ${fmtNum(Math.ceil(remain / days))} ${unit}／天`
  },

  startDescFor(startDate) {
    return `开始于 ${startDate}`
  },

  // —— 表单 ——

  onPracticeChange(e) {
    const index = Number(e.detail.value)
    const practice = this.data.practices[index]
    if (!practice) return

    const patch = {
      practiceIndex: index,
      practiceName: practice.name,
      unit: practice.unit
    }
    if (!this._nameTouched) {
      patch.name = autoName(practice.name, Number(this.data.target), practice.unit)
    }
    patch.dailyHint = this.dailyHintFor(
      this.data.target, this.data.existingTotal, this.data.startDate, this.data.deadline, practice.unit
    )
    this.setData(patch)
  },

  onTargetInput(e) {
    const target = e.detail.value
    const patch = { target }
    if (!this._nameTouched) {
      patch.name = autoName(this.data.practiceName, Number(target), this.data.unit)
    }
    patch.dailyHint = this.dailyHintFor(
      target, this.data.existingTotal, this.data.startDate, this.data.deadline, this.data.unit
    )
    this.setData(patch)
  },

  onNameInput(e) {
    this._nameTouched = true
    this.setData({ name: e.detail.value })
  },

  onExistingInput(e) {
    const existingTotal = e.detail.value
    this.setData({
      existingTotal,
      dailyHint: this.dailyHintFor(
        this.data.target, existingTotal, this.data.startDate, this.data.deadline, this.data.unit
      )
    })
  },

  onStartChange(e) {
    const index = Number(e.detail.value)
    const today = this.data.today
    let startDate = this.data.startDate

    if (index === 0) startDate = addDays(today, 1)
    else if (index === 1) startDate = today
    else startDate = startDate < today ? startDate : addDays(today, -1)

    this.applyStart(index, startDate)
  },

  onPastDateChange(e) {
    this.applyStart(2, e.detail.value)
  },

  applyStart(index, startDate) {
    const patch = {
      startIndex: index,
      startText: START_OPTIONS[index],
      startDate,
      startDesc: this.startDescFor(startDate)
    }

    if (PRESET_YEARS[this.data.deadlineIndex]) {
      const deadline = addYears(startDate, PRESET_YEARS[this.data.deadlineIndex])
      patch.deadline = deadline
      patch.deadlineText = this.deadlineTextFor(this.data.deadlineIndex, deadline)
    }
    patch.dailyHint = this.dailyHintFor(
      this.data.target, this.data.existingTotal, startDate,
      patch.deadline !== undefined ? patch.deadline : this.data.deadline,
      this.data.unit
    )
    this.setData(patch)
  },

  onDeadlineChange(e) {
    const index = Number(e.detail.value)
    let deadline = ''

    if (PRESET_YEARS[index]) {
      deadline = addYears(this.data.startDate, PRESET_YEARS[index])
    } else if (index === 4) {
      deadline = this.data.deadline || addYears(this.data.startDate, 1)
    }

    this.setData({
      deadlineIndex: index,
      deadline,
      deadlineText: this.deadlineTextFor(index, deadline),
      showDeadlinePicker: index === 4,
      dailyHint: this.dailyHintFor(
        this.data.target, this.data.existingTotal, this.data.startDate, deadline, this.data.unit
      )
    })
  },

  onDeadlineDateChange(e) {
    const deadline = e.detail.value
    this.setData({
      deadline,
      deadlineText: this.deadlineTextFor(4, deadline),
      dailyHint: this.dailyHintFor(
        this.data.target, this.data.existingTotal, this.data.startDate, deadline, this.data.unit
      )
    })
  },

  // —— 提交 ——

  onSubmit() {
    const targetRaw = String(this.data.target).trim()
    if (!/^\d+$/.test(targetRaw) || Number(targetRaw) <= 0) {
      wx.showToast({ title: '目标需为大于 0 的整数', icon: 'none' })
      return
    }

    const name = String(this.data.name).trim()
    if (!name) {
      wx.showToast({ title: '请填写大愿名称', icon: 'none' })
      return
    }

    const existingRaw = String(this.data.existingTotal).trim() || '0'
    if (!/^\d+$/.test(existingRaw)) {
      wx.showToast({ title: '已有累计需为整数', icon: 'none' })
      return
    }

    const deadline = this.data.deadline || null
    if (deadline && diffDays(this.data.startDate, deadline) < 0) {
      wx.showToast({ title: '期限不能早于开始日期', icon: 'none' })
      return
    }

    const targetTotal = Number(targetRaw)
    const existingTotal = Number(existingRaw)

    if (this.data.isEdit) {
      store.updateVow(this.data.editId, {
        name,
        targetTotal,
        deadline,
        existingTotal
      })
      wx.showToast({ title: '已保存' })
      wx.navigateBack()
      return
    }

    const practice = this.data.practices[this.data.practiceIndex]
    if (!practice) {
      wx.showToast({ title: '请选择功课', icon: 'none' })
      return
    }

    store.createVow({
      practiceId: practice.id,
      name,
      targetTotal,
      startDate: this.data.startDate,
      deadline,
      existingTotal
    })
    wx.showToast({ title: '已发愿' })
    wx.navigateBack()
  },

  goPracticeAdd() {
    wx.navigateTo({ url: '/pages/practice-add/practice-add' })
  }
})
