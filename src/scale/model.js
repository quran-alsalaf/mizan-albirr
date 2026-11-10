// قواعد الميزان: الأبعاد والأوزان. كل القيم بوحدات العالم (عرض الشاشة = 10 وحدات).

export const PEOPLE = ['ab', 'um']
export const NAMES = { ab: 'الأب', um: 'الأم' }
export const CENTER = { ab: 0, um: -12.5 }
export const SPACING = 12.5

export const COLUMN = 0.4 // نصف عرض العمود الأوسط
export const REACH = 4.7 // أبعد نقطة تصلها الكفّة عن المركز
export const ARM = (COLUMN + REACH) / 2 // طول ذراع العاتق
export const PAN_HALF = (REACH - COLUMN) / 2
export const MAX_TILT = (16 * Math.PI) / 180
export const FULL_TILT_AT = 600 // فرق الوزن الذي يبلغ عنده الميل أقصاه

export const SIDES = ['g', 'r']
export const SIDE_SIGN = { g: 1, r: -1 } // البرّ يمين، والتقصير يسار
export const SIDE_NAME = { g: 'برّ', r: 'تقصير' }

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const radiusOf = (weight) => 0.8 * Math.cbrt(weight / 100)
export const panCenter = (who, side) => CENTER[who] + SIDE_SIGN[side] * ARM

// الوزن على المنزلق غير خطّي: دقيق بين 50 و200، وسريع عند الطرفين.
export const MIN_WEIGHT = 1
export const MAX_WEIGHT = 1000
const LOW = 0.15
const HIGH = 0.85

export function weightAt(ratio) {
  const t = clamp(ratio, 0, 1)
  if (t < LOW) return 1 + (t / LOW) * 49
  if (t < HIGH) return 50 + ((t - LOW) / (HIGH - LOW)) * 150
  return Math.exp(Math.log(200) + ((t - HIGH) / (1 - HIGH)) * Math.log(5))
}

export function ratioOf(weight) {
  const w = clamp(weight, MIN_WEIGHT, MAX_WEIGHT)
  if (w < 50) return ((w - 1) / 49) * LOW
  if (w < 200) return LOW + ((w - 50) / 150) * (HIGH - LOW)
  return HIGH + (Math.log(w / 200) / Math.log(5)) * (1 - HIGH)
}

export const DETENTS = [
  { ratio: LOW, weight: 50 },
  { ratio: HIGH, weight: 200 },
]

export const weightWord = (w) => (w < 50 ? 'يسير' : w < 200 ? 'معتاد' : 'عظيم')

export const total = (rows, side) =>
  rows.reduce((sum, row) => (row.side === side && row.landed ? sum + row.weight : sum), 0)

export const tiltFor = (good, bad) => MAX_TILT * clamp((good - bad) / FULL_TILT_AT, -1, 1)
export const tiltOf = (rows) => tiltFor(total(rows, 'g'), total(rows, 'r'))

// ارتفاع الكومة التقريبي: تطول السلاسل معه كي لا تصطدم الأحجار بالعاتق.
export function pileHeight(rows) {
  const area = { g: 0, r: 0 }
  for (const row of rows) area[row.side] += Math.PI * radiusOf(row.weight) ** 2
  return Math.max(area.g, area.r) / 0.8 / (REACH - COLUMN)
}

export const dropFor = (rows, minDrop) => Math.max(minDrop, pileHeight(rows) * 1.12 + 5)
