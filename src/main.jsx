import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/latin-400.css'
import '@fontsource/aref-ruqaa/arabic-700.css'
import './styles.css'
import App from './App.jsx'
import { actions } from './store.js'

async function chooseBackend() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
    return (await import('./data/demo.js')).backend
  }
  return (await import('./data/firebase.js')).backend
}

// خط الأحجار يجب أن يكون جاهزاً قبل رسم أول حجر، لكن لا ننتظره طويلاً.
const fonts = Promise.all([
  document.fonts.load('500 32px "IBM Plex Sans Arabic"', 'الأب'),
  document.fonts.load('700 32px "Aref Ruqaa"', 'ميزان'),
])
const fontsOrTimeout = Promise.race([fonts, new Promise((done) => setTimeout(done, 1500))]).catch(() => {})

await Promise.all([fontsOrTimeout, chooseBackend().then(actions.start).catch(console.error)])

createRoot(document.getElementById('root')).render(<App fontsReady={fonts} />)
