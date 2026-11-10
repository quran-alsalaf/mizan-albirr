// يربط المحاكاة بالرسم ولمسات المستخدم، ولا يعمل إلا حين يتحرك شيء توفيراً للبطارية.
import { actions, getState, subscribe } from '../store.js'
import { haptic, sfx, unlockAudio } from '../lib/sound.js'
import { createPhysics } from './physics.js'
import { createPainter } from './painter.js'
import { ARM, CENTER, PEOPLE, SPACING, clamp, dropFor, panCenter, radiusOf, tiltOf } from './model.js'

const WORLD_WIDTH = 10
const ROOM_ABOVE_BEAM = 2.1
const ROOM_BELOW_PAN = 2.2

export function createEngine(canvas) {
  const view = {
    w: 390, h: 800, ppu: 39, rows: 20, top: 6, bottomRows: 3,
    x: 0, vx: 0, y: 0, scroll: 0, coast: 0, limit: 0, gripping: false, sliding: null, grab: null,
  }

  const physics = createPhysics({
    minDrop: 8.6,
    onKnock: (strength, side) => sfx.knock(strength, side),
  })
  const painter = createPainter(canvas, view, physics)

  let minDrop = 8.6
  let raf = 0
  let lastFrame = 0
  let awakeUntil = 0
  let epoch = -1
  let rowIndex = new Map()
  let unsubscribe = null
  let theme = null
  const placed = new Map() // id → الوزن المبني به الحجر حالياً

  const rowsOf = (who) => getState().rows[who]

  const toWorld = (sx, sy) => ({
    x: view.x + (sx - view.w / 2) / view.ppu,
    y: view.y + (view.h / 2 - sy) / view.ppu,
  })

  function wake(ms = 600) {
    const now = performance.now()
    awakeUntil = Math.max(awakeUntil, now + ms)
    if (!raf) {
      lastFrame = now
      raf = requestAnimationFrame(frame)
    }
  }

  function frame(now) {
    raf = 0
    const dt = clamp((now - lastFrame) / 1000, 1 / 240, 1 / 30)

    const { who, picked } = getState()

    if (view.sliding === null) {
      view.vx += (-140 * (view.x - CENTER[who]) - 23 * view.vx) * dt
      view.x += view.vx * dt
    } else {
      view.x = view.sliding
      view.vx = 0
    }

    const beam = physics.beams[who]
    const lowest = Math.min(beam.pan.g, beam.pan.r) - ROOM_BELOW_PAN
    view.limit = Math.max(0, view.top - view.rows + view.bottomRows - lowest)
    if (!view.gripping) {
      view.scroll += view.coast * dt
      view.coast *= Math.exp(-4.5 * dt)
      const bounded = clamp(view.scroll, 0, view.limit)
      if (bounded !== view.scroll) {
        view.scroll += (bounded - view.scroll) * Math.min(1, dt * 14)
        view.coast = 0
      }
    }
    view.y = view.top - view.rows / 2 - view.scroll

    const moving = physics.step(dt, rowsOf, who, view.grab, view.y + view.rows / 2)
      || view.sliding !== null
      || view.gripping
      || Math.abs(view.vx) > 0.01
      || Math.abs(view.x - CENTER[who]) > 0.004
      || Math.abs(view.coast) > 0.02
      || view.scroll < -0.001
      || view.scroll > view.limit + 0.001
    if (moving) wake(350)

    painter.draw(rowIndex, picked)
    lastFrame = now

    if (performance.now() < awakeUntil && !raf) raf = requestAnimationFrame(frame)
  }

  function worldStart(who, row, indexOnSide) {
    if (row.x !== undefined) return { x: row.x, y: row.y }
    const panY = -dropFor(rowsOf(who), minDrop) + (row.side === 'g' ? -1 : 1) * ARM * Math.sin(tiltOf(rowsOf(who)))
    return {
      x: panCenter(who, row.side) + (row.pos ? row.pos.x : indexOnSide % 2 ? 0.9 : -0.9),
      y: panY + (row.pos ? row.pos.y + 0.03 : 1.3 + indexOnSide * 1.9),
    }
  }

  function place(who, row, indexOnSide = 0) {
    const { x, y } = worldStart(who, row, indexOnSide)
    placed.set(row.id, row.weight)
    physics.addStone(row.id, {
      who, side: row.side, radius: radiusOf(row.weight), weight: row.weight, x, y, landed: row.landed,
    }, () => {
      actions.landed(who, row.id)
      sfx.land(row.weight, row.side)
      physics.nudge(who, (row.side === 'g' ? 1 : -1) * 0.12 * Math.cbrt(row.weight / 100))
    })
  }

  function rebuild() {
    physics.clear()
    placed.clear()
    painter.forget()
    for (const who of PEOPLE) {
      const rows = rowsOf(who)
      physics.placeBeam(who, dropFor(rows, minDrop), tiltOf(rows))
      const counters = { g: 0, r: 0 }
      for (const row of rows) place(who, row, counters[row.side]++)
    }
  }

  function sync() {
    const state = getState()
    if (state.phase !== 'app') return
    if (state.theme !== theme) {
      theme = state.theme
      painter.setTheme(theme)
    }
    if (state.epoch !== epoch) {
      epoch = state.epoch
      rebuild()
    } else {
      const alive = new Set()
      for (const who of PEOPLE) {
        for (const row of state.rows[who]) {
          alive.add(row.id)
          if (!placed.has(row.id)) {
            place(who, row)
          } else if (placed.get(row.id) !== row.weight) {
            physics.removeStone(row.id)
            place(who, row)
          }
        }
      }
      for (const id of [...placed.keys()]) {
        if (!alive.has(id)) {
          physics.removeStone(id)
          placed.delete(id)
          painter.forgetStone(id)
        }
      }
    }
    rowIndex = new Map(PEOPLE.flatMap((who) => state.rows[who].map((row) => [row.id, row])))
    wake(1500)
  }

  function resize(width, height, topPx, bottomPx) {
    view.w = width
    view.h = height
    view.ppu = width / WORLD_WIDTH
    view.rows = height / view.ppu
    view.top = topPx / view.ppu + ROOM_ABOVE_BEAM
    view.bottomRows = bottomPx / view.ppu
    minDrop = clamp(view.rows - view.top - view.bottomRows - ROOM_BELOW_PAN, 6, 9.4)
    physics.setMinDrop(minDrop)
    painter.resize()
    // أول قياس: الآن نعرف ارتفاع الشاشة، فنبني المشهد مرة واحدة بأبعاده الصحيحة.
    if (!unsubscribe) {
      unsubscribe = subscribe(sync)
      sync()
    }
    wake(800)
  }

  // ─── اللمس ───────────────────────────────────────────────
  let press = null

  const local = (e) => {
    const box = canvas.getBoundingClientRect()
    return { sx: e.clientX - box.left, sy: e.clientY - box.top }
  }

  function switchTo(who) {
    if (who === getState().who) return
    sfx.slide()
    haptic(8)
    view.scroll = 0
    view.coast = 0
    actions.face(who)
  }

  const onDown = (e) => {
    unlockAudio()
    wake()
    if (press) return
    const { sx, sy } = local(e)
    const at = toWorld(sx, sy)
    const stone = physics.stoneAt(getState().who, at.x, at.y)
    press = {
      id: e.pointerId, ox: sx, oy: sy, lastX: sx, stone,
      mode: stone ? 'press-stone' : 'press-felt', anchor: 0, velocity: 0, at: performance.now(),
    }
    try { canvas.setPointerCapture(e.pointerId) } catch { /* انتهى المؤشر */ }
  }

  const onMove = (e) => {
    if (!press || press.id !== e.pointerId) return
    wake()
    const { sx, sy } = local(e)
    const dx = sx - press.ox
    const dy = sy - press.oy

    if (press.mode.startsWith('press') && Math.hypot(dx, dy) > 8) {
      if (press.mode === 'press-stone') {
        press.mode = 'carry'
      } else if (Math.abs(dx) > Math.abs(dy)) {
        press.mode = 'slide'
        press.anchor = view.x + dx / view.ppu
      } else {
        press.mode = 'scroll'
        view.gripping = true
        press.anchor = view.scroll + dy / view.ppu
      }
    }

    const now = performance.now()
    const dt = Math.max(1, now - press.at) / 1000
    if (press.mode === 'carry') {
      view.grab = { id: press.stone, ...toWorld(sx, sy) }
    } else if (press.mode === 'slide') {
      let x = press.anchor - dx / view.ppu
      if (x > 0) x *= 0.3
      if (x < -SPACING) x = -SPACING + (x + SPACING) * 0.3
      press.velocity = press.velocity * 0.5 + ((sx - press.lastX) / dt) * 0.5
      view.sliding = x
    } else if (press.mode === 'scroll') {
      let scroll = press.anchor - dy / view.ppu
      if (scroll < 0) scroll *= 0.35
      if (scroll > view.limit) scroll = view.limit + (scroll - view.limit) * 0.35
      press.velocity = press.velocity * 0.6 + ((scroll - view.scroll) / dt) * 0.4
      view.scroll = scroll
    }
    press.at = now
    press.lastX = sx
  }

  const onUp = (e) => {
    if (!press || press.id !== e.pointerId) return
    const p = press
    press = null
    wake()
    const flicked = performance.now() - p.at < 120
    if (p.mode === 'press-stone') {
      sfx.press()
      actions.pick(getState().picked === p.stone ? null : p.stone)
    } else if (p.mode === 'carry') {
      view.grab = null
    } else if (p.mode === 'scroll') {
      view.gripping = false
      view.coast = flicked ? p.velocity : 0
    } else if (p.mode === 'slide') {
      const x = view.sliding
      view.sliding = null
      const v = flicked ? p.velocity : 0
      const off = x - CENTER[getState().who]
      if (v > 300 || off < -1.5) switchTo('um')
      else if (v < -300 || off > 1.5) switchTo('ab')
    } else if (getState().picked) {
      actions.pick(null)
    }
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)

  // حفظ مواضع الأحجار بعد أن تهدأ، أو عند مغادرة التطبيق.
  const saved = {}
  function savePositions(force) {
    if (!force && (!physics.isSettled() || view.grab)) return
    for (const who of PEOPLE) {
      const list = physics.snapshot(who)
      const json = JSON.stringify(list)
      if (json !== saved[who]) {
        saved[who] = json
        actions.keepPositions(who, list)
      }
    }
  }
  const saveTimer = setInterval(savePositions, 3000)
  const saveNow = () => savePositions(true)
  const saveIfHidden = () => { if (document.visibilityState === 'hidden') savePositions(true) }
  document.addEventListener('visibilitychange', saveIfHidden)
  window.addEventListener('pagehide', saveNow)

  return {
    resize,
    wake,
    redraw() { painter.forget(); wake(100) },
    position: (id) => physics.positionOf(id),
    pileTop: (who, side) => physics.pileTop(who, side),
    viewTop: () => view.y + view.rows / 2,
    switchTo,
    destroy() {
      cancelAnimationFrame(raf)
      clearInterval(saveTimer)
      unsubscribe?.()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      document.removeEventListener('visibilitychange', saveIfHidden)
      window.removeEventListener('pagehide', saveNow)
      physics.clear()
    },
  }
}
