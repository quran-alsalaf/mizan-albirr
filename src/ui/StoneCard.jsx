import { useStore } from '../store.js'
import { dayLabel, num } from '../lib/format.js'
import { SIDE_NAME, weightWord } from '../scale/model.js'
import { EditIcon } from './icons.jsx'

export default function StoneCard({ onRevise }) {
  const who = useStore((s) => s.who)
  const picked = useStore((s) => s.picked)
  const rows = useStore((s) => s.rows[who])
  const row = picked && rows.find((r) => r.id === picked)
  if (!row) return null

  return (
    <aside className={`stone-card ${row.side}`} aria-live="polite">
      <div className="stone-card-text">
        <p>{row.text}</p>
        <small>{SIDE_NAME[row.side]} · {num(row.weight)} · {weightWord(row.weight)} · {dayLabel(row.time)}</small>
      </div>
      <button type="button" className="quiet-button" onClick={() => onRevise(row)}>
        <EditIcon />
        <span>تعديل</span>
      </button>
    </aside>
  )
}
