import { useState } from 'react'
import { actions, useStore } from '../store.js'
import { sfx } from '../lib/sound.js'
import { useDialog } from './useDialog.js'
import { useInstall } from './useInstall.js'
import { CloseIcon } from './icons.jsx'

const THEMES = [
  { id: 'light', label: 'فاتح' },
  { id: 'dark', label: 'داكن' },
]

function InstallSetting() {
  const { mode, install } = useInstall()

  if (mode === 'running') {
    return (
      <div className="setting">
        <div className="setting-text">
          التطبيق مثبّت
          <small>أنت تستخدمه الآن كتطبيق على جهازك.</small>
        </div>
      </div>
    )
  }
  if (mode === 'installed') {
    return (
      <div className="setting">
        <div className="setting-text">
          تم التثبيت
          <small>افتح ميزان البر من الشاشة الرئيسية لجهازك.</small>
        </div>
      </div>
    )
  }
  if (mode === 'prompt') {
    return (
      <div className="setting">
        <div className="setting-text">
          تثبيت التطبيق
          <small>يفتح من شاشة جهازك في نافذته الخاصة، دون متصفح.</small>
        </div>
        <button type="button" className="primary" onClick={install}>ثبّت</button>
      </div>
    )
  }
  return (
    <div className="setting">
      <div className="setting-text">
        تثبيت التطبيق
        {mode === 'ios' ? (
          <ol>
            <li>افتح الموقع في Safari.</li>
            <li>اضغط زر المشاركة.</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية».</li>
          </ol>
        ) : (
          <small>من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</small>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const open = useStore((s) => s.settings)
  const theme = useStore((s) => s.theme)
  const sound = useStore((s) => s.sound)
  const user = useStore((s) => s.user)
  const [signingOut, setSigningOut] = useState(false)

  const close = () => actions.showSettings(false)
  useDialog(open, close)

  async function signOut() {
    if (signingOut) return
    sfx.press()
    setSigningOut(true)
    try { await actions.signOut() } finally { setSigningOut(false) }
  }

  return (
    <div className={`sheet-layer${open ? ' open' : ''}`} inert={!open}>
      <div className="scrim" onClick={close} />
      <section className="sheet settings" role="dialog" aria-modal="true" aria-label="الإعدادات">
        <header className="sheet-head">
          <h2>الإعدادات</h2>
          <button type="button" className="icon-button" aria-label="إغلاق" onClick={close}><CloseIcon /></button>
        </header>

        <div className="setting">
          <span id="theme-label">المظهر</span>
          <div className="choice" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((option) => (
              <button
                type="button"
                key={option.id}
                role="radio"
                aria-checked={theme === option.id}
                onClick={() => { sfx.press(); actions.setTheme(option.id) }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="setting">
          <span>الأصوات</span>
          <input type="checkbox" role="switch" checked={sound} onChange={() => { actions.toggleSound(); sfx.press() }} />
        </label>

        <InstallSetting />

        <div className="setting">
          <small dir="ltr">{user?.email}</small>
          <button type="button" className="text-action" onClick={signOut} disabled={signingOut}>تسجيل الخروج</button>
        </div>
      </section>
    </div>
  )
}
