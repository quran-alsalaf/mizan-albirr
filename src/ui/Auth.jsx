import { useState } from 'react'
import { actions } from '../store.js'
import { sfx, unlockAudio } from '../lib/sound.js'
import { EyeIcon, Mark } from './icons.jsx'
import InstallRow from './InstallRow.jsx'

const MODES = {
  in: { title: 'تسجيل الدخول', go: 'دخول', busy: 'جارٍ الدخول…' },
  up: { title: 'حساب جديد', go: 'إنشاء الحساب', busy: 'جارٍ الإنشاء…' },
  reset: { title: 'استعادة كلمة المرور', go: 'أرسل رابط الاستعادة', busy: 'جارٍ الإرسال…' },
}

export default function Auth() {
  const [mode, setMode] = useState('in')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const goTo = (next) => {
    sfx.press()
    setSent(false)
    setProblem('')
    setMode(next)
  }

  async function submit(e) {
    e.preventDefault()
    unlockAudio()
    sfx.press()
    if (busy) return

    const email = form.email.trim()
    if (!email) return setProblem('اكتب بريدك الإلكتروني.')
    if (mode !== 'reset' && !form.password) return setProblem('اكتب كلمة المرور.')

    setBusy(true)
    setProblem('')
    try {
      if (mode === 'in') await actions.signIn(email, form.password)
      else if (mode === 'up') await actions.signUp(form.name, email, form.password)
      else { await actions.resetPassword(email); setSent(true) }
    } catch (error) {
      setProblem(error?.message || 'تعذّر إتمام العملية. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const copy = MODES[mode]

  return (
    <main className="auth">
      <div className="auth-brand">
        <Mark size={84} />
        <h1>ميزان البر</h1>
        <p>زِن برّك بوالديك</p>
      </div>

      <form className="slip" onSubmit={submit} noValidate key={mode}>
        <h2>{copy.title}</h2>

        {mode === 'up' && (
          <label className="field">
            <span>الاسم</span>
            <input type="text" value={form.name} onChange={field('name')} autoComplete="name" />
          </label>
        )}

        <label className="field">
          <span>البريد الإلكتروني</span>
          <input type="email" dir="ltr" value={form.email} onChange={field('email')} autoComplete="email" inputMode="email" />
        </label>

        {mode !== 'reset' && (
          <label className="field">
            <span>كلمة المرور</span>
            <span className="password">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={form.password}
                onChange={field('password')}
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                onClick={() => setShowPassword((v) => !v)}
              >
                <EyeIcon off={showPassword} />
              </button>
            </span>
            {mode === 'up' && <small>ستة أحرف على الأقل.</small>}
          </label>
        )}

        {mode === 'reset' && (
          <p className="note">
            {sent ? 'إن كان البريد مسجّلاً فسيصلك رابط الاستعادة خلال دقائق.' : 'اكتب بريدك وسنرسل إليك رابطاً لتعيين كلمة مرور جديدة.'}
          </p>
        )}

        {problem && <p className="note problem" role="alert">{problem}</p>}

        <button className="primary" disabled={busy}>{busy ? copy.busy : copy.go}</button>

        <div className="auth-links">
          {mode === 'in' ? (
            <>
              <button type="button" className="text-action" onClick={() => goTo('up')}>إنشاء حساب</button>
              <button type="button" className="text-action" onClick={() => goTo('reset')}>نسيت كلمة المرور؟</button>
            </>
          ) : (
            <button type="button" className="text-action" onClick={() => goTo('in')}>العودة إلى تسجيل الدخول</button>
          )}
        </div>
      </form>

      <div className="auth-install"><InstallRow /></div>
    </main>
  )
}
