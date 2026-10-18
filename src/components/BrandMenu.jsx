import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useRoute } from '../lib/router.jsx'
import { DEV_CHAT_URL } from '../lib/supabase.js'
import { copyText } from './CopyBox.jsx'
import { useStore } from '../store.jsx'

// Anat's logo as one button that holds all the system actions
// (copy link, dev chat, install, sign in/out). On narrow screens it also holds the nav.
export function AnatMark({ size = 30 }) {
  return <img src="/brand/anat-mark.svg" alt="" width={size} height={size} className="anat-mark" />
}

export default function BrandMenu({ nav }) {
  const { path } = useRoute()
  const { session, isAdmin, openAuth, signOut, toast } = useStore()
  const [installEvt, setInstallEvt] = useState(null)
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    const on = (e) => { e.preventDefault(); setInstallEvt(e) }
    const done = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done) }
  }, [])
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    if (!open) return
    const out = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open])

  const act = (fn) => async () => { setOpen(false); await fn() }

  return (
    <div className="brand-menu" ref={root}>
      <button className="anat-button" aria-haspopup="menu" aria-expanded={open} data-testid="system-menu"
        aria-label="אד' ענת שטיבלמן, תפריט המערכת" onClick={() => setOpen((o) => !o)}>
        <AnatMark />
        <span className="anat-name">אד' ענת שטיבלמן <i>|</i> &amp;</span>
        {installEvt && <span className="anat-dot" aria-hidden="true" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="system-panel" role="menu" data-testid="system-panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}>
            <div className="system-panel-head">
              <AnatMark size={40} />
              <div>
                <b>אד' ענת שטיבלמן</b>
                <span className="mono-label">{session ? (isAdmin ? 'מחוברת כעורכת' : 'מחובר/ת') : 'אורח/ת'}</span>
              </div>
            </div>
            <div className="system-nav">
              {nav.map((n) => <Link key={n.to} to={n.to} role="menuitem" className="system-item">{n.label}</Link>)}
            </div>
            <button role="menuitem" className="system-item" data-testid="copy-link" onClick={act(async () => { await copyText(location.href); toast('הקישור הועתק') })}>העתקת קישור</button>
            <a role="menuitem" className="system-item" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat" onClick={() => setOpen(false)}>שיחת הפיתוח</a>
            {installEvt && (
              <button role="menuitem" className="system-item accent" data-testid="install" onClick={act(async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null) })}>התקנת האפליקציה</button>
            )}
            {session
              ? <button role="menuitem" className="system-item" data-testid="signout" onClick={act(signOut)}>{isAdmin ? 'יציאה (אדמין)' : 'יציאה'}</button>
              : <button role="menuitem" className="system-item" data-testid="signin" onClick={act(openAuth)}>כניסה</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
