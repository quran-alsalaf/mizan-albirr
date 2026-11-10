import { useMemo } from 'react'
import { actions, useStore } from '../store.js'
import { sfx } from '../lib/sound.js'
import { dayLabel, num } from '../lib/format.js'
import { NAMES, total } from '../scale/model.js'
import { useDialog } from './useDialog.js'
import { CloseIcon } from './icons.jsx'

function groupByDay(rows) {
  const groups = []
  for (const row of [...rows].sort((a, b) => b.time - a.time)) {
    const label = dayLabel(row.time)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.rows.push(row)
    else groups.push({ label, rows: [row] })
  }
  return groups
}

export default function Ledger({ onRevise }) {
  const who = useStore((s) => s.who)
  const rows = useStore((s) => s.rows[who])
  const open = useStore((s) => s.ledger)

  useDialog(open, () => actions.showLedger(false))

  const groups = useMemo(() => groupByDay(rows), [rows])
  const close = () => { sfx.press(); actions.showLedger(false) }

  return (
    <>
      <div className={`scrim ledger-scrim${open ? ' open' : ''}`} onClick={close} />
      <aside className={`ledger${open ? ' open' : ''}`} aria-label="السجل">
        <header className="ledger-head">
          <h2>سجل {NAMES[who]}</h2>
          <button type="button" className="icon-button ledger-close" aria-label="إغلاق السجل" onClick={close}>
            <CloseIcon />
          </button>
        </header>

        <div className="ledger-columns" aria-hidden="true">
          <span>البيان</span><span>برّ</span><span>تقصير</span>
        </div>

        <div className="ledger-body">
          {groups.map((group) => (
            <section key={group.label}>
              <h3>{group.label}</h3>
              {group.rows.map((row) => (
                <button type="button" key={row.id} className="entry-row" onClick={() => onRevise(row)}>
                  <span className="entry-text">{row.text}</span>
                  <span className="entry-num g">{row.side === 'g' ? num(row.weight) : ''}</span>
                  <span className="entry-num r">{row.side === 'r' ? num(row.weight) : ''}</span>
                </button>
              ))}
            </section>
          ))}
          {!rows.length && <p className="ledger-empty">لم تُسجَّل أعمال بعد.</p>}
        </div>

        <div className="ledger-total">
          <span>المجموع</span>
          <b className="g">{num(total(rows, 'g'))}</b>
          <b className="r">{num(total(rows, 'r'))}</b>
        </div>

      </aside>
    </>
  )
}
