const { createStore } = require('./services/store')
App({
  onLaunch() { this.globalData.store = createStore() },
  onShow() {
    const store = this.globalData.store
    if (!store) return
    store.resume()
    clearInterval(this.ticker)
    this.ticker = setInterval(() => store.pulse(), 1000)
  },
  onHide() { clearInterval(this.ticker); if (this.globalData.store) this.globalData.store.pause() },
  globalData: { store: null }
})
