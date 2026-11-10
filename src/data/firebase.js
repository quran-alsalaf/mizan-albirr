// الحساب والبيانات على Firebase. هيكل المستندات مطابق للنسخة السابقة
// حتى تبقى بيانات المستخدمين الحاليين كما هي:
//   users/{uid}/scales/{father|mother} → { balls: { [id]: { id, text, weight, color, date, pos? } } }
import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence, createUserWithEmailAndPassword, indexedDBLocalPersistence, initializeAuth,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut, updateProfile,
} from 'firebase/auth'
import {
  deleteField, doc, getDoc, getDocFromServer, getFirestore, initializeFirestore, persistentLocalCache, setDoc,
} from 'firebase/firestore'

// مفاتيح الويب في Firebase عامة بطبيعتها؛ الحماية الفعلية في قواعد Firestore.
const app = initializeApp({
  apiKey: 'AIzaSyBdKE2UrrVRYyOSNGerowgSxKXkXDE-o2o',
  authDomain: 'birr-faf9d.firebaseapp.com',
  projectId: 'birr-faf9d',
  storageBucket: 'birr-faf9d.firebasestorage.app',
  messagingSenderId: '396283973647',
  appId: '1:396283973647:web:28782c33e355686fdf537a',
})

const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })

let db
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache() })
} catch {
  db = getFirestore(app)
}

const ERRORS = {
  'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/missing-email': 'اكتب بريدك الإلكتروني.',
  'auth/missing-password': 'اكتب كلمة المرور.',
  'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/user-not-found': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/user-disabled': 'هذا الحساب موقوف.',
  'auth/email-already-in-use': 'هذا البريد مسجّل من قبل. جرّب تسجيل الدخول.',
  'auth/weak-password': 'كلمة المرور قصيرة. اجعلها ستة أحرف على الأقل.',
  'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم حاول.',
  'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.',
  'auth/operation-not-allowed': 'تسجيل الدخول بالبريد غير مفعّل في المشروع.',
}

const friendly = (error) => {
  const out = new Error(ERRORS[error?.code] || 'تعذّر إتمام العملية. حاول مرة أخرى.')
  out.code = error?.code
  return out
}

const toUser = (user) => (user ? { uid: user.uid, email: user.email || '', name: user.displayName || '' } : null)
const quietly = (promise) => promise.catch((error) => console.warn('[data]', error?.code || error))

const scaleRef = (name) => doc(db, 'users', auth.currentUser.uid, 'scales', name)

const readBalls = (snapshot) =>
  Object.values(snapshot.data()?.balls || {})
    .filter((b) => b && b.id && typeof b.text === 'string' && typeof b.weight === 'number')
    .sort((a, b) => (a.date || 0) - (b.date || 0))

const fingerprint = (balls) => balls.map((b) => `${b.id}|${b.text}|${b.weight}|${b.color}`).join('\n')
const posKey = (pos) => (pos ? `${pos.x.toFixed(2)},${pos.y.toFixed(2)}` : '')

// آخر مواضع مرفوعة، حتى لا نكتب ما لم يتغير.
const known = { father: new Map(), mother: new Map() }
let onRemote = null
let refreshTimer = 0

function refreshSoon() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(async () => {
    try {
      const [fatherDoc, motherDoc] = await Promise.all([getDoc(scaleRef('father')), getDoc(scaleRef('mother'))])
      const father = readBalls(fatherDoc)
      const mother = readBalls(motherDoc)
      known.father = new Map(father.map((b) => [b.id, posKey(b.pos)]))
      known.mother = new Map(mother.map((b) => [b.id, posKey(b.pos)]))
      onRemote?.({ father, mother })
    } catch { /* نحاول في الفتح القادم */ }
  }, 300)
}

function retryServer(ref, delay) {
  setTimeout(() => {
    getDocFromServer(ref).then(
      (snap) => { if (!snap.metadata.fromCache) refreshSoon() },
      () => retryServer(ref, Math.min(delay * 2, 30000)),
    )
  }, delay)
}

// النسخة المحفوظة على الجهاز تُعرض فوراً، ثم تُقارن بالخادم في الخلفية.
async function loadScale(name) {
  const ref = scaleRef(name)
  let balls
  try {
    balls = readBalls(await getDoc(ref))
    const seen = fingerprint(balls)
    getDocFromServer(ref).then((snap) => {
      if (!snap.metadata.fromCache && fingerprint(readBalls(snap)) !== seen) refreshSoon()
    }).catch(() => {})
  } catch {
    try {
      balls = readBalls(await getDocFromServer(ref))
    } catch {
      balls = []
      retryServer(ref, 4000)
    }
  }
  known[name] = new Map(balls.map((b) => [b.id, posKey(b.pos)]))
  return balls
}

export const backend = {
  async currentUser() {
    await auth.authStateReady()
    return toUser(auth.currentUser)
  },

  async signIn(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, (email || '').trim(), password || '')
      return toUser(user)
    } catch (error) { throw friendly(error) }
  },

  async signUp(name, email, password) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, (email || '').trim(), password || '')
      const clean = (name || '').trim()
      if (clean) await updateProfile(user, { displayName: clean }).catch(() => {})
      quietly(setDoc(doc(db, 'users', user.uid), { name: clean, email: user.email || '', createdAt: Date.now() }, { merge: true }))
      return toUser(user)
    } catch (error) { throw friendly(error) }
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, (email || '').trim())
    } catch (error) { throw friendly(error) }
  },

  async signOut() {
    known.father.clear()
    known.mother.clear()
    await firebaseSignOut(auth)
  },

  onRemoteChange(listener) { onRemote = listener },

  async loadAll() {
    const [father, mother] = await Promise.all([loadScale('father'), loadScale('mother')])
    return { father, mother }
  },

  async putBall(name, ball) {
    const data = { id: ball.id, text: ball.text, weight: ball.weight, color: ball.color, date: ball.date }
    if (ball.pos) data.pos = { x: ball.pos.x, y: ball.pos.y }
    if (!known[name].has(ball.id)) known[name].set(ball.id, posKey(ball.pos))
    quietly(setDoc(scaleRef(name), { balls: { [ball.id]: data } }, { merge: true }))
  },

  async removeBall(name, id) {
    known[name].delete(id)
    quietly(setDoc(scaleRef(name), { balls: { [id]: deleteField() } }, { merge: true }))
  },

  async savePositions(name, positions) {
    const balls = {}
    for (const p of positions) {
      if (!known[name].has(p.id)) continue
      const key = posKey(p)
      if (known[name].get(p.id) !== key) {
        known[name].set(p.id, key)
        balls[p.id] = { pos: { x: p.x, y: p.y } }
      }
    }
    if (Object.keys(balls).length) quietly(setDoc(scaleRef(name), { balls }, { merge: true }))
  },
}
