// 日历 Tab（P1'）：主修功课 / 单功课两种口径 + 底部长期大愿
const { sourceText, fmtDayCN, fmtNum, fmtMinutes, fmtCompact } = require('../../utils/format')
const { displayVowName } = require('../../utils/vow-name')

const store = getApp().globalData.store

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const ALL = 'all'
const FIRST_MONTH = '1900-01'

function nameOf(practice) {
  return practice.displayName || practice.name
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

Page({
  data: {
    year: 0,
    month: 0,
    monthLabel: '',
    monthValue: '', monthStart: FIRST_MONTH, monthEnd: '', isTodaySelected: true,
    canNext: false, canPrev: true,
    weekdays: WEEKDAYS,

    viewOptions: [],
    viewIndex: 0,
    viewPid: ALL,
    viewAll: true,
    viewName: '主修功课',
    targetText: '',

    cells: [],
    selectedDate: '', dayLabel: '', dayGroups: [],
    statsText: '',

    vows: [],
    hasVows: false
  },

  onLoad() {
    const today = store.todayKey()
    const parts = today.split('-').map(Number)
    this.setData({ selectedDate: today, year: parts[0], month: parts[1] })
    // 只有可见时才重算：日历是 Tab 页，常驻内存；隐藏时不必跟着每次点按重算
    this.offStore = store.onChange(() => {
      if (this.visible) this.refresh()
    })
  },

  onShow() {
    const pid=getApp().globalData.calendarPid
    if(pid) {this.setData({viewPid:pid});delete getApp().globalData.calendarPid}
    this.visible = true
    // 返回补录等页面时，只刷新数据，保留选中的日期、月份及查看口径。
    this.refresh()
  },

  onHide() {
    this.visible = false
  },

  onUnload() {
    if (this.offStore) this.offStore()
    this.offStore = null
  },

  // —— view-model ——

  refresh() {
    const today = store.todayKey()
    const practices = store.allPractices()
    const options = [{ id: ALL, name: '主修功课' }].concat(
      practices.map(p => ({ id: p.id, name: nameOf(p) }))
    )

    // 功课被删后回落到「主修功课」
    let viewPid = this.data.viewPid || ALL
    if (viewPid !== ALL && !practices.some(p => p.id === viewPid)) viewPid = ALL
    let viewIndex = options.findIndex(o => o.id === viewPid)
    if (viewIndex < 0) viewIndex = 0
    const view = options[viewIndex]
    const viewAll = viewPid === ALL
    const practice = viewAll ? null : practices[viewIndex - 1]

    const year = this.data.year
    const month = this.data.month
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const monthEnd = `${year}-${pad2(month)}-${pad2(daysInMonth)}`

    // 本月状态一次算完：切月 / 切功课 / onShow / onChange 时各重算一次
    const cells = []
    for (let i = 0; i < firstWeekday; i++) cells.push({ key: 'blank' + i, blank: true })

    const elapsedTotals = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${pad2(month)}-${pad2(d)}`
      const future = date > today
      const cell = {
        key: date,
        date,
        blank: false,
        future,
        today: date === today,
        selected: date === this.data.selectedDate,
        warn: false,
        dayText: String(d),
        numText: '',
        dot: 'none'
      }

      if (viewAll) {
        if (!future) cell.dot = store.mainDayStatus(date)
      } else if (!future) {
        const t = store.dayTotals(date, viewPid)
        if (t) {
          elapsedTotals.push(t)
          const total = Math.round(t.total)
          cell.numText = total > 0 ? fmtCompact(total) : '·'
          cell.warn = total > 0 && (t.status === 'missed' || t.status === 'partial')
        }
      }

      cells.push(cell)
    }

    let targetText = ''
    let statsText = ''
    if (!viewAll && practice) {
      const todayTotal = store.dayTotals(today, practice.id)
      const target = todayTotal ? todayTotal.target : null
      if (target !== null && target !== undefined) {
        const unit = practice.type === 'time' ? '分钟' : (practice.unit || '声')
        targetText = `目标 ${fmtNum(target)}${unit}`
      }

      let met = 0
      let sum = 0
      for (const t of elapsedTotals) {
        sum += t.total
        if (t.status === 'met') met += 1
      }
      const days = elapsedTotals.length
      if (days > 0) {
        const isDuration = practice.type === 'time'
        const avg = sum / days
        statsText = `本月达标 ${met} 天 · ${isDuration ? '日均 ' + fmtMinutes(avg) : '日均 ' + fmtNum(avg) + ' ' + practice.unit}`
      } else {
        statsText = '这个月还没有记录'
      }
    }

    this.setData({
      viewOptions: options,
      viewIndex,
      viewPid,
      viewAll,
      viewName: view.name,
      targetText,
      canNext: monthEnd < today,
      canPrev: `${year}-${pad2(month)}` > FIRST_MONTH,
      monthLabel: `${year}年${month}月`,
      monthValue: `${year}-${pad2(month)}`,
      monthEnd: today.slice(0, 7),
      isTodaySelected: this.data.selectedDate === today,
      cells,
      statsText,
      ...this.dayView(practices),
      ...this.vowView(practices)
    })
  },

  dayView(practices) {
    const date = this.data.selectedDate || store.todayKey()
    const main = [], common = []
    for (const p of practices) {
      const t = store.dayTotals(date, p.id)
      if (!t) continue
      const hasRecords = t.total > 0 || t.ring !== 0 || t.phone !== 0 || t.manual !== 0 || t.times > 0 || store.entriesFor(date, p.id).length > 0
      if ((p.deleted || p.group === 'common') && !hasRecords) continue
      const row = {
        id: p.id, name: nameOf(p),
        amount: t.isDuration ? fmtMinutes(t.total) : fmtNum(t.total) + ' ' + p.unit,
        detail: t.isDuration ? `仅计时 · ${t.times}座` : sourceText(t),
        target: t.target > 0 ? '目标 ' + (t.isDuration ? fmtMinutes(t.target) : fmtNum(t.target) + ' ' + p.unit) : '不设每日目标',
        status: t.status === 'met' ? '已达标' : t.status === 'partial' ? '有进度' : t.target > 0 ? '未达标' : '',
        met: t.status === 'met'
      }
      ;(p.group === 'common' ? common : main).push(row)
    }
    return {
      selectedDate: date, dayLabel: fmtDayCN(date) + (date === store.todayKey() ? ' · 今天' : ''),
      dayGroups: [{ name: '主修功课', rows: main }, { name: '常用功课', rows: common }],
      canEntry: store.practices().length > 0 && date <= store.todayKey()
    }
  },

  onDayDetails() { wx.navigateTo({ url: '/pages/day-detail/day-detail?date=' + this.data.selectedDate }) },

  vowView(practices) {
    const byId = {}
    for (const p of practices) byId[p.id] = p

    const vows = store.vows().map(v => {
      const prog = store.vowProgress(v.id)
      const title = displayVowName(v, byId[v.practiceId])
      if (!prog) {
        return { id: v.id, title, totalText: '0', targetText: fmtNum(v.targetTotal), percent: 0, barStyle: 'width: 0%;', subText: '' }
      }
      const sub = prog.done
        ? '已圆满'
        : `日均 ${fmtNum(prog.avgPerDay)}${prog.eta ? ' · 预计 ' + prog.eta : ''}`
      return {
        id: v.id,
        title,
        totalText: fmtNum(prog.total),
        targetText: fmtNum(prog.target),
        percent: prog.percent,
        barStyle: `width: ${prog.percent}%;`,
        subText: sub
      }
    })

    return { vows, hasVows: vows.length > 0 }
  },

  // —— 交互 ——

  onMonthPick(e) {
    const value = e.detail.value
    const today = store.todayKey()
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < FIRST_MONTH || value > today.slice(0, 7)) return
    const [year, month] = value.split('-').map(Number)
    const day = Math.min(Number((this.data.selectedDate || today).slice(8)), new Date(year, month, 0).getDate())
    const date = `${value}-${pad2(day)}`
    this.setData({ year, month, selectedDate: date > today ? today : date }, () => this.refresh())
  },

  onToday() {
    const today = store.todayKey()
    const [year, month] = today.split('-').map(Number)
    this.setData({ year, month, selectedDate: today }, () => this.refresh())
  },

  onPrevMonth() {
    this.shiftMonth(-1)
  },

  onNextMonth() {
    this.shiftMonth(1)
  },

  shiftMonth(delta) {
    let year = this.data.year
    let month = this.data.month + delta
    if (month < 1) {
      month = 12
      year -= 1
    } else if (month > 12) {
      month = 1
      year += 1
    }
    const value = `${year}-${pad2(month)}`
    if (value < FIRST_MONTH || value > store.todayKey().slice(0, 7)) return
    const today = store.todayKey()
    const selectedDate = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`
    this.setData({ year, month, selectedDate: selectedDate > today ? today : selectedDate }, () => this.refresh())
  },

  onViewChange(e) {
    const option = this.data.viewOptions[Number(e.detail.value)]
    if (!option) return
    this.setData({ viewPid: option.id }, () => this.refresh())
  },

  onDayTap(e) {
    const date = e.currentTarget.dataset.date
    if (!date || date > store.todayKey()) return
    this.setData({ selectedDate: date }, () => this.refresh())
  },

  onVowTap(e) {
    wx.navigateTo({ url: `/pages/vow-detail/vow-detail?id=${e.currentTarget.dataset.id}` })
  },

  onVowNew() {
    wx.navigateTo({ url: '/pages/vow-new/vow-new' })
  }
})
