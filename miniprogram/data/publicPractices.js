'use strict'

// 公共功课库：模糊搜索（含别名命中）；无匹配时可自建
module.exports = [
  { name: '南无阿弥陀佛', alias: '六字圣号', type: 'count', unit: '声', dailyTarget: 108 },
  { name: '阿弥陀佛', alias: '四字圣号', type: 'count', unit: '声', dailyTarget: 108 },
  { name: '南无观世音菩萨', alias: '观音菩萨 观世音菩萨', type: 'count', unit: '声', dailyTarget: 108 },
  { name: '南无地藏王菩萨', alias: '地藏菩萨 地藏王', type: 'count', unit: '声', dailyTarget: 108 },
  { name: '六字大明咒', alias: '唵嘛呢叭咪吽 观音心咒', type: 'count', unit: '遍', dailyTarget: 108 },
  { name: '准提咒', alias: '准提神咒', type: 'count', unit: '遍', dailyTarget: 108 },
  { name: '大悲咒', alias: '千手千眼无碍大悲心陀罗尼', type: 'count', unit: '遍', dailyTarget: 7 },
  { name: '往生咒', alias: '拔一切业障根本得生净土陀罗尼', type: 'count', unit: '遍', dailyTarget: 21 },
  { name: '心经', alias: '般若波罗蜜多心经', type: 'count', unit: '遍', dailyTarget: 3 },
  { name: '金刚经', alias: '金刚般若波罗蜜经', type: 'count', unit: '遍', dailyTarget: 1 },
  { name: '阿弥陀经', alias: '佛说阿弥陀经', type: 'count', unit: '遍', dailyTarget: 1 },
  { name: '药师咒', alias: '药师灌顶真言', type: 'count', unit: '遍', dailyTarget: 108 },
  { name: '文殊菩萨心咒', alias: '文殊心咒 嗡阿喇巴札那谛', type: 'count', unit: '遍', dailyTarget: 108 },
  { name: '禅坐', alias: '打坐 静坐 冥想', type: 'time', unit: '分钟', dailyTarget: 30 }
]
