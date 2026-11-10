// يولّد أيقونات التطبيق من رسم واحد. التشغيل: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const FELT = '#123A30'
const BRASS = '#D9B977'
const IVORY = '#EFE7D4'
const GARNET = '#C24A34'

const glyph = `
  <g fill="none" stroke="${BRASS}" stroke-linecap="round">
    <path d="M60 24v74" stroke-width="4.5"/>
    <path d="M38 101h44" stroke-width="6.5"/>
    <path d="M20 27c13-7 27-11 40-11s27 8 40 21" stroke-width="4.5"/>
    <path d="M20 27 8 62M20 27l12 35M100 37 88 72M100 37l12 35" stroke-width="2"/>
    <path d="M5 63h30M85 73h30" stroke-width="5"/>
  </g>
  <circle cx="100" cy="62" r="9.5" fill="${IVORY}"/>
  <circle cx="20" cy="56" r="5.5" fill="${GARNET}"/>
  <circle cx="60" cy="20" r="5.5" fill="${BRASS}"/>`

// scale: نسبة الرمز من اللوحة؛ الأيقونة المقنّعة تحتاج هامشاً أوسع.
const icon = ({ scale, radius }) => {
  const size = 512 * scale
  const offset = (512 - size) / 2
  const k = size / 120
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${FELT}"/>
  <g transform="translate(${offset} ${offset + 4}) scale(${k})">${glyph}</g>
</svg>`
}

const out = new URL('../public/icons/', import.meta.url)
mkdirSync(out, { recursive: true })

const png = (svg, width, name) =>
  writeFileSync(new URL(name, out), new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng())

const regular = icon({ scale: 0.72, radius: 0 })
const favicon = icon({ scale: 0.8, radius: 104 })
const maskable = icon({ scale: 0.56, radius: 0 })

writeFileSync(new URL('favicon.svg', out), favicon)
png(regular, 180, 'apple-touch-icon.png')
png(regular, 192, 'icon-192.png')
png(regular, 512, 'icon-512.png')
png(maskable, 512, 'maskable-512.png')
console.log('icons written')
