import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TopBar from './components/TopBar.jsx'
import AuthModal from './components/AuthModal.jsx'
import Home from './pages/Home.jsx'
import Distill from './pages/Distill.jsx'
import Lab from './pages/Lab.jsx'
import DnaPage from './pages/DnaPage.jsx'
import { useRoute, Link } from './lib/router.jsx'
import { useStore } from './store.jsx'

function NotFound() {
  return (
    <section className="page narrow center">
      <span className="mono-label">404</span>
      <h1 className="display">הגן הזה לא קיים</h1>
      <Link to="/" className="btn btn-accent">לדף הבית</Link>
    </section>
  )
}

export default function App() {
  const { path } = useRoute()
  const { authOpen, closeAuth, toasts } = useStore()

  let page, key = path
  if (path === '/') page = <Home />
  else if (path === '/distill') page = <Distill />
  else if (path === '/lab') page = <Lab />
  else if (path.startsWith('/dna/')) page = <DnaPage id={path.slice(5)} />
  else page = <NotFound />

  useEffect(() => {
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [path])

  return (
    <div className="app">
      <div className="bg-layers" aria-hidden="true"><span className="bg-grid" /><span className="bg-glow a" /><span className="bg-glow b" /></div>
      <TopBar />
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            {page}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="footer">
        <span className="mono-label">ZIKUK / DNA</span>
        <p>כל רעיון נושא קוד. מזקקים אותו כדי שאפשר יהיה לבנות ממנו.</p>
      </footer>
      <AnimatePresence>{authOpen && <AuthModal onClose={closeAuth} />}</AnimatePresence>
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className="toast" data-testid="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{t.text}</motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
