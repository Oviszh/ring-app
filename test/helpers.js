'use strict'

// 测试辅助：固定时间构造（本地时区）
const t = (y, mo, d, h = 0, mi = 0) => new Date(y, mo, d, h, mi).getTime()

const D1_0800 = t(2026, 9, 21, 8, 0)    // 2026-10-21
const D1_2350 = t(2026, 9, 21, 23, 50)
const D2_0010 = t(2026, 9, 22, 0, 10)
const D2_0820 = t(2026, 9, 22, 8, 20)

module.exports = { t, D1_0800, D1_2350, D2_0010, D2_0820 }
