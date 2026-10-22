const { createStore } = require('./services/store')

App({
  onLaunch() {
    this.globalData.store = createStore()
  },

  globalData: {
    store: null
  }
})
