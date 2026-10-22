'use strict'

// 设备（戒指）领域操作：归最后绑定者、epoch 区分新旧归属、历史永不作废

function addDevice(state, input) {
  const device = {
    id: input.id,
    name: input.name || '念佛戒指',
    model: input.model || '',
    firmware: input.firmware || '',
    battery: input.battery === undefined ? null : input.battery,
    locked: false,
    practiceOrder: input.practiceOrder || [],
    screenMode: input.screenMode || 'press',
    lastSyncAt: input.lastSyncAt || null,
    isCurrent: false,
    ownerToken: input.ownerToken || null,
    epoch: input.epoch === undefined ? 1 : input.epoch
  }
  state.devices.push(device)
  if (!state.devices.some(d => d.isCurrent)) device.isCurrent = true
  return device
}

function currentDevice(state) {
  return state.devices.find(d => d.isCurrent) || null
}

function setCurrentDevice(state, deviceId) {
  const target = state.devices.find(d => d.id === deviceId)
  if (!target) throw new Error('NO_DEVICE')
  for (const d of state.devices) d.isCurrent = d.id === deviceId
}

function updateDevice(state, deviceId, patch) {
  const d = state.devices.find(x => x.id === deviceId)
  if (!d) throw new Error('NO_DEVICE')
  Object.assign(d, patch)
}

function removeDevice(state, deviceId) {
  const i = state.devices.findIndex(d => d.id === deviceId)
  if (i < 0) throw new Error('NO_DEVICE')
  state.devices.splice(i, 1)
  if (state.devices.length && !state.devices.some(d => d.isCurrent)) {
    state.devices[0].isCurrent = true
  }
}

module.exports = { addDevice, currentDevice, setCurrentDevice, updateDevice, removeDevice }
