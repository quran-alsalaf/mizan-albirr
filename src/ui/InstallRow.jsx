import { useState } from 'react'
import { useInstall } from './useInstall.js'

export default function InstallRow() {
  const { mode, install } = useInstall()
  const [showSteps, setShowSteps] = useState(false)

  if (mode === 'prompt') {
    return <button type="button" className="text-action" onClick={install}>ثبّت التطبيق على جهازك</button>
  }
  if (mode === 'ios') {
    return (
      <div>
        <button type="button" className="text-action" onClick={() => setShowSteps((v) => !v)}>
          ثبّت التطبيق على جهازك
        </button>
        {showSteps && (
          <p className="install-steps">
            افتح الموقع في Safari، واضغط زر المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية».
          </p>
        )}
      </div>
    )
  }
  return null
}
