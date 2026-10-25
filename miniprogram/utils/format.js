'use strict'

// 数字千分位：1234 -> "1,234"
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  n = Math.round(n)
  const neg = n < 0
  const grouped = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + grouped
}

// 日期显示："10月21日"
function fmtDayCN(dateKey) {
  if (!dateKey) return ''
  const parts = dateKey.split('-')
  return `${Number(parts[1])}月${Number(parts[2])}日`
}

// 分钟显示：90 -> "1小时30分钟"，25 -> "25分钟"
function fmtMinutes(min) {
  min = Math.round(min)
  if (min < 60) return `${min}分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}小时${m}分钟` : `${h}小时`
}

function fmtCompact(n) {
  if (n < 10000) return String(Math.round(n))
  if (n < 100000000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿'
}
function sourceText(t) {
  return [['设备计数', t.ring], ['触屏计数', t.phone], ['补录', t.manual]]
    .filter(pair => pair[1] !== 0 && pair[1] != null)
    .map(pair => pair[0] + ' ' + fmtNum(pair[1])).join(' · ')
}
module.exports = { sourceText, fmtNum, fmtDayCN, fmtMinutes, fmtCompact }
