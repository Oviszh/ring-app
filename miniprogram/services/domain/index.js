'use strict'

// 页面只从这里拿业务入口；每个模块都是纯 JS（Node 可测，禁 wx.*）

module.exports = {
  ...require('./constants'),
  ...require('./time'),
  ...require('./state'),
  ...require('./practice'),
  ...require('./archive'),
  ...require('./counting'),
  ...require('./manualEntry'),
  ...require('./adjustment'),
  ...require('./vow'),
  ...require('./deviceSync'),
  ...require('./stats')
}
