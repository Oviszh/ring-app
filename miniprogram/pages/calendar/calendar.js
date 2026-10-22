// 日历 Tab（P1'）：月视图，全部功课 / 单功课两种口径 + 底部长期大愿
const { fmtNum, fmtMinutes } = require('../../utils/format')

const store = getApp().globalData.store

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const DOT_GLYPH = { met: '●', partial: '◐', missed: '○', none: '·' }
const ALL = 'all'

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
    canNext: false,
    weekdays: WEEKDAYS,

    viewOptions: [],
    viewIndex: 0,
    viewPid: ALL,
    viewAll: true,
    viewName: '全部功课',
    targetText: '',

    cells: [],
    statsText: '',

    vows: [],
    hasVows: false
  },

  onLoad() {
    const parts = store.todayKey().split('-').map(Number)
    this.setData({ year: parts[0], month: parts[1] })
    // 只有可见时才重算：日历是 Tab 页，常驻内存；隐藏时不必跟着每次点按重算
    this.offStore = store.onChange(() => {
      if (this.visible) this.refresh()
    })
  },

  onShow() {
    const pid=getApp().globalData.calendarPid
    if(pid) {this.setData({viewPid:pid});delete getApp().globalData.calendarPid}
    this.visible = true
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
    const options = [{ id: ALL, name: '全部功课' }].concat(
      practices.map(p => ({ id: p.id, name: nameOf(p) }))
    )

    // 功课被删后回落到「全部功课」
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
        warn: false,
        dayText: String(d),
        numText: String(d),
        dot: 'none',
        glyph: DOT_GLYPH.none
      }

      if (viewAll) {
        if (!future) {
          cell.dot = store.calendarDayStatus(date)
          cell.glyph = DOT_GLYPH[cell.dot] || DOT_GLYPH.none
        }
      } else if (!future) {
        const t = store.dayTotals(date, viewPid)
        if (t) {
          elapsedTotals.push(t)
          const total = Math.round(t.total)
          cell.numText = total > 0 ? fmtNum(total) : '·'
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
        statsText = `本月达标 ${met}/${days} · ${isDuration ? '日均 ' + fmtMinutes(avg) : '日均 ' + fmtNum(avg)}`
      } else {
        statsText = '本月达标 0/0 · 日均 0'
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
      monthLabel: `${year}年${month}月`,
      cells,
      statsText,
      ...this.vowView(practices)
    })
  },

  vowView(practices) {
    const byId = {}
    for (const p of practices) byId[p.id] = nameOf(p)

    const vows = store.vows().map(v => {
      const prog = store.vowProgress(v.id)
      const title = (byId[v.practiceId] || '功课') + (v.name ? ` · ${v.name}` : '')
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
    if (`${year}-${pad2(month)}` > store.todayKey().slice(0, 7)) return
    this.setData({ year, month }, () => this.refresh())
  },

  onViewChange(e) {
    const option = this.data.viewOptions[Number(e.detail.value)]
    if (!option) return
    this.setData({ viewPid: option.id }, () => this.refresh())
  },

  onDayTap(e) {
    const date = e.currentTarget.dataset.date
    if (!date || date > store.todayKey()) return
    let url = `/pages/day-detail/day-detail?date=${date}`
    if (!this.data.viewAll) url += `&pid=${this.data.viewPid}`
    wx.navigateTo({ url })
  },

  onVowTap(e) {
    wx.navigateTo({ url: `/pages/vow-detail/vow-detail?id=${e.currentTarget.dataset.id}` })
  },

  onVowNew() {
    wx.navigateTo({ url: '/pages/vow-new/vow-new' })
  }
})
