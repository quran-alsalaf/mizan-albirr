import { useEffect, useState } from 'react'

// يُلتقط الحدث مبكراً، فقد يصل قبل تركيب أي مكوّن.
let deferred = null
let justInstalled = false
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferred = event
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  justInstalled = true
  notify()
})

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => {
    const fn = () => tick((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  if (isStandalone()) return { mode: 'running' }
  if (justInstalled) return { mode: 'installed' }
  if (deferred) {
    return {
      mode: 'prompt',
      install: async () => {
        const event = deferred
        event.prompt()
        await event.userChoice
        deferred = null
        notify()
      },
    }
  }
  return { mode: isIOS() ? 'ios' : 'none' }
}
