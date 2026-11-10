// حالة التطبيق: مخزن واحد بسيط تقرؤه React والمحرك معاً.
import { useSyncExternalStore } from 'react'
import { setMuted } from './lib/sound.js'

const PREFS_KEY = 'mizan-albirr/prefs'
const SCALE_OF = { ab: 'father', um: 'mother' }

let backend = null
let state = {
  phase: 'boot', // boot | auth | app
  epoch: 0, // يزيد عند استبدال البيانات كلها فيُعاد بناء المشهد
  user: null,
  who: 'ab',
  rows: { ab: [], um: [] },
  entry: null, // نموذج الإضافة أو التعديل
  picked: null, // الحجر المعروض تفصيله
  ledger: false,
  settings: false,
  sound: true,
  theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
}

const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

export const getState = () => state
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const useStore = (select) => useSyncExternalStore(subscribe, () => select(state))

const toRow = (ball) => ({
  id: ball.id,
  side: ball.color === 'red' ? 'r' : 'g',
  text: ball.text,
  weight: ball.weight,
  time: ball.date,
  landed: true,
  pos: ball.pos,
})

const toBall = (row) => ({
  id: row.id,
  text: row.text,
  weight: row.weight,
  color: row.side === 'r' ? 'red' : 'green',
  date: row.time,
})

const hydrate = (data) => ({ ab: data.father.map(toRow), um: data.mother.map(toRow) })
const updateRows = (who, fn) => ({ rows: { ...state.rows, [who]: fn(state.rows[who]) } })

function readPrefs() {
  try { return { sound: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } }
  catch { return { sound: true } }
}

function writePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sound: state.sound, theme: state.theme }))
  } catch { /* وضع التصفح الخاص */ }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name=theme-color]').content = theme === 'light' ? '#E6E9DD' : '#123A30'
}

async function enter(user) {
  const data = await backend.loadAll()
  set({ user, rows: hydrate(data), phase: 'app', who: 'ab', epoch: state.epoch + 1 })
}

export const actions = {
  async start(chosenBackend) {
    backend = chosenBackend
    const prefs = readPrefs()
    setMuted(!prefs.sound)
    set({ sound: prefs.sound })

    backend.onRemoteChange((data) => {
      if (state.phase !== 'app' || state.entry) return
      set({ rows: hydrate(data), epoch: state.epoch + 1, picked: null })
    })

    let user = null
    try { user = await backend.currentUser() } catch { /* نعرض شاشة الدخول */ }
    if (!user) return set({ phase: 'auth' })
    try { await enter(user) } catch { set({ user, phase: 'app', epoch: state.epoch + 1 }) }
  },

  signIn: async (email, password) => enter(await backend.signIn(email, password)),
  signUp: async (name, email, password) => enter(await backend.signUp(name, email, password)),
  resetPassword: (email) => backend.resetPassword(email),

  async signOut() {
    await backend.signOut()
    set({ phase: 'auth', user: null, rows: { ab: [], um: [] }, ledger: false, settings: false, entry: null, picked: null, epoch: state.epoch + 1 })
  },

  toggleSound() {
    const sound = !state.sound
    setMuted(!sound)
    set({ sound })
    writePrefs()
  },

  setTheme(theme) {
    applyTheme(theme)
    set({ theme })
    writePrefs()
  },

  showSettings: (settings) => set({ settings, picked: null, ledger: false }),

  face: (who) => set({ who, picked: null }),
  compose: (side) => set({ entry: { side, id: null, text: '', weight: 100 }, picked: null, ledger: false }),
  revise: (row) => set({ entry: { side: row.side, id: row.id, text: row.text, weight: row.weight }, picked: null, ledger: false }),
  dismiss: () => set({ entry: null }),
  pick: (id) => set({ picked: id }),
  showLedger: (ledger) => set({ ledger, picked: null }),

  post(who, row) {
    set({ ...updateRows(who, (rows) => [...rows, row]), entry: null })
    backend.putBall(SCALE_OF[who], toBall(row))
  },

  amend(who, id, patch) {
    set({ ...updateRows(who, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r))), entry: null })
    const row = state.rows[who].find((r) => r.id === id)
    if (row) backend.putBall(SCALE_OF[who], toBall(row))
  },

  landed: (who, id) => set(updateRows(who, (rows) => rows.map((r) => (r.id === id ? { ...r, landed: true } : r)))),

  strike(who, id) {
    set({ ...updateRows(who, (rows) => rows.filter((r) => r.id !== id)), entry: null, picked: null })
    backend.removeBall(SCALE_OF[who], id)
  },

  keepPositions: (who, positions) => backend.savePositions(SCALE_OF[who], positions),
}
