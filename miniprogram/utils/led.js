'use strict'

const SEGMENTS = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  '-': 'g'
}

function ledDigits(value, minDigits = 6) {
  const original = String(value == null ? '0' : value).replace(/,/g, '')
  const clean = /^[0-9:.-]+$/.test(original) ? original : '0'
  const numeric = /^\d+$/.test(clean)
  const text = numeric ? clean.padStart(Math.min(12, Math.max(0, minDigits)), '0') : clean
  const leading = numeric ? Math.max(0, text.length - clean.length) : 0
  return {
    size: text.length > 10 ? 'small' : text.length > 7 ? 'medium' : 'large',
    label: clean,
    digits: text.split('').map((char, index) => ({
      key: index,
      char,
      colon: char === ':',
      dot: char === '.',
      muted: index < leading,
      segments: 'abcdefg'.split('').map(segment => ({ segment, on: (SEGMENTS[char] || '').includes(segment) }))
    }))
  }
}

module.exports = { ledDigits }
