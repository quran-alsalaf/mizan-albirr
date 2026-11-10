const base = {
  viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

export const LedgerIcon = () => (
  <svg {...base}><path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M9 3.5v17M12.5 8.5H16M12.5 12.5H16" /></svg>
)
export const SettingsIcon = () => (
  <svg {...base}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </svg>
)
export const CloseIcon = () => <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const EditIcon = () => (
  <svg {...base} width={18} height={18}><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
)
export const EyeIcon = ({ off }) => (
  <svg {...base}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
    {off && <path d="M4 4l16 16" />}
  </svg>
)

// شعار الميزان: يميل قليلاً نحو كفّة البرّ.
export const Mark = ({ size = 72 }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} fill="none" aria-hidden="true">
    <g style={{ stroke: 'var(--brass)' }} strokeLinecap="round">
      <path d="M60 22v76" strokeWidth="3.5" />
      <path d="M40 101h40" strokeWidth="5" />
      <path d="M20 26c13-7 27-11 40-11s27 8 40 21" strokeWidth="3.5" />
      <path d="M20 26 8 62M20 26l12 36M100 36 88 72M100 36l12 36" strokeWidth="1.6" />
      <path d="M6 62h28M86 72h28" strokeWidth="4" />
    </g>
    <circle cx="100" cy="62" r="8.5" style={{ fill: 'var(--good)' }} />
    <circle cx="20" cy="56.5" r="4.5" style={{ fill: 'var(--bad)' }} />
    <circle cx="60" cy="19" r="4.5" style={{ fill: 'var(--brass)' }} />
  </svg>
)
