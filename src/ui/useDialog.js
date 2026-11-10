import { useEffect, useRef } from 'react'

// سلوك النوافذ المنبثقة: Esc يغلق، والتركيز يعود لمكانه عند الإغلاق.
export function useDialog(open, onClose) {
  const returnTo = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return undefined
    returnTo.current = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') close.current() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      returnTo.current?.focus?.({ preventScroll: true })
    }
  }, [open])
}
