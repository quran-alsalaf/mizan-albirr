const numbers = new Intl.NumberFormat('ar-SA-u-nu-arab')
const dayMonth = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long' })
const dayMonthYear = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', {
  day: 'numeric', month: 'long', year: 'numeric',
})
const yearOnly = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' })

export const num = (value) => numbers.format(value)

const startOfDay = (time) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayLabel(time, now = Date.now()) {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / 86400000)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  return yearOnly.format(time) === yearOnly.format(now) ? dayMonth.format(time) : dayMonthYear.format(time)
}

export function verdict(good, bad) {
  if (!good && !bad) return 'الميزان فارغ'
  if (good === bad) return 'الكفّتان متعادلتان'
  return good > bad
    ? `البرّ أرجح بـ ${num(good - bad)}`
    : `التقصير أرجح بـ ${num(bad - good)}`
}
