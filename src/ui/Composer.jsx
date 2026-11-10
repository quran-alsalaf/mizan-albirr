import { useEffect, useRef, useState } from 'react'
import { actions, useStore } from '../store.js'
import { sfx } from '../lib/sound.js'
import { num } from '../lib/format.js'
import {
  DETENTS, MAX_WEIGHT, NAMES, SIDE_NAME, clamp, panCenter, radiusOf, ratioOf, weightAt, weightWord,
} from '../scale/model.js'
import { useDialog } from './useDialog.js'
import { CloseIcon } from './icons.jsx'

const MAX_TEXT = 80
const SNAP = 0.013
const PREVIEW_RADIUS = 34 // نصف قطر أثقل حجر في المعاينة، بالبكسل

export default function Composer({ engine, fieldRef }) {
  const entry = useStore((s) => s.entry)
  const who = useStore((s) => s.who)
  const [text, setText] = useState('')
  const [weight, setWeight] = useState(100)
  const [confirming, setConfirming] = useState(false)
  const detent = useRef(0)

  useEffect(() => {
    if (!entry) return
    setText(entry.text)
    setWeight(entry.weight)
    setConfirming(false)
  }, [entry])

  useEffect(() => {
    if (!confirming) return undefined
    const timer = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  useDialog(!!entry, () => actions.dismiss())

  const open = !!entry
  const side = entry?.side ?? 'g'
  const isEdit = !!entry?.id
  const trimmed = text.trim()

  function save(e) {
    e.preventDefault()
    if (!trimmed || !entry) return
    fieldRef.current?.blur()
    const radius = radiusOf(weight)
    const scale = engine.current

    if (isEdit) {
      sfx.save()
      const at = scale?.position(entry.id)
      actions.amend(who, entry.id, {
        text: trimmed,
        weight,
        ...(at ? { x: at.x, y: at.y + radius - radiusOf(entry.weight) } : {}),
      })
      return
    }
    sfx.press()
    const startY = Math.max(scale.viewTop() + radius + 0.2, scale.pileTop(who, side) + radius + 0.4)
    actions.post(who, {
      id: `b${Date.now().toString(36)}`,
      side,
      text: trimmed,
      weight,
      time: Date.now(),
      landed: false,
      x: panCenter(who, side),
      y: startY,
    })
  }

  function erase() {
    if (!confirming) {
      sfx.press()
      setConfirming(true)
      return
    }
    sfx.strike()
    actions.strike(who, entry.id)
  }

  function changeWeight(e) {
    let ratio = Number(e.target.value) / 1000
    let snapped = 0
    for (const d of DETENTS) {
      if (Math.abs(ratio - d.ratio) < SNAP) { ratio = d.ratio; snapped = d.weight }
    }
    if (snapped !== detent.current) {
      detent.current = snapped
      if (snapped) sfx.detent()
    }
    const next = snapped || clamp(Math.round(weightAt(ratio)), 1, MAX_WEIGHT)
    if (next !== weight) {
      if (!snapped) sfx.step()
      setWeight(next)
    }
  }

  const previewSize = (radiusOf(weight) / radiusOf(MAX_WEIGHT)) * PREVIEW_RADIUS * 2
  const title = isEdit ? `تعديل ${SIDE_NAME[side]}` : `${SIDE_NAME[side]} جديد`

  return (
    <div className={`sheet-layer${open ? ' open' : ''}`} inert={!open}>
      <div className="scrim" onClick={() => actions.dismiss()} />
      <form className={`sheet composer ${side}`} role="dialog" aria-modal="true" aria-label={title} onSubmit={save}>
        <header className="sheet-head">
          <h2><i className={`dot ${side}`} />{title}<small>{NAMES[who]}</small></h2>
          <button type="button" className="icon-button" aria-label="إغلاق" onClick={() => actions.dismiss()}>
            <CloseIcon />
          </button>
        </header>

        <label className="sr-only" htmlFor="deed">وصف العمل</label>
        <textarea
          id="deed"
          ref={fieldRef}
          rows={2}
          maxLength={MAX_TEXT}
          value={text}
          placeholder={side === 'g' ? 'ما الذي فعلته فأسعده؟' : 'أين قصّرت؟'}
          enterKeyHint="done"
          onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={(e) => { if (e.key === 'Enter') save(e) }}
        />

        <div className="weigh">
          <div className="weigh-control">
            <div className="weigh-label">
              <label htmlFor="weight">الوزن</label>
              <output htmlFor="weight"><b>{num(weight)}</b> {weightWord(weight)}</output>
            </div>
            <input
              id="weight"
              type="range"
              min="0"
              max="1000"
              step="1"
              value={Math.round(ratioOf(weight) * 1000)}
              aria-valuetext={`${num(weight)}، ${weightWord(weight)}`}
              onChange={changeWeight}
            />
            <div className="weigh-marks" aria-hidden="true">
              <span style={{ insetInlineStart: 0 }}>يسير</span>
              <span style={{ insetInlineStart: '50%', transform: 'translateX(50%)' }}>معتاد</span>
              <span style={{ insetInlineEnd: 0 }}>عظيم</span>
            </div>
          </div>
          <div className="weigh-preview" aria-hidden="true">
            <i className={`preview-stone ${side}`} style={{ width: previewSize, height: previewSize }} />
          </div>
        </div>

        <footer className="sheet-foot">
          {isEdit && (
            <button type="button" className={`danger-button${confirming ? ' sure' : ''}`} onClick={erase}>
              {confirming ? 'اضغط مرة أخرى للحذف' : 'حذف'}
            </button>
          )}
          <button className="primary" disabled={!trimmed}>{isEdit ? 'حفظ' : 'ضعه في الكفّة'}</button>
        </footer>
      </form>
    </div>
  )
}
