// رسم الميزان والأحجار على Canvas ثنائي الأبعاد.
import { ARM, CENTER, PAN_HALF, PEOPLE, SIDES, SIDE_NAME, panCenter } from './model.js'

const FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif'

const PALETTES = {
  dark: {
    brass: { light: '#EBCF94', base: '#C49A55', deep: '#8A6630', line: '#5F4520' },
    wood: { top: '#4A3322', side: '#2F2015', edge: 'rgba(235, 207, 148, .22)' },
    tick: 'rgba(243, 238, 223, .62)',
    ring: '#EBCF94',
    shadow: 'rgba(4, 18, 14, .42)',
    stone: {
      g: { light: '#FFFBF0', mid: '#EFE7D4', edge: '#C9BA9A', rim: 'rgba(70, 52, 22, .32)', ink: '#1C372D' },
      r: { light: '#D76A52', mid: '#BA4530', edge: '#8A2C1E', rim: 'rgba(40, 8, 2, .4)', ink: '#FFF4E8' },
    },
  },
  light: {
    brass: { light: '#D8B672', base: '#A8803F', deep: '#6F5224', line: '#4B3716' },
    wood: { top: '#6A4A30', side: '#4A3322', edge: 'rgba(255, 240, 210, .28)' },
    tick: 'rgba(27, 50, 41, .55)',
    ring: '#7F5F28',
    shadow: 'rgba(40, 50, 40, .28)',
    stone: {
      g: { light: '#46987B', mid: '#1F6B52', edge: '#134A39', rim: 'rgba(5, 30, 22, .35)', ink: '#F6FBF4' },
      r: { light: '#D46A52', mid: '#B8432F', edge: '#872B1D', rim: 'rgba(40, 8, 2, .35)', ink: '#FFF4E8' },
    },
  },
}

const MIN_TEXT = 11
const LINE_HEIGHT = 1.28
const MEASURE_AT = 100

function lineBreaks(words, maxLines) {
  const options = [[words.join(' ')]]
  if (maxLines < 2) return options
  for (let i = 1; i < words.length; i++) {
    options.push([words.slice(0, i).join(' '), words.slice(i).join(' ')])
    if (maxLines > 2) {
      for (let j = i + 1; j < words.length; j++) {
        options.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')])
      }
    }
  }
  return options
}

// أكبر مقياس يدخل به النص داخل الدائرة، بتجربة كل طرق تقسيم الأسطر.
function bestFit(ctx, words, maxLines, radius) {
  let best = { scale: 0, lines: [] }
  for (const lines of lineBreaks(words, maxLines)) {
    let scale = Infinity
    lines.forEach((line, i) => {
      const y = Math.abs(i - (lines.length - 1) / 2) * MEASURE_AT * LINE_HEIGHT + MEASURE_AT * 0.56
      scale = Math.min(scale, radius / Math.hypot(ctx.measureText(line).width / 2, y))
    })
    if (scale > best.scale) best = { scale, lines }
  }
  return best
}

function fitLabel(ctx, text, radiusPx) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean)
  const inner = radiusPx * 0.84
  const maxLines = radiusPx >= 44 ? 3 : radiusPx >= 20 ? 2 : 1
  ctx.font = `500 ${MEASURE_AT}px ${FONT}`

  for (let count = Math.min(words.length, 8); count >= 1; count--) {
    const taken = words.slice(0, count)
    if (count < words.length) taken[count - 1] += '…'
    const fit = bestFit(ctx, taken, maxLines, inner)
    if (fit.scale * MEASURE_AT >= MIN_TEXT) return fit
  }
  if (words.length) {
    const first = words[0]
    for (let n = Math.min(first.length - 1, 6); n >= 1; n--) {
      const fit = bestFit(ctx, [`${first.slice(0, n)}…`], 1, inner)
      if (fit.scale * MEASURE_AT >= MIN_TEXT * 0.9) return fit
    }
  }
  return null
}

