// خلفية وهمية لتجربة الواجهة أثناء التطوير: npm run dev ثم افتح /?demo
// لا تدخل هذه الوحدة في نسخة الإنتاج.
const DAY = 86400000
const now = Date.now()

const ball = (id, text, weight, color, daysAgo) => ({ id, text, weight, color, date: now - daysAgo * DAY })

const seed = {
  father: [
    ball('f1', 'زرته بعد العمل', 120, 'green', 0),
    ball('f2', 'اتصلت أطمئن عليه', 60, 'green', 1),
    ball('f3', 'قضيت له مشواره', 180, 'green', 3),
    ball('f4', 'تأخرت في الرد عليه', 40, 'red', 2),
    ball('f5', 'دعوت له في السجود', 300, 'green', 6),
    ball('f6', 'رفعت صوتي', 150, 'red', 12),
  ],
  mother: [
    ball('m1', 'قبّلت رأسها', 90, 'green', 0),
    ball('m2', 'نسيت موعدها', 110, 'red', 4),
  ],
}

let user = null
// /?demo=empty يبدأ بميزان فارغ
let data = new URLSearchParams(location.search).get('demo') === 'empty'
  ? { father: [], mother: [] }
  : structuredClone(seed)

export const backend = {
  currentUser: async () => { user = { uid: 'demo', email: 'demo@example.test', name: 'تجربة' }; return user },
  signIn: async () => user,
  signUp: async () => user,
  resetPassword: async () => {},
  signOut: async () => { user = null },
  onRemoteChange() {},
  loadAll: async () => structuredClone(data),
  putBall: async (name, b) => {
    data[name] = [...data[name].filter((x) => x.id !== b.id), b]
  },
  removeBall: async (name, id) => { data[name] = data[name].filter((x) => x.id !== id) },
  savePositions: async () => {},
}
