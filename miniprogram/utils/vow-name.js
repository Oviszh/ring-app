'use strict'

// 兼容旧版自动生成的「功课名 · 愿名」，展示时只保留愿名。
function displayVowName(vow, practice) {
  const name = String(vow && vow.name || '').trim()
  if (practice) {
    for (const prefix of [practice.displayName, practice.name]) {
      if (prefix && name.startsWith(prefix + ' · ')) return name.slice(prefix.length + 3).trim() || '长期大愿'
    }
  }
  return name || '长期大愿'
}

module.exports = { displayVowName }
