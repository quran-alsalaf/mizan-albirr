import { useEffect, useRef, useState } from 'react'

// يعدّ الرقم تدريجياً نحو قيمته الجديدة.
export function useTween(target, ms = 600) {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    const from = current.current
    if (from === target) return undefined
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms)
      const next = Math.round(from + (target - from) * (1 - (1 - t) ** 4))
      current.current = next
      setValue(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])

  return value
}
