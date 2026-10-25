const { ledDigits } = require('../../utils/led')

Component({
  properties: {
    value: { type: String, value: '0' },
    minDigits: { type: Number, value: 6 },
    dimmed: { type: Boolean, value: false }
  },
  data: { digits: [], size: 'large', label: '0' },
  observers: {
    'value, minDigits'(value, minDigits) { this.setData(ledDigits(value, minDigits)) }
  },
  lifetimes: { attached() { this.setData(ledDigits(this.properties.value, this.properties.minDigits)) } }
})
