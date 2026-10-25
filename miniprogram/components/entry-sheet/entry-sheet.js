const store = getApp().globalData.store
const { fmtDayCN, fmtNum, fmtMinutes } = require('../../utils/format')

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    visible: { type: Boolean, value: false },
    practiceId: { type: String, value: '' },
    date: { type: String, value: '' }
  },
  data: { practices: [], index: 0, name: '', unit: '声', isTime: false, amount: '', selectedDate: '', today: '', dateText: '', error: '', busy: false, direction: 'add', currentTotal: 0, currentText: '0', afterText: '' },
  observers: {
    visible(value) {
      if (!value) { this.restoreTabBar(); return }
      const practices = store.practices().map(p => ({ id: p.id, name: p.displayName || p.name, unit: p.unit, isTime: p.type === 'time' }))
      if (!practices.length) { this.triggerEvent('close'); return }
      const index = Math.max(0, practices.findIndex(p => p.id === this.properties.practiceId))
      const selectedDate = this.properties.date || store.todayKey()
      this.setData({ practices, index, name: practices[index].name, unit: practices[index].unit, isTime: practices[index].isTime, selectedDate, today: store.todayKey(), dateText: fmtDayCN(selectedDate), amount: '', direction: 'add', error: '', busy: false })
      this.refreshReference()
      const pages = getCurrentPages()
      if (pages.length && ['pages/today/today', 'pages/calendar/calendar'].includes(pages[pages.length - 1].route)) {
        this._tabHidden = true
        wx.hideTabBar({ animation: false })
      }
    }
  },
  lifetimes: {
    attached() { this._off = store.onChange(() => { if (this.properties.visible) this.refreshReference() }) },
    detached() { this.restoreTabBar(); if (this._off) this._off() }
  },
  methods: {
    refreshReference() {
      const practice = this.data.practices[this.data.index]
      if (!practice) return
      const totals = store.dayTotals(this.data.selectedDate, practice.id)
      const total = totals ? totals.total : 0
      this.setData({ currentTotal: total, currentText: this.data.isTime ? fmtMinutes(total) : fmtNum(total) + ' ' + this.data.unit })
      this.refreshPreview()
    },
    refreshPreview() {
      const amount = Number(this.data.amount)
      const next = this.data.currentTotal + (this.data.direction === 'subtract' ? -amount : amount)
      this.setData({ afterText: this.data.amount && Number.isSafeInteger(amount) && amount > 0 && next >= 0 ? '补录后 ' + (this.data.isTime ? fmtMinutes(next) : fmtNum(next) + ' ' + this.data.unit) : '' })
    },
    restoreTabBar() { if (this._tabHidden) { this._tabHidden = false; wx.showTabBar({ animation: false }) } },
    close() { if (!this.data.busy) this.triggerEvent('close') },
    onDate(e) { this.setData({ selectedDate: e.detail.value, dateText: fmtDayCN(e.detail.value), error: '' }); this.refreshReference() },
    onPractice(e) {
      const index = Number(e.detail.value)
      const p = this.data.practices[index]
      if (p) { this.setData({ index, name: p.name, unit: p.unit, isTime: p.isTime, amount: '', error: '' }); this.refreshReference() }
    },
    onDirection(e) { this.setData({ direction: e.currentTarget.dataset.direction, error: '' }); this.refreshPreview() },
    onAmount(e) { this.setData({ amount: e.detail.value, error: '' }); this.refreshPreview() },
    save() { this.submit(false) },
    saveMore() { this.submit(true) },
    submit(more) {
      if (this.data.busy) return
      const amount = Number(this.data.amount)
      if (!Number.isSafeInteger(amount) || amount <= 0) { this.setData({ error: this.data.isTime ? '请填写本次静坐的分钟数，至少 1 分钟。' : '请填写本次补录数量，使用大于 0 的整数。' }); return }
      const p = this.data.practices[this.data.index]
      if (!p) return
      this.setData({ busy: true })
      try {
        store.addEntry({ date: this.data.selectedDate, practiceId: p.id, amount, direction: this.data.direction })
        this.triggerEvent('saved')
        wx.showToast({ title: '已记录', icon: 'success' })
        if (more) {
          const index = (this.data.index + 1) % this.data.practices.length
          const next = this.data.practices[index]
          this.setData({ index, name: next.name, unit: next.unit, isTime: next.isTime, amount: '', busy: false })
          this.refreshReference()
        } else {
          // 保持提交锁直到父页面关闭弹层，避免连续点按重复保存。
          this.triggerEvent('close')
        }
      } catch (e) {
        this.setData({ busy: false, error: e.message === 'NEGATIVE_RESULT' ? '减少后总数不能小于 0，请检查数量。' : e.message === 'FUTURE_DATE' ? '请选择今天或之前的日期。' : '暂时未能保存，请检查存储空间后重试。' })
      }
    },
    noop() {}
  }
})
