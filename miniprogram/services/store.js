'use strict'

// 页面唯一数据入口：封装 domain（注入当前时间、自动持久化、变更通知）
// 用法：const store = getApp().globalData.store

const domain = require('./domain/index')
const { loadState, saveState } = require('./storage/local')

function createStore(now) {
  now = now || Date.now()
  let state = loadState()
  if (!state || state.schemaVersion !== 1) state = domain.createInitialState(now)
  // 旧数据迁移：补齐后加字段
  if (!state.userToken) state.userToken = domain.genId('u', now)
  if (!state.settings) state.settings = {}
  if (state.settings.bleMock === undefined) state.settings.bleMock = false
  // 恢复上次前台心跳；意外退出期间不虚计禅坐时间。
  if (state.contexts.phone && state.foregroundTs) domain.pausePhone(state, state.foregroundTs)
  domain.settleUpTo(state, now) // 启动补归档
  saveState(state)

  let persisted = JSON.stringify(state)
  const listeners = []
  function commit() {
    try { saveState(state); persisted = JSON.stringify(state) }
    catch (error) {
      state = JSON.parse(persisted)
      if (wx.showModal) wx.showModal({ title: '未能保存', content: '本次操作未保存，请检查手机存储空间后重试。', showCancel: false })
      throw error
    }
    for (const fn of listeners.slice()) fn()
  }

  return {
    get state() { return state },
    now() { return Date.now() },
    elapsed(side) { const ctx = state.contexts[side]; return ctx ? domain.elapsedMs(ctx, Date.now()) : 0 },
    pause() { domain.pausePhone(state, Date.now()); commit() },
    resume() { domain.resumePhone(state, Date.now()); commit() },
    pulse() {
      const ts = Date.now()
      domain.settleUpTo(state, ts)
      const ctx = state.contexts.phone
      const reminder = domain.reminderRemaining(state, 'phone', ts)
      if (ctx && reminder && reminder.done && !ctx.reminderNotified) {
        const practice = this.getPractice(ctx.practiceId)
        const message = `本座已完成 ${ctx.roundCount} ${practice.unit || '声'}，可继续计数或结束本座专修。`
        const isTime = practice.type === 'time'
        // 目标达成只提醒一次；专修保留到用户明确结束，静坐也不会因此丢失结束入口。
        ctx.reminderNotified = true
        commit()
        if (wx.vibrateLong) wx.vibrateLong()
        wx.showModal({ title: '本座目标已达成', content: isTime ? '本次计时已达到设定时长，可继续静坐或结束本座。' : message, showCancel: false })
      }
      state.foregroundTs = ts
      if (ctx && ts - (this._lastCheckpoint || 0) >= 10000) { this._lastCheckpoint = ts; commit() }
    },
    lastReminder() { return state.settings.lastReminder || {} },
    saveReminder(value) { state.settings.lastReminder = value; commit() },
    allPractices() { return state.practices.slice().sort((a,b) => a.sort-b.sort) },
    getPracticeAny(id) { return state.practices.find(p => p.id === id) || null },
    backup() { return require('./domain/backup').exportBackup(state, Date.now()) },
    recoveryBackup() {
      const recovery = require('./storage/local').loadRecovery()
      if (!recovery) return null
      const previous = recovery.state || recovery
      return require('./domain/backup').exportBackup(previous, recovery.savedAt || previous.foregroundTs || Date.now())
    },
    inspectBackup(text) { return require('./domain/backup').importBackup(text) },
    restoreBackup(text) {
      const restored = this.inspectBackup(text)
      require('./storage/local').saveRecovery(state, Date.now())
      state = restored
      domain.settleUpTo(state, Date.now())
      commit()
    },

    onChange(fn) {
      listeners.push(fn)
      return function off() {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },

    todayKey() {
      // 页面刷新时也会触发翻篇：过零点后即使用户没做任何写操作，日期仍能切过来。
      // 幂等——未 commit 时下次启动会重放同样的结算，结果一致。
      const day = state.currentDay
      domain.settleUpTo(state, Date.now())
      if (day !== state.currentDay) { saveState(state); persisted = JSON.stringify(state) }
      return state.currentDay
    },

    // —— 计数 ——
    tap(side) {
      const r = domain.tap(state, side, Date.now())
      if (r.vibrate && state.settings.vibrate !== false && wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      commit()
      return r
    },
    undoTap(side) {
      const r = domain.undoTap(state, side, Date.now())
      commit()
      return r
    },
    context(side) { return state.contexts[side] },
    startRound(side, practiceId, reminder) {
      domain.startNewRound(state, side, practiceId, { ts: Date.now(), reminder: reminder || null })
      commit()
    },
    cancelReminder(side) {
      domain.cancelReminder(state, side)
      commit()
    },
    endRound(side) {
      domain.endRound(state, side, Date.now())
      commit()
    },
    reminderRemaining(side) {
      return domain.reminderRemaining(state, side, Date.now())
    },

    // —— 功课 ——
    practices() {
      return state.practices.filter(p => !p.deleted).sort((a, b) => a.sort - b.sort)
    },
    homePractices() {
      return this.practices().filter(p => p.showOnHome)
    },
    getPractice(id) {
      return state.practices.find(p => p.id === id && !p.deleted) || null
    },
    addPractice(input) {
      const p = domain.createPractice(state, input, Date.now())
      commit()
      return p
    },
    setDailyTarget(practiceId, target) {
      domain.setDailyTarget(state, practiceId, target, Date.now())
      commit()
    },
    setDisplayName(practiceId, name) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      p.displayName = name || ''
      commit()
    },
    setVibrateEvery(practiceId, n) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      p.vibrateEvery = n > 0 ? Math.floor(n) : 0
      commit()
    },
    setPracticeGroup(practiceId, group) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      if (!['main', 'common'].includes(group)) throw new Error('BAD_GROUP')
      p.group = group
      commit()
    },
    setShowOnHome(practiceId, show) {
      const p = domain.findPractice(state, practiceId)
      if (!p) throw new Error('NO_PRACTICE')
      p.showOnHome = !!show
      commit()
    },
    reorderPractices(orderedIds) {
      orderedIds.forEach((id, i) => {
        const p = state.practices.find(x => x.id === id)
        if (p) p.sort = i
      })
      commit()
    },
    removePractice(practiceId) {
      domain.removePractice(state, practiceId, Date.now())
      commit()
    },

    // —— 填报 ——
    addEntry(input) {
      const e = domain.addEntry(state, Object.assign({}, input, { ts: Date.now() }))
      commit()
      return e
    },
    setDayTotal(input) {
      const entry = domain.setDayTotal(state, Object.assign({}, input, { ts: Date.now() }))
      if (entry) commit()
      return entry
    },
    mainDayStatus(date) {
      return domain.calendarDayStatus(state, date, Date.now(), 'main')
    },
    undoEntry(entryId) {
      domain.settleUpTo(state, Date.now())
      domain.undoEntry(state, entryId, Date.now())
      commit()
    },
    entriesFor(date, practiceId) {
      return state.entries
        .filter(e => e.date === date && e.practiceId === practiceId && !e.tombstone)
        .sort((a, b) => a.createdAt - b.createdAt)
    },

    // —— 修正 ——
    sourceTotal(date, practiceId, source) {
      return domain.sourceTotal(state, date, practiceId, source)
    },
    addAdjustment(input) {
      const a = domain.addAdjustment(state, Object.assign({}, input, { ts: Date.now() }))
      commit()
      return a
    },
    undoAdjustment(adjustmentId) {
      domain.undoAdjustment(state, adjustmentId)
      commit()
    },
    adjustmentsFor(date, practiceId) {
      return state.adjustments
        .filter(a => a.date === date && a.practiceId === practiceId && !a.restored)
        .sort((a, b) => a.createdAt - b.createdAt)
    },

    // —— 大愿 ——
    vows() {
      return state.vows.slice()
    },
    createVow(input) {
      const v = domain.createVow(state, input, Date.now())
      commit()
      return v
    },
    updateVow(vowId, patch) {
      const current = state.vows.find(x => x.id === vowId)
      const v = current && Object.assign({}, current)
      if (!v) throw new Error('NO_VOW')
      if (patch.name !== undefined) v.name = patch.name
      if (patch.targetTotal !== undefined) {
        if (!Number.isSafeInteger(patch.targetTotal) || patch.targetTotal <= 0) throw new Error('TARGET_POSITIVE')
        v.targetTotal = patch.targetTotal
      }
      if (patch.deadline !== undefined) v.deadline = patch.deadline
      if (patch.existingTotal !== undefined) v.existingTotal = patch.existingTotal
      domain.validateVow(v)
      Object.assign(current, v)
      commit()
    },
    removeVow(vowId) {
      domain.removeVow(state, vowId)
      commit()
    },
    vowProgress(vowId) {
      this.todayKey()
      const v = state.vows.find(x => x.id === vowId)
      if (!v) return null
      return domain.vowProgress(state, v, Date.now())
    },

    // —— 设置 ——
    setSetting(key, value) {
      state.settings[key] = value
      commit()
    },

    // —— 查询 ——
    dayTotals(date, practiceId) {
      return domain.dayTotals(state, date, practiceId, Date.now())
    },
    calendarDayStatus(date) {
      return domain.calendarDayStatus(state, date, Date.now())
    },
    practiceTotalsAll(practiceId) {
      this.todayKey()
      return domain.practiceTotalsAll(state, practiceId, Date.now())
    },
    recentDayStatuses(practiceId, n) {
      // 最近 n 天（含今天，倒序）的日状态列表 [{date, status}]
      const out = []
      for (let i = n - 1; i >= 0; i--) {
        const date = domain.addDays(state.currentDay, -i)
        const t = domain.dayTotals(state, date, practiceId, Date.now())
        out.push({ date, status: t ? t.status : 'none' })
      }
      return out
    },

    // —— 设备（BLE；预览与正式配置禁用模拟设备） ——
    ringAdapter() { return require('./ble/index').getAdapter(state) },
    devices() { return state.devices.slice() },
    currentDevice() { return domain.currentDevice(state) },
    ringSetCurrent(deviceId) {
      const previous = domain.currentDevice(state)
      domain.setCurrentDevice(state, deviceId)
      if (previous && previous.id !== deviceId) state.contexts.ring = null
      commit()
    },

    async ringScan() {
      return this.ringAdapter().scan()
    },

    // 绑定流程：连接 → 校验归属 → （可选清空）→ 写入归属 → 对时 → 拉快照 → 建档
    // forceClear=false 且戒指已绑他人时抛 BOUND_BY_OTHER（由页面弹确认后重试 forceClear=true）
    async ringBind(deviceId, forceClear) {
      const ble = this.ringAdapter()
      const ts = Date.now()
      await ble.connect(deviceId)
      const dev = await ble.readDeviceState()
      if (dev.ownerToken && dev.ownerToken !== state.userToken) {
        if (!forceClear) {
          await ble.disconnect()
          const err = new Error('BOUND_BY_OTHER')
          err.boundByOther = true
          throw err
        }
        await ble.clearAllAndCreateEpoch(domain.genId('op', ts))
      }
      await ble.writeOwnerToken(state.userToken)
      await ble.syncTime()
      const { epoch, snapshots } = await ble.pullSnapshots()

      let device = state.devices.find(d => d.id === deviceId)
      if (!device) {
        device = domain.addDevice(state, {
          id: deviceId, name: dev.name, model: dev.model, firmware: dev.firmware,
          ownerToken: state.userToken, epoch, ts
        })
      }
      domain.updateDevice(state, deviceId, {
        name: dev.name, model: dev.model, firmware: dev.firmware,
        battery: dev.battery, locked: dev.locked, epoch, ownerToken: state.userToken, lastSyncAt: ts
      })
      domain.setCurrentDevice(state, deviceId)
      for (const s of snapshots) {
        domain.applyDeviceSnapshot(state, { deviceId, epoch, date: s.date, practiceId: s.practiceId, total: s.total, version: s.version })
      }
      if (dev.currentPracticeId) {
        state.contexts.ring = {
          side: 'ring', deviceId, practiceId: dev.currentPracticeId,
          startTs: dev.roundStartTs || ts, lastTs: ts,
          roundCount: dev.roundCount || 0, reminder: dev.reminder || null
        }
      } else state.contexts.ring = null
      commit()
      return device
    },

    // 同步：连接 → 对时 → 读状态 → 拉快照覆盖保存 → 更新设备信息
    async ringSync() {
      const device = domain.currentDevice(state)
      if (!device) return { ok: false, reason: 'NO_DEVICE' }
      const ble = this.ringAdapter()
      try {
        if (!ble.isConnected()) await ble.connect(device.id)
      } catch (e) {
        return { ok: false, reason: 'OFFLINE' }
      }
      const ts = Date.now()
      await ble.syncTime()
      const dev = await ble.readDeviceState()
      if (dev.ownerToken && dev.ownerToken !== state.userToken) {
        domain.updateDevice(state, device.id, { ownerMismatch: true })
        commit()
        return { ok: false, reason: 'OWNER_MISMATCH' }
      }
      domain.updateDevice(state, device.id, { ownerMismatch: false, battery: dev.battery, locked: dev.locked, epoch: dev.epoch, lastSyncAt: ts })
      const { epoch, snapshots } = await ble.pullSnapshots()
      for (const s of snapshots) {
        domain.applyDeviceSnapshot(state, { deviceId: device.id, epoch, date: s.date, practiceId: s.practiceId, total: s.total, version: s.version })
      }
      if (dev.currentPracticeId) {
        state.contexts.ring = {
          side: 'ring', deviceId: device.id, practiceId: dev.currentPracticeId,
          startTs: dev.roundStartTs || ts, lastTs: ts,
          roundCount: dev.roundCount || 0, reminder: dev.reminder || null
        }
      } else state.contexts.ring = null
      commit()
      return { ok: true }
    },

    // 戒指侧实时操作：戒指确认（ACK）后才落 domain——失败不改本地状态
    async ringStartRound(practiceId, reminder) {
      const device = domain.currentDevice(state)
      if (!device) throw new Error('NO_DEVICE')
      const ble = this.ringAdapter()
      if (!ble.isConnected()) await ble.connect(device.id)
      await ble.startNewRound({ practiceId, reminder: reminder || null, opId: domain.genId('op', Date.now()) })
      domain.startNewRound(state, 'ring', practiceId, { ts: Date.now(), reminder: reminder || null })
      state.contexts.ring.deviceId = device.id
      commit()
    },

    async ringCancelReminder() {
      const device = domain.currentDevice(state)
      if (!device) throw new Error('NO_DEVICE')
      const ble = this.ringAdapter()
      if (!ble.isConnected()) await ble.connect(device.id)
      await ble.cancelReminder({ opId: domain.genId('op', Date.now()) })
      domain.cancelReminder(state, 'ring')
      commit()
    },

    async ringSetLocked(locked) {
      const device = domain.currentDevice(state)
      if (!device) throw new Error('NO_DEVICE')
      const ble = this.ringAdapter()
      if (!ble.isConnected()) await ble.connect(device.id)
      const r = await ble.setLocked(locked)
      domain.updateDevice(state, device.id, { locked: r.locked })
      commit()
      return r.locked
    },

    // mock 调试：模拟戒指被点按（真实戒指的触摸计数），随后同步
    async ringSimulateTap(n) {
      const ble = this.ringAdapter()
      if (ble.kind !== 'mock') throw new Error('MOCK_ONLY')
      const r = ble.simulateTap(n)
      if (!r.ok) return r
      await this.ringSync()
      return r
    },

    ringUnbind(deviceId) {
      // 解绑只解除本机绑定；戒指内数据保留
      domain.removeDevice(state, deviceId)
      if (state.contexts.ring && (!state.contexts.ring.deviceId || state.contexts.ring.deviceId === deviceId)) state.contexts.ring = null
      commit()
    }
  }
}

module.exports = { createStore }
