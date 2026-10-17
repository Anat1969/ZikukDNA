import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useRoute } from '../lib/router.jsx'
import { DEV_CHAT_URL } from '../lib/supabase.js'
import { copyText } from './CopyBox.jsx'
import { useStore } from '../store.jsx'

export default function TopBar() {
  const { path } = useRoute()
  const { session, isAdmin, openAuth, signOut, toast } = useStore()
  const [installEvt, setInstallEvt] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = (e) => { e.preventDefault(); setInstallEvt(e) }
    const done = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done) }
  }, [])
  useEffect(() => setOpen(false), [path])

  const nav = [
    { to: '/distill', label: 'זיקוק חדש' },
    { to: '/lab', label: 'מעבדת הכלאה' },
    { to: '/#genome', label: 'מפת הגנום' },
  ]
  const actions = (
    <>
      <button className="btn btn-ghost btn-sm" data-testid="copy-link" onClick={async () => { await copyText(location.href); toast('הקישור הועתק') }}>העתקת קישור</button>
      <a className="btn btn-ghost btn-sm" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat">שיחת הפיתוח</a>
      {installEvt && (
        <button className="btn btn-accent btn-sm" data-testid="install" onClick={async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null) }}>התקנת האפליקציה</button>
      )}
      {session
        ? <button className="btn btn-ghost btn-sm" data-testid="signout" onClick={signOut}>{isAdmin ? 'יציאה (אדמין)' : 'יציאה'}</button>
        : <button className="btn btn-ghost btn-sm" data-testid="signin" onClick={openAuth}>כניסה</button>}
    </>
  )

  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" data-testid="brand" aria-label="זיקוק DNA, לדף הבית">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span className="brand-name">זיקוק <b>DNA</b></span>
        </Link>
        <nav className="topnav" aria-label="ניווט ראשי">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={`navlink ${path === n.to ? 'active' : ''}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="topbar-actions">{actions}</div>
        <button className="btn btn-ghost btn-sm menu-toggle" aria-expanded={open} data-testid="menu-toggle" onClick={() => setOpen((o) => !o)}>{open ? 'סגירה' : 'תפריט'}</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="mobile-menu" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="mobile-menu-inner">
              {nav.map((n) => <Link key={n.to} to={n.to} className="navlink">{n.label}</Link>)}
              <div className="mobile-actions">{actions}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
