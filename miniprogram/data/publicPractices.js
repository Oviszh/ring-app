'use strict'

// 系统功课目录。稳定 id 不变；deprecated 仅用于兼容旧记录，不再重复展示。
// 简介以经题、文本起句或记录对象辨识，不宣称功效。来源与版本说明见 docs/系统功课目录校订.md。
module.exports = [
  {
    "id": "nanmo-amituofo",
    "name": "南无阿弥陀佛",
    "desc": "六字圣号",
    "aliases": [
      "六字洪名",
      "六字佛号",
      "南无阿弥陀佛六字"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "amituofo",
    "name": "阿弥陀佛",
    "desc": "四字圣号",
    "aliases": [
      "四字洪名",
      "四字佛号",
      "阿弥陀佛四字"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "amituojing",
    "name": "阿弥陀经",
    "desc": "《佛说阿弥陀经》",
    "aliases": [
      "佛说阿弥陀经",
      "小无量寿经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T12/T12n0366"
    ]
  },
  {
    "id": "wangsheng-zhou",
    "name": "往生咒",
    "desc": "南无阿弥多婆夜 哆他伽多夜……",
    "aliases": [
      "拔一切业障根本得生净土陀罗尼",
      "拔一切业障根本得生净土神咒",
      "阿弥陀佛根本秘密神咒",
      "往生净土神咒",
      "往生净土咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 21,
    "category": "mantra",
    "sources": [
      "cbeta:T12/T12n0368"
    ],
    "incipit": true,
    "legacyPublicIds": [
      "fo-shuofa-shenzhou"
    ]
  },
  {
    "id": "wuliangshou-jing",
    "name": "无量寿经",
    "desc": "《佛说无量寿经》 · 康僧铠译",
    "aliases": [
      "佛说无量寿经",
      "大经",
      "大本阿弥陀经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T12/T12n0360"
    ]
  },
  {
    "id": "guan-wuliangshou-jing",
    "name": "观无量寿经",
    "desc": "《佛说观无量寿佛经》 · 观经",
    "aliases": [
      "佛说观无量寿佛经",
      "观经",
      "十六观经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T12/T12n0365"
    ]
  },
  {
    "id": "nanmo-guanshiyin",
    "name": "南无观世音菩萨",
    "desc": "观音菩萨圣号",
    "aliases": [
      "观世音菩萨圣号",
      "南无观世音",
      "观音圣号",
      "南无大悲观世音菩萨"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "liuzi-daming-zhou",
    "name": "六字大明咒",
    "desc": "唵 嘛呢 叭咪 吽",
    "aliases": [
      "观音心咒",
      "嘛呢咒",
      "六字真言",
      "唵嘛呢叭咪吽",
      "大明咒",
      "摩尼咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ།"
  },
  {
    "id": "dabei-zhou",
    "name": "大悲咒",
    "desc": "南无喝啰怛那 哆啰夜耶……",
    "aliases": [
      "千手千眼观世音菩萨广大圆满无碍大悲心陀罗尼",
      "大悲心陀罗尼",
      "广大圆满无碍大悲心陀罗尼",
      "千手千眼大悲心陀罗尼"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 7,
    "category": "mantra",
    "sources": [
      "cbeta:T20/T20n1060"
    ],
    "incipit": true
  },
  {
    "id": "dabei-qing",
    "name": "大悲启请",
    "desc": "南无大悲观世音 愿我速知一切法……",
    "aliases": [
      "大悲咒启请",
      "启请文"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "xinjing",
    "name": "心经",
    "desc": "《般若波罗蜜多心经》",
    "aliases": [
      "般若波罗蜜多心经",
      "摩诃般若波罗蜜多心经",
      "般若心经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 3,
    "category": "sutra",
    "sources": [
      "cbeta:T08/T08n0251"
    ]
  },
  {
    "id": "jingang-jing",
    "name": "金刚经",
    "desc": "《金刚般若波罗蜜经》",
    "aliases": [
      "金刚般若波罗蜜经",
      "金刚般若经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T08/T08n0235"
    ]
  },
  {
    "id": "dizang-jing",
    "name": "地藏经",
    "desc": "《地藏菩萨本愿经》",
    "aliases": [
      "地藏菩萨本愿经",
      "地藏本愿经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T13/T13n0412"
    ]
  },
  {
    "id": "pumen-pin",
    "name": "普门品",
    "desc": "《妙法莲华经·观世音菩萨普门品》",
    "aliases": [
      "观世音菩萨普门品",
      "妙法莲华经观世音菩萨普门品",
      "观音经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T09/T09n0262"
    ]
  },
  {
    "id": "lengyan-zhou",
    "name": "楞严咒",
    "desc": "《大佛顶首楞严神咒》",
    "aliases": [
      "大佛顶首楞严神咒",
      "大佛顶如来密因修证了义诸菩萨万行首楞严咒",
      "首楞严咒",
      "佛顶咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "cbeta:T19/T19n0945"
    ]
  },
  {
    "id": "shixiao-zhou",
    "name": "十小咒",
    "desc": "如意宝轮王、消灾吉祥等十咒合诵",
    "aliases": [
      "十小咒合集",
      "早课十小咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "yaoshi-guanding-zhenyan",
    "name": "药师灌顶真言",
    "desc": "南谟薄伽伐帝 鞞杀社 窭噜薜琉璃……",
    "aliases": [
      "药师咒",
      "药师灌顶咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "gongde-baoshan-shenzhou",
    "name": "功德宝山神咒",
    "desc": "南无佛驮耶 南无达摩耶 南无僧伽耶 唵 悉帝护噜噜……",
    "aliases": [
      "功德宝山咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "fo-shuofa-shenzhou",
    "name": "佛说阿弥陀佛根本秘密神咒",
    "desc": "旧版重复条目，添加时统一使用往生咒",
    "aliases": [
      "阿弥陀佛根本秘密神咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "cbeta:T12/T12n0368"
    ],
    "deprecated": true,
    "replacedBy": "wangsheng-zhou"
  },
  {
    "id": "zhunti-zhou",
    "name": "准提咒",
    "desc": "南无飒哆喃 三藐三菩陀 俱胝喃……",
    "aliases": [
      "佛母准提神咒",
      "准提神咒",
      "准提陀罗尼",
      "佛母准提陀罗尼"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "baoyi-yeqi",
    "name": "宝箧印陀罗尼",
    "desc": "《一切如来心秘密全身舍利宝箧印陀罗尼》",
    "aliases": [
      "一切如来心秘密全身舍利宝箧印陀罗尼",
      "宝箧印咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "cbeta:T19/T19n1022A"
    ]
  },
  {
    "id": "lengyan-jing",
    "name": "楞严经",
    "desc": "《大佛顶如来密因修证了义诸菩萨万行首楞严经》",
    "aliases": [
      "大佛顶首楞严经",
      "首楞严经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T19/T19n0945"
    ]
  },
  {
    "id": "fahua-jing",
    "name": "法华经",
    "desc": "《妙法莲华经》",
    "aliases": [
      "妙法莲华经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T09/T09n0262"
    ]
  },
  {
    "id": "huayan-jing",
    "name": "华严经",
    "desc": "《大方广佛华严经》",
    "aliases": [
      "大方广佛华严经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T10/T10n0279"
    ]
  },
  {
    "id": "pusa-jiepin-shu",
    "name": "菩萨戒本",
    "desc": "《梵网经》菩萨戒本 · 十重四十八轻戒",
    "aliases": [
      "梵网经菩萨戒本",
      "戒本"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T24/T24n1484"
    ]
  },
  {
    "id": "nanmo-dizang",
    "name": "南无地藏王菩萨",
    "desc": "地藏菩萨圣号",
    "aliases": [
      "地藏菩萨圣号",
      "南无地藏菩萨",
      "大愿地藏王菩萨"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "dizang-miedingye",
    "name": "地藏菩萨灭定业真言",
    "desc": "唵 钵啰末邻陀宁 娑婆诃",
    "aliases": [
      "灭定业真言",
      "地藏灭定业真言"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "nanmo-yaoshifo",
    "name": "南无药师佛",
    "desc": "药师琉璃光如来圣号",
    "aliases": [
      "药师佛圣号",
      "南无药师琉璃光如来",
      "药师琉璃光如来圣号"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "nanmo-benxi",
    "name": "南无本师释迦牟尼佛",
    "desc": "释迦牟尼佛圣号",
    "aliases": [
      "本师释迦牟尼佛圣号",
      "南无释迦牟尼佛",
      "释迦牟尼佛圣号"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "jingang-saduo-baiziming",
    "name": "金刚萨埵百字明",
    "desc": "嗡 班匝萨埵萨玛雅 嘛呢巴拉雅……",
    "aliases": [
      "百字明",
      "百字明咒",
      "金刚萨垛百字明",
      "金刚萨埵百字咒",
      "百字真言",
      "Vajrasattva hundred syllable"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "vajrasattva"
    ],
    "tibetan": "ཨོཾ། བཛྲ་ས་ཏྭ་ས་མ་ཡ། མ་ནུ་པཱ་ལ་ཡ། …",
    "incipit": true
  },
  {
    "id": "lianshi-xinzhou",
    "name": "莲师心咒",
    "desc": "嗡 阿 吽 班匝 格热 班玛 悉地 吽",
    "aliases": [
      "莲花生大士心咒",
      "莲师咒",
      "咕噜仁波切心咒",
      "嗡阿吽班匝格热班玛色德吽",
      "莲花生心咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "barche"
    ],
    "tibetan": "ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ།"
  },
  {
    "id": "wenshu-xinzhou",
    "name": "文殊心咒",
    "desc": "嗡 阿惹帕查纳 谛",
    "aliases": [
      "文殊菩萨心咒",
      "文殊师利菩萨心咒",
      "嗡阿喇巴札那谛",
      "文殊咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཨོཾ་ཨ་ར་པ་ཙ་ན་དྷཱིཿ"
  },
  {
    "id": "lvdumu-xinzhou",
    "name": "绿度母心咒",
    "desc": "嗡 达咧 都达咧 都咧 梭哈",
    "aliases": [
      "度母心咒",
      "绿度母咒",
      "圣救度佛母心咒",
      "嗡达咧都达咧都咧娑哈"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་སྭཱ་ཧཱ།"
  },
  {
    "id": "yaoshi-xinzhou",
    "name": "药师佛心咒",
    "desc": "爹雅他 嗡 贝夏杰 贝夏杰 玛哈贝夏杰……",
    "aliases": [
      "药师咒藏传",
      "爹雅他嗡贝堪则贝堪则玛哈贝堪则"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཏ་དྱ་ཐཱ། ཨོཾ་བྷཻ་ཥ་ཛྱེ་བྷཻ་ཥ་ཛྱེ་མ་ཧཱ་བྷཻ་ཥ་ཛྱེ་…",
    "incipit": true
  },
  {
    "id": "huangcaishen-xinzhou",
    "name": "黄财神心咒",
    "desc": "黄财神短咒 · 藏巴拉／赞巴拉",
    "aliases": [
      "黄财神咒",
      "臧巴拉心咒",
      "赞巴拉心咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "jambhala"
    ],
    "tibetan": "ཨོཾ་ཛམ་བྷ་ལ་ཛ་ལེནྡྲ་ཡ་སྭཱ་ཧཱ།"
  },
  {
    "id": "bai-dugumu",
    "name": "白度母心咒",
    "desc": "嗡 达咧 都达咧 都咧 玛玛 阿优 布涅 嘉那 布真 咕噜 梭哈",
    "aliases": [
      "白度母咒",
      "长寿度母心咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "whiteTara"
    ],
    "tibetan": "ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་མཱ་མཱ་ཨཱ་ཡུར་པུཎྱེ་ཛྙཱ་ན་པུཥྚིཾ་ཀུ་རུ་སྭཱ་ཧཱ།"
  },
  {
    "id": "zunsheng-fomu",
    "name": "尊胜佛母心咒",
    "desc": "嗡 阿密打 阿悠达迭 娑哈",
    "aliases": [
      "尊胜佛母短咒",
      "尊胜佛母咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཨོཾ་ཨ་མྲྀ་ཏ་ཨཱ་ཡུརྡ་དེ་སྭཱ་ཧཱ།"
  },
  {
    "id": "guru-renpoche-qidao",
    "name": "上师祈请文",
    "desc": "祈请所依上师",
    "aliases": [
      "上师祈请",
      "祈请文",
      "上师瑜伽祈请文"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "refugeBodhicitta"
    ]
  },
  {
    "id": "karmapa-chenno",
    "name": "噶玛巴千诺",
    "desc": "噶玛巴千诺 · 噶玛巴鉴知",
    "aliases": [
      "葛玛巴千诺",
      "噶玛巴千诺祈请",
      "噶玛巴鉴知我"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "record"
    ]
  },
  {
    "id": "lianhua-shengshi-qidao",
    "name": "莲师祈请文",
    "desc": "莲花生大士祈请文",
    "aliases": [
      "莲师祈请",
      "莲花生大士祈请文"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "sevenLine",
      "barche"
    ]
  },
  {
    "id": "dabai-san",
    "name": "大礼拜",
    "desc": "大拜／磕大头／磕长头；部分群体称天意运动",
    "aliases": [
      "大拜",
      "磕大头",
      "磕长头",
      "叩大头",
      "叩长头",
      "天意运动",
      "长头礼拜"
    ],
    "unit": "拜",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "prostration",
      "userNaming"
    ]
  },
  {
    "id": "gong-manzha",
    "name": "供曼扎",
    "desc": "曼扎／曼达供养 · 按供养遍数记录",
    "aliases": [
      "供曼达",
      "曼扎供养",
      "献曼达",
      "曼荼罗供养",
      "供曼荼罗",
      "供曼茶罗",
      "供曼陀罗"
    ],
    "unit": "座",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "mandala"
    ]
  },
  {
    "id": "guiyi",
    "name": "皈依",
    "desc": "皈依文持诵",
    "aliases": [
      "皈依文",
      "皈依偈"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "refuge3",
      "refuge4",
      "refugeBodhicitta"
    ]
  },
  {
    "id": "fahualun",
    "name": "转经筒",
    "desc": "手转经轮 · 按转数记录",
    "aliases": [
      "转经",
      "转经轮",
      "经轮",
      "玛尼轮"
    ],
    "unit": "圈",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "prayerWheel",
      "record"
    ],
    "legacyNames": [
      "转法轮"
    ]
  },
  {
    "id": "chuanzhu-jingxing",
    "name": "经行",
    "desc": "步行经行／绕佛 · 按圈记录",
    "aliases": [
      "绕佛",
      "经行绕佛",
      "念佛经行"
    ],
    "unit": "圈",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "record"
    ]
  },
  {
    "id": "jingzuo",
    "name": "静坐",
    "desc": "静坐／打坐／坐香 · 按座计时，记录分钟",
    "aliases": [
      "打坐",
      "禅坐",
      "坐香",
      "静坐禅修",
      "冥想"
    ],
    "unit": "分钟",
    "type": "time",
    "dailyTarget": 30,
    "category": "practice",
    "sources": [
      "record"
    ]
  },
  {
    "id": "zazen-count",
    "name": "数息",
    "desc": "数息／数息观 · 按息记录",
    "aliases": [
      "数息观",
      "安般",
      "安那般那",
      "数呼吸"
    ],
    "unit": "息",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "record"
    ]
  },
  {
    "id": "chaojing",
    "name": "抄经",
    "desc": "书写经文 · 按页记录",
    "aliases": [
      "抄写经典",
      "写经",
      "书经"
    ],
    "unit": "页",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "record"
    ]
  },
  {
    "id": "fangsheng",
    "name": "放生",
    "desc": "放生活动记录 · 按所记物命数量记录",
    "aliases": [
      "放生仪轨",
      "放生物命"
    ],
    "unit": "只",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "record"
    ]
  },
  {
    "id": "shizhai",
    "name": "布施",
    "desc": "布施／供养 · 按次记录",
    "aliases": [
      "布施记录",
      "供养",
      "随喜"
    ],
    "unit": "次",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "record"
    ]
  },
  {
    "id": "huixiang",
    "name": "回向",
    "desc": "回向文持诵 · 按遍记录",
    "aliases": [
      "回向偈",
      "回向文"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "san-guiyi",
    "name": "三皈依",
    "desc": "皈依佛 皈依法 皈依僧",
    "aliases": [
      "三归依",
      "三皈依文",
      "三皈",
      "皈依三宝",
      "自皈依佛",
      "自归依佛"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "refuge3"
    ]
  },
  {
    "id": "si-guiyi",
    "name": "四皈依",
    "desc": "南无古鲁贝 南无布达雅 南无达尔嘛雅 南无僧嘎雅",
    "aliases": [
      "四归依",
      "四皈依文",
      "四皈依咒",
      "南无古鲁贝",
      "南无咕噜贝",
      "皈依上师佛法僧"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "refuge4"
    ]
  },
  {
    "id": "guiyi-faxin",
    "name": "皈依发心",
    "desc": "皈依与发菩提心合诵，按所持诵文本记录",
    "aliases": [
      "皈依发心偈",
      "皈依发心文",
      "皈依及发心"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "refugeBodhicitta"
    ]
  },
  {
    "id": "si-wuliangxin",
    "name": "四无量心",
    "desc": "慈、悲、喜、舍 · 四无量心偈",
    "aliases": [
      "四无量心偈",
      "四无量心颂",
      "慈悲喜舍"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "immeasurables"
    ]
  },
  {
    "id": "jingang-saduo-xinzhou",
    "name": "金刚萨埵心咒",
    "desc": "嗡 班匝 萨埵 吽",
    "aliases": [
      "金刚萨垛心咒",
      "金刚萨埵短咒",
      "金刚萨埵六字心咒",
      "嗡班匝萨埵吽"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "vajrasattvaShort"
    ],
    "tibetan": "ཨོཾ་བཛྲ་སཏྭ་ཧཱུྃ།"
  },
  {
    "id": "lianshi-qiju",
    "name": "莲师七句祈请文",
    "desc": "吽 邬金刹土西北隅……",
    "aliases": [
      "七句祈请文",
      "七句祈祷文",
      "莲师金刚七句祈请文",
      "莲师七句祈祷文",
      "七句偈"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "sevenLine"
    ],
    "incipit": true,
    "tibetan": "ཧཱུྃ༔ ཨོ་རྒྱན་ཡུལ་གྱི་ནུབ་བྱང་མཚམས༔ …"
  },
  {
    "id": "lianshi-chuzhang",
    "name": "莲师遣除道障祈请文",
    "desc": "Barché Lamsel · 祈请莲师遣除道障",
    "aliases": [
      "遣除道障祈请文",
      "莲师除障祈请文",
      "除障祈请文",
      "Barche Lamsel"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "barche"
    ]
  },
  {
    "id": "ershiyi-dumu-zan",
    "name": "二十一度母赞",
    "desc": "二十一礼赞颂 · 礼赞二十一度母",
    "aliases": [
      "二十一度母礼赞文",
      "二十一度母礼赞",
      "度母赞",
      "度母二十一赞"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "tara21"
    ],
    "tibetan": "ཕྱག་འཚལ་སྒྲོལ་མ་མྱུར་མ་དཔའ་མོ། …"
  },
  {
    "id": "shijiamouni-xinzhou",
    "name": "释迦牟尼佛心咒",
    "desc": "达雅他 嗡 牟尼 牟尼 玛哈牟那耶 梭哈",
    "aliases": [
      "本师心咒",
      "释迦牟尼心咒",
      "牟尼牟尼"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཏདྱ་ཐཱ། ཨོཾ་མུ་ནེ་མུ་ནེ་མ་ཧཱ་མུ་ན་ཡེ་སྭཱ་ཧཱ།"
  },
  {
    "id": "amituo-xinzhou",
    "name": "阿弥陀佛心咒",
    "desc": "嗡 阿弥爹瓦 啥",
    "aliases": [
      "阿弥陀佛短咒",
      "嗡阿弥得瓦舍"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཨོཾ་ཨ་མི་དྷེ་ཝ་ཧྲཱིཿ"
  },
  {
    "id": "wuliangshou-xinzhou",
    "name": "无量寿佛心咒",
    "desc": "嗡 阿玛惹尼 吉温滴耶 娑哈",
    "aliases": [
      "无量寿佛短咒",
      "长寿佛心咒",
      "阿弥达尤斯心咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "homage"
    ],
    "tibetan": "ཨོཾ་ཨ་མ་ར་ཎི་ཛཱི་ཝནྟི་ཡེ་སྭཱ་ཧཱ།"
  },
  {
    "id": "nanmo-wenshu",
    "name": "南无文殊师利菩萨",
    "desc": "文殊师利菩萨圣号",
    "aliases": [
      "文殊菩萨圣号",
      "南无文殊菩萨",
      "大智文殊师利菩萨"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "nanmo-puxian",
    "name": "南无普贤菩萨",
    "desc": "普贤菩萨圣号",
    "aliases": [
      "普贤菩萨圣号",
      "大行普贤菩萨"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "nanmo-dashizhi",
    "name": "南无大势至菩萨",
    "desc": "大势至菩萨圣号",
    "aliases": [
      "大势至菩萨圣号",
      "大势至菩萨"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "nanmo-mile",
    "name": "南无弥勒菩萨",
    "desc": "弥勒菩萨圣号",
    "aliases": [
      "弥勒菩萨圣号",
      "弥勒圣号"
    ],
    "unit": "声",
    "type": "count",
    "dailyTarget": 108,
    "category": "name",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "yaoshi-jing",
    "name": "药师经",
    "desc": "《药师琉璃光如来本愿功德经》",
    "aliases": [
      "药师琉璃光如来本愿功德经",
      "药师本愿经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T14/T14n0450"
    ]
  },
  {
    "id": "puxian-xingyuan-pin",
    "name": "普贤行愿品",
    "desc": "《华严经》普贤行愿品 · 十大行愿",
    "aliases": [
      "普贤菩萨行愿品",
      "华严经普贤行愿品"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T10/T10n0293"
    ]
  },
  {
    "id": "dashizhi-yuantong",
    "name": "大势至菩萨念佛圆通章",
    "desc": "《楞严经》所载 · 都摄六根，净念相继",
    "aliases": [
      "大势至念佛圆通章",
      "念佛圆通章",
      "圆通章"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T19/T19n0945"
    ]
  },
  {
    "id": "yijiao-jing",
    "name": "佛遗教经",
    "desc": "《佛垂般涅槃略说教诫经》",
    "aliases": [
      "遗教经",
      "佛垂般涅槃略说教诫经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T12/T12n0389"
    ]
  },
  {
    "id": "bada-renjue-jing",
    "name": "八大人觉经",
    "desc": "《佛说八大人觉经》",
    "aliases": [
      "佛说八大人觉经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T17/T17n0779"
    ]
  },
  {
    "id": "sishierzhang-jing",
    "name": "四十二章经",
    "desc": "《四十二章经》",
    "aliases": [
      "佛说四十二章经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T17/T17n0784"
    ]
  },
  {
    "id": "liuzu-tanjing",
    "name": "六祖坛经",
    "desc": "《六祖大师法宝坛经》",
    "aliases": [
      "六祖大师法宝坛经",
      "坛经",
      "法宝坛经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T48/T48n2008"
    ]
  },
  {
    "id": "yuanjue-jing",
    "name": "圆觉经",
    "desc": "《大方广圆觉修多罗了义经》",
    "aliases": [
      "大方广圆觉修多罗了义经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T17/T17n0842"
    ]
  },
  {
    "id": "weimojie-jing",
    "name": "维摩诘经",
    "desc": "《维摩诘所说经》",
    "aliases": [
      "维摩诘所说经",
      "维摩经",
      "不可思议解脱经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "cbeta:T14/T14n0475"
    ]
  },
  {
    "id": "wuliangshou-huiji",
    "name": "无量寿经（会集本）",
    "desc": "夏莲居会集《佛说大乘无量寿庄严清净平等觉经》",
    "aliases": [
      "夏莲居会集本",
      "大乘无量寿庄严清净平等觉经",
      "无量寿庄严清净平等觉经"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "sutra",
    "sources": [
      "huiji"
    ]
  },
  {
    "id": "ruyi-baolunwang",
    "name": "如意宝轮王陀罗尼",
    "desc": "南无佛驮耶 南无达摩耶 南无僧伽耶 南无观自在……",
    "aliases": [
      "如意宝轮王咒",
      "如意宝轮王神咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "xiaozai-jixiang",
    "name": "消灾吉祥神咒",
    "desc": "曩谟三满哆 母驮喃 阿钵啰底……",
    "aliases": [
      "消灾咒",
      "消灾吉祥咒",
      "炽盛光大威德消灾吉祥陀罗尼"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "sheng-wuliangshou-zhou",
    "name": "圣无量寿决定光明王咒",
    "desc": "唵 捺摩巴葛瓦帝 阿巴啰密沓……",
    "aliases": [
      "圣无量寿决定光明王陀罗尼",
      "无量寿决定光明王咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "guanyin-linggan",
    "name": "观音灵感真言",
    "desc": "唵 嘛呢叭咪吽 麻曷倪牙纳……",
    "aliases": [
      "观音灵感咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "qifo-miezui",
    "name": "七佛灭罪真言",
    "desc": "离婆离婆帝 求诃求诃帝……",
    "aliases": [
      "七佛灭罪咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "dajixiang-tiannv",
    "name": "大吉祥天女咒",
    "desc": "南无佛陀 南无达摩 南无僧伽 南无室利……",
    "aliases": [
      "大吉祥天女神咒",
      "吉祥天女咒",
      "善女天咒"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "handbook"
    ],
    "incipit": true
  },
  {
    "id": "zunsheng-tuoluoni",
    "name": "佛顶尊胜陀罗尼",
    "desc": "《佛顶尊胜陀罗尼经》所载长陀罗尼",
    "aliases": [
      "佛顶尊胜陀罗尼咒",
      "尊胜长咒",
      "尊胜陀罗尼"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "mantra",
    "sources": [
      "cbeta:T19/T19n0967"
    ]
  },
  {
    "id": "bashiba-fochan",
    "name": "八十八佛大忏悔文",
    "desc": "《礼佛大忏悔文》 · 礼念八十八佛名号",
    "aliases": [
      "八十八佛",
      "八十八佛忏悔文",
      "礼佛大忏悔文",
      "八十八佛大忏悔"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "handbook"
    ]
  },
  {
    "id": "sanshiwu-fochan",
    "name": "三十五佛忏",
    "desc": "《佛说三十五佛名礼忏文》",
    "aliases": [
      "三十五佛",
      "三十五佛忏悔文",
      "三十五佛名礼忏文"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "cbeta:T12/T12n0326"
    ]
  },
  {
    "id": "lianghuang-baochan",
    "name": "梁皇宝忏",
    "desc": "《慈悲道场忏法》",
    "aliases": [
      "梁皇忏",
      "慈悲道场忏法"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "prayer",
    "sources": [
      "cbeta:T45/T45n1909"
    ]
  },
  {
    "id": "shui-chan",
    "name": "慈悲三昧水忏",
    "desc": "《慈悲水忏法》",
    "aliases": [
      "水忏",
      "慈悲水忏",
      "慈悲水忏法"
    ],
    "unit": "部",
    "type": "count",
    "dailyTarget": 1,
    "category": "prayer",
    "sources": [
      "cbeta:T45/T45n1910"
    ]
  },
  {
    "id": "dabei-chan",
    "name": "大悲忏",
    "desc": "《千手眼大悲心咒行法》",
    "aliases": [
      "大悲忏法",
      "千手眼大悲心咒行法"
    ],
    "unit": "遍",
    "type": "count",
    "dailyTarget": 108,
    "category": "prayer",
    "sources": [
      "cbeta:T46/T46n1950"
    ]
  },
  {
    "id": "libai",
    "name": "礼佛",
    "desc": "拜佛／礼拜诸佛 · 按拜记录",
    "aliases": [
      "拜佛",
      "礼拜",
      "五体投地礼"
    ],
    "unit": "拜",
    "type": "count",
    "dailyTarget": 108,
    "category": "practice",
    "sources": [
      "handbook"
    ]
  }
]
