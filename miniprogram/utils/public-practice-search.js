'use strict'

// 只做检索归一化，不改写功课名称、咒文或用户记录。
const VARIANTS = {
  '無':'无', '彌':'弥', '觀':'观', '薩':'萨', '經':'经', '藥':'药', '師':'师', '釋':'释',
  '聖':'圣', '號':'号', '禮':'礼', '懺':'忏', '願':'愿', '歸':'归', '寶':'宝', '輪':'轮',
  '轉':'转', '滅':'灭', '災':'灾', '準':'准', '羅':'罗', '訶':'诃', '誦':'诵', '長':'长',
  '頭':'头', '動':'动', '運':'运', '壇':'坛', '淨':'净', '壽':'寿', '覺':'觉', '圓':'圆',
  '滿':'满', '蓮':'莲', '華':'华', '嚴':'严', '請':'请', '禱':'祷', '贊':'赞', '讚':'赞',
  '綠':'绿', '財':'财', '剛':'刚', '頂':'顶', '勝':'胜', '虛':'虚', '體':'体', '會':'会',
  '決':'决', '廣':'广', '說':'说', '盧':'卢', '聲':'声', '兩':'两', '眾':'众', '盡':'尽',
  '儀':'仪', '軌':'轨', '攝':'摄', '詰':'诘', '闍':'阇', '諸':'诸', '億':'亿', '實':'实',
  '門':'门', '葉':'叶', '啟':'启', '憶':'忆', '達':'达', '爾':'尔', '瑪':'玛', '龍':'龙',
  '獅':'狮', '貝':'贝', '鑒':'鉴', '鑑':'鉴', '發':'发', '諦':'谛', '勢':'势', '賢':'贤',
  '禪':'禅', '靜':'静', '維':'维', '遺':'遗', '窶':'窭'
}
function normalize(text) {
  return String(text || '').normalize('NFC').toLowerCase()
    .replace(/[\u4e00-\u9fff]/g, c => VARIANTS[c] || c)
    .replace(/归依/g, '皈依')
    .replace(/[\s\u0f0b-\u0f0e·•…，。！？、；：:,.!?;“”‘’「」『』《》〈〉（）()\[\]{}\-—_]/g, '')
}
function matchScore(practice, keyword) {
  const kw = normalize(keyword)
  if (!kw || practice.deprecated) return 99
  const name = normalize(practice.name)
  const aliases = (practice.aliases || []).map(normalize)
  if (name === kw) return 0
  if (name.startsWith(kw)) return 1
  if (aliases.includes(kw)) return 2
  if (name.includes(kw)) return 3
  if (aliases.some(a => a.includes(kw))) return 4
  if (normalize(practice.desc).includes(kw) || normalize(practice.tibetan).includes(kw)) return 5
  return 99
}
function searchPractices(library, keyword) {
  return library.map((practice, order) => ({ practice, order, score: matchScore(practice, keyword) }))
    .filter(row => row.score < 99)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map(row => row.practice)
}
module.exports = { normalize, matchScore, searchPractices }
