// أصوات مولَّدة بالكامل عبر Web Audio، فلا ملفات صوتية تُحمَّل.

let audio = null
let master = null
let muted = false
let noise = null

export function unlockAudio() {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)()
      master = audio.createGain()
      master.gain.value = muted ? 0 : 0.9
      const limiter = audio.createDynamicsCompressor()
      limiter.threshold.value = -16
      limiter.ratio.value = 6
      master.connect(limiter).connect(audio.destination)
    }
    if (audio.state === 'suspended') audio.resume()
  } catch { /* المتصفح لا يدعم الصوت */ }
}

export function setMuted(value) {
  muted = !!value
  if (master) master.gain.value = muted ? 0 : 0.9
}

const canPlay = () => audio && !muted && audio.state === 'running'

function output(side) {
  if (!side || !audio.createStereoPanner) return master
  const pan = audio.createStereoPanner()
  pan.pan.value = side === 'g' ? 0.4 : -0.4
  pan.connect(master)
  return pan
}

function tone(freq, length, level, { to, type = 'sine', delay = 0, side } = {}) {
  const at = audio.currentTime + delay
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + length)
  gain.gain.setValueAtTime(1e-4, at)
  gain.gain.exponentialRampToValueAtTime(level, at + 0.004)
  gain.gain.exponentialRampToValueAtTime(1e-4, at + length)
  osc.connect(gain).connect(output(side))
  osc.start(at)
  osc.stop(at + length + 0.03)
}

function hiss(freq, length, level, { q = 3, delay = 0, side, sweepTo } = {}) {
  if (!noise) {
    noise = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const at = audio.currentTime + delay
  const source = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  source.buffer = noise
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(freq, at)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + length)
  gain.gain.setValueAtTime(level, at)
  gain.gain.exponentialRampToValueAtTime(1e-4, at + length)
  source.connect(filter).connect(gain).connect(output(side))
  source.start(at, Math.random() * 0.3, length + 0.02)
}

// Safari لا يدعم vibrate، لكن تبديل مفتاح switch يعطي نقرة خفيفة.
let hapticSwitch = null
function iosTick() {
  try {
    if (!hapticSwitch) {
      hapticSwitch = document.createElement('label')
      hapticSwitch.setAttribute('aria-hidden', 'true')
      hapticSwitch.style.display = 'none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      hapticSwitch.appendChild(input)
      document.head.appendChild(hapticSwitch)
    }
    hapticSwitch.click()
  } catch { /* لا يهم */ }
}

export const haptic = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
    else iosTick()
  } catch { /* لا يهم */ }
}

let lastStep = 0
let lastKnock = 0

export const sfx = {
  step() {
    const now = performance.now()
    if (!canPlay() || now - lastStep < 26) return
    lastStep = now
    hiss(4600, 0.018, 0.1, { q: 5 })
  },
  detent() {
    haptic(7)
    if (canPlay()) { hiss(1900, 0.04, 0.4, { q: 4 }); tone(660, 0.07, 0.05) }
  },
  press() { if (canPlay()) hiss(2700, 0.03, 0.22, { q: 3 }) },
  open() { if (canPlay()) hiss(900, 0.16, 0.12, { q: 1.2, sweepTo: 2600 }) },
  save() {
    if (canPlay()) { tone(880, 0.12, 0.05); tone(1320, 0.2, 0.045, { delay: 0.07 }) }
  },
  slide() {
    if (canPlay()) { hiss(500, 0.26, 0.2, { q: 0.9, sweepTo: 1500 }); tone(150, 0.2, 0.03) }
  },
  strike() {
    haptic([10, 40, 10])
    if (canPlay()) { tone(520, 0.24, 0.07, { to: 170, type: 'triangle' }); hiss(800, 0.07, 0.18, { q: 2 }) }
  },
  land(weight, side) {
    const size = Math.cbrt(weight / 100)
    haptic(weight > 200 ? [16, 24, 22] : 10)
    if (!canPlay()) return
    hiss(2600 / size, 0.035, 0.5, { q: 6, side })
    tone(1850 / size ** 0.7, 0.55, 0.05, { side })
    tone(5106 / size ** 0.7, 0.22, 0.02, { side, delay: 0.003 })
    tone(125 / size, 0.17, Math.min(0.34, 0.15 * size), { to: 58 / size, side })
  },
  knock(strength, side) {
    const now = performance.now()
    if (!canPlay() || now - lastKnock < 45) return
    lastKnock = now
    hiss(1700 + Math.random() * 1400, 0.03, 0.08 + 0.3 * strength, { q: 4, side })
    tone(700 + Math.random() * 300, 0.05, 0.012 + 0.04 * strength, { side })
  },
}
