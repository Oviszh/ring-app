'use strict'

// 生成水墨风图标 PNG（纯 Node，无依赖）：tabBar 三枚 ×2 态 + 功课莲花
// 用法：node scripts/gen-icons.js
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUT = path.join(__dirname, '..', 'miniprogram', 'assets', 'icons')
const SIZE = 81

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(pixels) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0
    pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// 简单画布：RGBA 像素缓冲 + 基础图元
function canvas() {
  const px = Buffer.alloc(SIZE * SIZE * 4)
  return {
    px,
    set(x, y, r, g, b, a) {
      x = Math.round(x); y = Math.round(y)
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
      const i = (y * SIZE + x) * 4
      const na = a / 255
      px[i] = Math.round(r * na + px[i] * (1 - na))
      px[i + 1] = Math.round(g * na + px[i + 1] * (1 - na))
      px[i + 2] = Math.round(b * na + px[i + 2] * (1 - na))
      px[i + 3] = Math.round(a + px[i + 3] * (1 - na))
    },
    // 椭圆（可旋转），fill 或描边
    ellipse(cx, cy, rx, ry, rot, color, strokeWidth) {
      const cos = Math.cos(rot), sin = Math.sin(rot)
      const ext = Math.max(rx, ry) + 2
      for (let y = Math.floor(cy - ext); y <= cy + ext; y++) {
        for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
          const dx = x - cx, dy = y - cy
          const u = dx * cos + dy * sin
          const v = -dx * sin + dy * cos
          const d = (u * u) / (rx * rx) + (v * v) / (ry * ry)
          if (strokeWidth) {
            const inner = ((rx - strokeWidth) ** 2 > 0 && (ry - strokeWidth) ** 2 > 0)
              ? (u * u) / ((rx - strokeWidth) ** 2) + (v * v) / ((ry - strokeWidth) ** 2)
              : 99
            if (d <= 1 && inner >= 1) this.set(x, y, ...color)
          } else if (d <= 1) {
            this.set(x, y, ...color)
          }
        }
      }
    },
    line(x0, y0, x1, y1, w, color) {
      const len = Math.hypot(x1 - x0, y1 - y0)
      for (let t = 0; t <= 1; t += 0.5 / len) {
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t
        for (let oy = -w / 2; oy <= w / 2; oy++) {
          for (let ox = -w / 2; ox <= w / 2; ox++) this.set(x + ox, y + oy, ...color)
        }
      }
    },
    dot(cx, cy, r, color) {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.set(x, y, ...color)
        }
      }
    },
    // 二次贝塞尔
    bezier(p0, p1, p2, w, color) {
      let prev = p0
      for (let t = 0.02; t <= 1; t += 0.02) {
        const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        this.line(prev[0], prev[1], x, y, w, color)
        prev = [x, y]
      }
    }
  }
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255]
}

const GOLD = hex('#A9853C')
const GRAY = hex('#A8A296')

// —— 莲花：中心瓣 + 两侧瓣 + 底弧 ——
function drawLotus(c, color) {
  c.ellipse(40.5, 34, 9, 18, 0, color)                 // 中瓣
  c.ellipse(27, 42, 8, 15, -0.5, color)                // 左瓣
  c.ellipse(54, 42, 8, 15, 0.5, color)                 // 右瓣
  c.bezier([18, 52], [40.5, 64], [63, 52], 3, color)   // 底弧
}

// —— 日历：圆角框 + 双挂环 + 点阵 ——
function drawCalendar(c, color) {
  const x0 = 17, x1 = 64, y0 = 22, y1 = 62
  c.line(x0, y0 + 6, x0, y1 - 6, 3, color)
  c.line(x1, y0 + 6, x1, y1 - 6, 3, color)
  c.line(x0 + 6, y0, x1 - 6, y0, 3, color)
  c.line(x0 + 6, y1, x1 - 6, y1, 3, color)
  for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) c.dot(cx, cy, 2, color)
  c.line(29, 15, 29, 25, 3, color)
  c.line(52, 15, 52, 25, 3, color)
  c.line(x0, 32, x1, 32, 2, color)
  for (const [dx, dy] of [[29, 43], [40.5, 43], [52, 43], [29, 54], [40.5, 54], [52, 54]]) {
    c.dot(dx, dy, 2.4, color)
  }
}

// —— 人像：头圆 + 肩弧 ——
function drawPerson(c, color) {
  c.ellipse(40.5, 29, 11, 11, 0, color, 3)
  c.bezier([20, 62], [40.5, 40], [61, 62], 3, color)
}

function save(name, draw, color) {
  const c = canvas()
  draw(c, color)
  fs.writeFileSync(path.join(OUT, name), encodePNG(c.px))
  console.log('生成', name)
}

fs.mkdirSync(OUT, { recursive: true })
save('tab-today.png', drawLotus, GRAY)
save('tab-today-active.png', drawLotus, GOLD)
save('tab-calendar.png', drawCalendar, GRAY)
save('tab-calendar-active.png', drawCalendar, GOLD)
save('tab-mine.png', drawPerson, GRAY)
save('tab-mine-active.png', drawPerson, GOLD)
save('lotus-gold.png', drawLotus, GOLD)
