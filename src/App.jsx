import { useStore } from './store.js'
import Auth from './ui/Auth.jsx'
import Bench from './ui/Bench.jsx'

export default function App({ fontsReady }) {
  const phase = useStore((s) => s.phase)
  if (phase === 'auth') return <Auth />
  if (phase === 'app') return <Bench fontsReady={fontsReady} />
  return <div id="splash">ميزان البر</div>
}
