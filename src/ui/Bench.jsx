import { useEffect, useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { actions, useStore } from '../store.js'
import { createEngine } from '../scale/engine.js'
import { NAMES, PEOPLE, total } from '../scale/model.js'
import { sfx, haptic } from '../lib/sound.js'
import { num, verdict } from '../lib/format.js'
import { useTween } from './useTween.js'
import { SettingsIcon, LedgerIcon } from './icons.jsx'
import Composer from './Composer.jsx'
import Ledger from './Ledger.jsx'
import Settings from './Settings.jsx'
import StoneCard from './StoneCard.jsx'

function Tally() {
  const who = useStore((s) => s.who)
  const rows = useStore((s) => s.rows[who])
  const goodTarget = total(rows, 'g')
  const badTarget = total(rows, 'r')
  const good = useTween(goodTarget)
  const bad = useTween(badTarget)

  return (
    <div className="tally">
      <div className="tally-side">
        <span>برّ</span>
        <b>{num(good)}</b>
      </div>
      <p className="tally-verdict" aria-live="polite">{verdict(goodTarget, badTarget)}</p>
      <div className="tally-side">
        <span>تقصير</span>
        <b>{num(bad)}</b>
      </div>
    </div>
  )
}

export default function Bench({ fontsReady }) {
  const who = useStore((s) => s.who)
  const rows = useStore((s) => s.rows[who])
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const topRef = useRef(null)
  const actionsRef = useRef(null)
  const engineRef = useRef(null)
  const fieldRef = useRef(null)

  useLayoutEffect(() => {
    const engine = createEngine(canvasRef.current)
    engineRef.current = engine

    const measure = () => {
      const canvas = canvasRef.current
      engine.resize(canvas.clientWidth, canvas.clientHeight, topRef.current.offsetHeight, actionsRef.current.offsetHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stageRef.current)
    observer.observe(topRef.current)
    fontsReady.then(() => engine.redraw(), () => {})

    return () => { observer.disconnect(); engine.destroy() }
  }, [fontsReady])

  // لوحة المفاتيح على iOS لا تغيّر ارتفاع الصفحة، فنرفع النوافذ يدوياً.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty('--keyboard', `${covered}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])

  // التركيز داخل حدث الضغط نفسه شرط لظهور لوحة المفاتيح على iOS.
  const startEntry = (side) => {
    haptic(8)
    sfx.open()
    flushSync(() => actions.compose(side))
    fieldRef.current?.focus({ preventScroll: true })
  }

  const revise = (row) => {
    sfx.open()
    actions.revise(row)
  }

  const face = (person) => engineRef.current?.switchTo(person)

  return (
    <div className="bench">
      <Ledger onRevise={revise} />

      <main className="stage" ref={stageRef}>
        <canvas ref={canvasRef} className="scale" aria-hidden="true" />

        <header className="top" ref={topRef}>
          <div className="top-bar">
            <h1 className="wordmark">ميزان البر</h1>
            <div className="top-tools">
              <button
                type="button"
                className="tool-button ledger-button"
                onClick={() => { sfx.press(); actions.showLedger(true) }}
              >
                <LedgerIcon />
                <span>السجل</span>
              </button>
              <button
                type="button"
                className="tool-button"
                aria-label="الإعدادات"
                onClick={() => { sfx.press(); actions.showSettings(true) }}
              >
                <SettingsIcon />
              </button>
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="اختر أحد الوالدين">
            {PEOPLE.map((person) => (
              <button
                type="button"
                key={person}
                role="tab"
                aria-selected={person === who}
                className={person === who ? 'on' : ''}
                onClick={() => face(person)}
              >
                {NAMES[person]}
              </button>
            ))}
          </div>

          <Tally />
        </header>

        {!rows.length && <p className="empty-hint">ضع أول حجر في الميزان</p>}

        <StoneCard onRevise={revise} />

        <div className="actions" ref={actionsRef}>
          <button type="button" className="stone-button good" onClick={() => startEntry('g')}>أضف برًّا</button>
          <button type="button" className="stone-button bad" onClick={() => startEntry('r')}>أضف تقصيرًا</button>
        </div>
      </main>

      <Composer engine={engineRef} fieldRef={fieldRef} />
      <Settings />
    </div>
  )
}