const hashOf = (s) => {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

// حافة الحجر غير منتظمة قليلاً، كحصاة حقيقية.
function pebblePath(ctx, radius, seed) {
  const a = (seed % 628) / 100
  const b = (seed % 311) / 50
  ctx.beginPath()
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2
    const r = radius * (1 + 0.012 * Math.sin(3 * t + a) + 0.008 * Math.sin(5 * t + b))
    const x = Math.cos(t) * r
    const y = Math.sin(t) * r
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
}

function makeStone(row, radiusPx, dpr, palette) {
  const margin = 7
  const size = Math.ceil((radiusPx + margin) * 2 * dpr)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const look = palette.stone[row.side]
  const seed = Math.abs(hashOf(row.id))

  ctx.scale(dpr, dpr)
  ctx.translate(radiusPx + margin, radiusPx + margin)

  ctx.save()
  ctx.shadowColor = palette.shadow
  ctx.shadowBlur = 5
  ctx.shadowOffsetY = 2
  pebblePath(ctx, radiusPx, seed)
  ctx.fillStyle = look.mid
  ctx.fill()
  ctx.restore()

  const shade = ctx.createRadialGradient(-radiusPx * 0.34, -radiusPx * 0.4, radiusPx * 0.05, 0, 0, radiusPx * 1.08)
  shade.addColorStop(0, look.light)
  shade.addColorStop(0.52, look.mid)
  shade.addColorStop(1, look.edge)
  pebblePath(ctx, radiusPx, seed)
  ctx.fillStyle = shade
  ctx.fill()
  ctx.strokeStyle = look.rim
  ctx.lineWidth = 0.75
  ctx.stroke()

  const fit = fitLabel(ctx, row.text, radiusPx)
  if (fit) {
    const fontSize = Math.min(fit.scale * MEASURE_AT, radiusPx * 0.6, 21)
    const gap = fontSize * LINE_HEIGHT
    ctx.font = `500 ${fontSize}px ${FONT}`
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = look.ink
    fit.lines.forEach((line, i) => ctx.fillText(line, 0, (i - (fit.lines.length - 1) / 2) * gap))
  }
  return { canvas, margin }
}

export function createPainter(canvas, view, physics) {
  const ctx = canvas.getContext('2d')
  const cache = new Map()
  let dpr = 1
  let palette = PALETTES.dark

  function brass(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, palette.brass.light)
    g.addColorStop(0.5, palette.brass.base)
    g.addColorStop(1, palette.brass.deep)
    return g
  }

  function drawStand(who) {
    const beam = physics.beams[who]
    const cx = CENTER[who]
    const baseY = -(Math.min(beam.pan.g, beam.pan.r) - 1.55)

    ctx.fillStyle = brass(cx - 0.09, 0, cx + 0.09, 0)
    ctx.fillRect(cx - 0.075, 0, 0.15, baseY - 0.2)

    ctx.fillStyle = brass(cx - 0.3, 0, cx + 0.3, 0)
    for (const y of [0.72, baseY - 1.4]) {
      ctx.beginPath()
      ctx.ellipse(cx, y, 0.22, 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.roundRect(cx - 0.46, baseY - 0.42, 0.92, 0.26, 0.06)
    ctx.fill()

    ctx.fillStyle = palette.wood.top
    ctx.beginPath()
    ctx.roundRect(cx - 1.55, baseY - 0.18, 3.1, 0.24, 0.05)
    ctx.fill()
    ctx.fillStyle = palette.wood.side
    ctx.beginPath()
    ctx.roundRect(cx - 2.5, baseY + 0.04, 5, 0.34, 0.06)
    ctx.fill()
    ctx.fillStyle = palette.wood.edge
    ctx.fillRect(cx - 2.44, baseY + 0.05, 4.88, 0.022)
  }

  // لسان الميزان ومؤشره: يقف عمودياً عند اعتدال الكفّتين.
  function drawGauge(who) {
    const cx = CENTER[who]
    const radius = 1.62
    const step = (4 * Math.PI) / 180
    ctx.strokeStyle = palette.tick
    ctx.lineCap = 'round'
    for (let i = -4; i <= 4; i++) {
      const a = i * step
      const major = i === 0
      const inner = radius - (major ? 0.24 : i % 2 ? 0.09 : 0.15)
      ctx.lineWidth = major ? 0.045 : 0.026
      ctx.beginPath()
      ctx.moveTo(cx + Math.sin(a) * inner, -Math.cos(a) * inner)
      ctx.lineTo(cx + Math.sin(a) * radius, -Math.cos(a) * radius)
      ctx.stroke()
    }
    ctx.save()
    ctx.translate(cx, 0)
    ctx.rotate(physics.beams[who].angle)
    ctx.fillStyle = brass(-0.06, 0, 0.06, 0)
    ctx.beginPath()
    ctx.moveTo(-0.075, 0)
    ctx.lineTo(0, -1.42)
    ctx.lineTo(0.075, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function drawBeam(who) {
    const cx = CENTER[who]
    ctx.save()
    ctx.translate(cx, 0)
    ctx.rotate(physics.beams[who].angle)

    ctx.fillStyle = brass(0, -0.3, 0, 0.1)
    ctx.beginPath()
    ctx.moveTo(-ARM, 0.02)
    ctx.quadraticCurveTo(0, -0.5, ARM, 0.02)
    ctx.quadraticCurveTo(0, 0.1, -ARM, 0.02)
    ctx.closePath()
    ctx.fill()

    for (const s of [-1, 1]) {
      ctx.fillStyle = palette.brass.base
      ctx.beginPath()
      ctx.arc(s * ARM, 0.02, 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = palette.brass.line
      ctx.beginPath()
      ctx.arc(s * ARM, 0.02, 0.035, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = brass(-0.2, -0.2, 0.2, 0.2)
    ctx.beginPath()
    ctx.arc(0, -0.1, 0.21, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = palette.brass.line
    ctx.beginPath()
    ctx.arc(0, -0.1, 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawChain(x0, y0, x1, y1) {
    ctx.strokeStyle = palette.brass.base
    ctx.lineWidth = 0.05
    ctx.lineCap = 'round'
    ctx.setLineDash([0.002, 0.125])
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.setLineDash([])
  }

  function drawPan(who, side) {
    const beam = physics.beams[who]
    const tip = beam.tip[side]
    const cx = panCenter(who, side)
    const y = -beam.pan[side]
    const half = PAN_HALF

    drawChain(tip.x, -tip.y + 0.1, cx - half + 0.08, y)
    drawChain(tip.x, -tip.y + 0.1, cx + half - 0.08, y)

    ctx.fillStyle = brass(cx - half, y, cx + half, y + 0.7)
    ctx.beginPath()
    ctx.moveTo(cx - half, y + 0.02)
    ctx.quadraticCurveTo(cx, y + 1.5, cx + half, y + 0.02)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = palette.brass.light
    ctx.lineWidth = 0.07
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - half, y + 0.02)
    ctx.lineTo(cx + half, y + 0.02)
    ctx.stroke()

    ctx.save()
    ctx.translate(cx, y + 0.38)
    ctx.scale(1 / view.ppu, 1 / view.ppu)
    ctx.font = `600 13px ${FONT}`
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = palette.brass.line
    ctx.fillText(SIDE_NAME[side], 0, 0)
    ctx.restore()
  }

  function textureFor(id, row, radius) {
    const key = `${row.text}|${row.side}|${row.weight}|${view.ppu}|${dpr}`
    const hit = cache.get(id)
    if (hit && hit.key === key) return hit
    const made = { key, ...makeStone(row, radius * view.ppu, dpr, palette) }
    cache.set(id, made)
    return made
  }

  function drawStones(who, rows, picked) {
    for (const [id, stone] of physics.stones) {
      if (stone.who !== who) continue
      const row = rows.get(id)
      if (!row) continue
      const p = stone.body.getPosition()
      const { canvas: art, margin } = textureFor(id, row, stone.radius)
      const size = stone.radius * 2 + (margin * 2) / view.ppu
      ctx.drawImage(art, p.x - size / 2, -p.y - size / 2, size, size)
      if (id === picked) {
        ctx.strokeStyle = palette.ring
        ctx.lineWidth = 0.06
        ctx.beginPath()
        ctx.arc(p.x, -p.y, stone.radius + 0.1, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  return {
    resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      canvas.width = Math.round(view.w * dpr)
      canvas.height = Math.round(view.h * dpr)
    },
    setTheme(name) {
      palette = PALETTES[name]
      cache.clear()
    },
    forget() { cache.clear() },
    forgetStone(id) { cache.delete(id) },
    draw(rows, picked) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const k = view.ppu * dpr
      ctx.setTransform(k, 0, 0, k, (view.w / 2 - view.x * view.ppu) * dpr, (view.h / 2 + view.y * view.ppu) * dpr)

      const halfView = view.w / view.ppu / 2 + 5.4
      for (const who of PEOPLE) {
        if (Math.abs(CENTER[who] - view.x) > halfView) continue
        drawStand(who)
        drawGauge(who)
        for (const side of SIDES) drawPan(who, side)
        drawBeam(who)
        drawStones(who, rows, picked)
      }
    },
  }
}
