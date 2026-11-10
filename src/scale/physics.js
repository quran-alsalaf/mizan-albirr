// محاكاة الكفّتين والأحجار على planck. لا تعرف شيئاً عن الرسم أو الواجهة.
import { Box, Circle, Vec2, World } from 'planck'
import {
  ARM, CENTER, COLUMN, PEOPLE, REACH, SIDES, SIDE_SIGN, PAN_HALF,
  clamp, dropFor, panCenter, tiltFor,
} from './model.js'

const FREEZE_DEPTH = 6 // الأحجار المدفونة أعمق من هذا تتوقف عن الحساب
const PAN_THICKNESS = 0.1

const vec = (x, y) => new Vec2(x, y)

export function createPhysics({ minDrop, onKnock }) {
  const world = new World({ gravity: vec(0, -26), allowSleep: true })
  const stones = new Map()
  const pans = {}
  const dirty = { ab: true, um: true }
  const restTime = { ab: 0, um: 0 }
  const contacts = []
  let frameNo = 0
  let lastGrab = null
  let moving = 0
  let baseDrop = minDrop

  const beams = Object.fromEntries(PEOPLE.map((who) => [who, {
    angle: 0, omega: 0, drop: minDrop, hold: 0,
    tip: { g: { x: CENTER[who] + ARM, y: 0 }, r: { x: CENTER[who] - ARM, y: 0 } },
    pan: { g: -minDrop, r: -minDrop },
    load: { g: 0, r: 0 },
  }]))

  const wall = (x, halfWidth) =>
    world.createBody({ type: 'static', position: vec(x, -385) })
      .createFixture({ shape: new Box(halfWidth, 400), friction: 0 })

  for (const who of PEOPLE) {
    const cx = CENTER[who]
    wall(cx, COLUMN)
    wall(cx + REACH + 0.5, 0.5)
    wall(cx - REACH - 0.5, 0.5)
    for (const side of SIDES) {
      const body = world.createBody({
        type: 'kinematic',
        position: vec(panCenter(who, side), -minDrop - PAN_THICKNESS),
      })
      body.createFixture({ shape: new Box(PAN_HALF, PAN_THICKNESS), friction: 0.5 })
      pans[who + side] = body
    }
  }

  world.on('begin-contact', (contact) => {
    contacts.push(
      contact.getFixtureA().getBody().getUserData(),
      contact.getFixtureB().getBody().getUserData(),
    )
  })

  function freeze(stone) {
    stone.frozen = true
    stone.body.setType('kinematic')
    stone.body.setLinearVelocity(vec(0, 0))
  }

  function thaw(stone) {
    stone.frozen = false
    stone.body.setType('dynamic')
    stone.body.setAwake(true)
  }

  function thawAbove(who, side, y) {
    for (const stone of stones.values()) {
      if (stone.frozen && stone.who === who && stone.side === side && stone.body.getPosition().y >= y) {
        thaw(stone)
      }
    }
    dirty[who] = true
  }

  function refreeze(who) {
    for (const side of SIDES) {
      let top = -Infinity
      for (const s of stones.values()) {
        if (s.who !== who || s.side !== side || !s.landed || (!s.frozen && s.speed > 0.08)) continue
        top = Math.max(top, s.body.getPosition().y + s.radius)
      }
      const line = top - FREEZE_DEPTH
      let changed = false
      for (const s of stones.values()) {
        if (s.who !== who || s.side !== side || !s.landed) continue
        const head = s.body.getPosition().y + s.radius
        if (!s.frozen && s.speed <= 0.08 && head < line) freeze(s)
        else if (s.frozen && head > line + 1.5) { thaw(s); changed = true }
      }
      if (changed) dirty[who] = true
    }
  }

  // الوزن الفعلي على الكفّة: كل حجر متصل بها عبر سلسلة تلامس، عدا المحمول باليد.
  function weighPan(who, side, heldId) {
    const reached = new Set()
    const queue = [pans[who + side]]
    for (const [id, s] of stones) {
      if (s.frozen && s.who === who && s.side === side) { reached.add(id); queue.push(s.body) }
    }
    while (queue.length) {
      const body = queue.pop()
      for (let edge = body.getContactList(); edge; edge = edge.next) {
        if (!edge.contact.isTouching()) continue
        const id = edge.other.getUserData()
        if (id != null && id !== heldId && !reached.has(id) && stones.has(id)) {
          reached.add(id)
          queue.push(edge.other)
        }
      }
    }
    let sum = 0
    for (const [id, s] of stones) {
      if (s.who === who && s.side === side && reached.has(id)) sum += s.weight
    }
    return sum
  }

  function placeBeam(who, drop, angle = 0) {
    const beam = beams[who]
    const cx = CENTER[who]
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    Object.assign(beam, { angle, omega: 0, drop, hold: 4 })
    beam.tip.g.x = cx + ARM * cos
    beam.tip.g.y = -ARM * sin
    beam.tip.r.x = cx - ARM * cos
    beam.tip.r.y = ARM * sin
    beam.pan.g = beam.tip.g.y - drop
    beam.pan.r = beam.tip.r.y - drop
    for (const side of SIDES) {
      pans[who + side].setTransform(vec(panCenter(who, side), beam.pan[side] - PAN_THICKNESS), 0)
    }
    dirty[who] = true
  }

  function addStone(id, { who, side, radius, weight, x, y, landed }, onLand) {
    const body = world.createBody({
      type: 'dynamic', position: vec(x, y), fixedRotation: true, linearDamping: 0.12, userData: id,
    })
    body.createFixture({ shape: new Circle(radius), density: 1, friction: 0.22, restitution: 0.14 })
    stones.set(id, { body, radius, weight, who, side, landed, onLand, on: false, speed: 0, frozen: false })
    dirty[who] = true
  }

  function removeStone(id) {
    const stone = stones.get(id)
    if (!stone) return
    thawAbove(stone.who, stone.side, stone.body.getPosition().y - 3)
    world.destroyBody(stone.body)
    stones.delete(id)
    dirty[stone.who] = true
  }

  function stoneAt(who, x, y) {
    let best = null
    let bestDist = Infinity
    for (const [id, s] of stones) {
      if (s.who !== who) continue
      const p = s.body.getPosition()
      const d = Math.hypot(p.x - x, p.y - y)
      if (d <= Math.max(s.radius, 0.45) && d < bestDist) { bestDist = d; best = id }
    }
    return best
  }

  function pileTop(who, side) {
    let top = -Infinity
    for (const s of stones.values()) {
      if (s.who === who && s.side === side) top = Math.max(top, s.body.getPosition().y + s.radius)
    }
    return top
  }

  // مواضع الأحجار نسبةً إلى الكفّة، وهي الصيغة المحفوظة في قاعدة البيانات.
  function snapshot(who) {
    const beam = beams[who]
    const out = []
    for (const [id, s] of stones) {
      if (s.who !== who || !s.landed) continue
      const p = s.body.getPosition()
      out.push({
        id,
        x: +(p.x - panCenter(who, s.side)).toFixed(3),
        y: +Math.max(s.radius, p.y - beam.pan[s.side]).toFixed(3),
      })
    }
    return out
  }

  // خطوة واحدة. تُرجع true ما دام في المشهد ما يتحرك.
  function step(rawDt, rowsOf, focus, grab, viewTop) {
    frameNo++
    const dt = clamp(rawDt, 1 / 240, 1 / 30)
    const heldId = grab?.id ?? null
    let active = !!heldId
    const awake = { ab: 0, um: 0 }
    const fastest = { ab: 0, um: 0 }

    for (const s of stones.values()) {
      if (s.frozen || !s.body.isAwake()) { s.speed = 0; continue }
      const v = s.body.getLinearVelocity()
      s.speed = Math.hypot(v.x, v.y)
      awake[s.who]++
      if (s.speed > fastest[s.who]) fastest[s.who] = s.speed

      // شبكة أمان: أي حجر أفلت من حدود كفّته يعود إليها.
      const p = s.body.getPosition()
      const cx = CENTER[s.who]
      const lo = s.side === 'g' ? cx + COLUMN + s.radius : cx - REACH + s.radius
      const hi = s.side === 'g' ? cx + REACH - s.radius : cx - COLUMN - s.radius
      const floor = beams[s.who].pan[s.side]
      if (p.x < lo - 0.3 || p.x > hi + 0.3 || p.y < floor - 1.5) {
        const y = p.y < floor - 1.5 ? Math.max(floor, pileTop(s.who, s.side)) + s.radius + 0.4 : p.y
        s.body.setTransform(vec(clamp(p.x, lo, hi), y), 0)
        s.body.setLinearVelocity(vec(0, 0))
      }
    }
    moving = awake.ab + awake.um

    if (heldId !== lastGrab) {
      lastGrab = heldId
      dirty.ab = dirty.um = true
      const held = heldId && stones.get(heldId)
      if (held) thawAbove(held.who, held.side, held.body.getPosition().y - 3)
    }

    for (const who of PEOPLE) {
      const beam = beams[who]
      const cx = CENTER[who]
      if (awake[who]) active = true
      if ((awake[who] || dirty[who] || heldId) && (who === focus || frameNo % 20 === 0)) {
        dirty[who] = false
        beam.load.g = weighPan(who, 'g', heldId)
        beam.load.r = weighPan(who, 'r', heldId)
      }

      const target = beam.hold > 0 ? (beam.hold--, beam.angle) : tiltFor(beam.load.g, beam.load.r)
      beam.omega += (-9 * (beam.angle - target) - 2.4 * beam.omega) * dt
      beam.angle += beam.omega * dt

      const dropGap = dropFor(rowsOf(who), baseDrop) - beam.drop
      beam.drop += dropGap * Math.min(1, dt * 2)

      const sin = Math.sin(beam.angle)
      const cos = Math.cos(beam.angle)
      beam.tip.g.x = cx + ARM * cos
      beam.tip.g.y = -ARM * sin
      beam.tip.r.x = cx - ARM * cos
      beam.tip.r.y = ARM * sin
      beam.pan.g = beam.tip.g.y - beam.drop
      beam.pan.r = beam.tip.r.y - beam.drop

      const swinging = Math.abs(beam.omega) > 0.002 || Math.abs(dropGap) > 0.01
      for (const side of SIDES) {
        const body = pans[who + side]
        const gap = beam.pan[side] - PAN_THICKNESS - body.getPosition().y
        const speed = swinging || Math.abs(gap) > 1e-4 ? gap / dt : 0
        if (speed !== 0 || body.getLinearVelocity().y !== 0) {
          body.setLinearVelocity(vec(0, speed))
          for (const s of stones.values()) {
            if (s.frozen && s.who === who && s.side === side) s.body.setLinearVelocity(vec(0, speed))
          }
        }
      }

      if (!heldId && frameNo % 12 === 0) refreeze(who)
      if (swinging) active = true

      if (awake[who] && !swinging && !heldId && fastest[who] < 0.06) {
        restTime[who] += dt
        if (restTime[who] > 0.6) {
          for (const s of stones.values()) if (s.who === who) s.body.setAwake(false)
          pans[who + 'g'].setAwake(false)
          pans[who + 'r'].setAwake(false)
          restTime[who] = 0
        }
      } else {
        restTime[who] = 0
      }
    }

    const held = grab && stones.get(grab.id)
    if (held) {
      const cx = CENTER[held.who]
      const lo = held.side === 'g' ? cx + COLUMN + held.radius : cx - REACH + held.radius
      const hi = held.side === 'g' ? cx + REACH - held.radius : cx - COLUMN - held.radius
      const p = held.body.getPosition()
      const vx = clamp((clamp(grab.x, lo, hi) - p.x) * 18, -50, 50)
      const vy = clamp((Math.min(grab.y, viewTop - 1) - p.y) * 18, -50, 50)
      held.body.setAwake(true)
      held.body.setLinearVelocity(vec(vx, vy))
    }

    contacts.length = 0
    world.step(dt, 8, 3)

    for (let i = 0; i < contacts.length; i += 2) {
      const a = stones.get(contacts[i])
      const b = stones.get(contacts[i + 1])
      let justLanded = false
      for (const s of [a, b]) {
        if (s && !s.landed) { s.landed = true; justLanded = true; s.onLand?.() }
      }
      const impact = Math.max(a?.speed || 0, b?.speed || 0)
      if (!justLanded && impact > 4 && (a || b)) onKnock?.(Math.min(1, impact / 34), (a || b).side)
    }

    return active
  }

  return {
    beams,
    stones,
    step,
    placeBeam,
    addStone,
    removeStone,
    stoneAt,
    pileTop,
    snapshot,
    nudge: (who, impulse) => { beams[who].omega += impulse },
    setMinDrop: (value) => { baseDrop = value },
    isSettled: () => moving === 0 && !lastGrab,
    positionOf: (id) => stones.get(id)?.body.getPosition() ?? null,
    get: (id) => stones.get(id),
    clear() {
      for (const id of [...stones.keys()]) removeStone(id)
    },
  }
}
