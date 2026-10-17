import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase, authProviders } from '../lib/supabase.js'

export default function AuthModal({ onClose }) {
  const [prov, setProv] = useState(null)
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  useEffect(() => { authProviders().then(setProv) }, [])

  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } })
  const magic = async (e) => {
    e.preventDefault()
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } })
    setState(error ? 'error' : 'sent')
  }

  return (
    <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" data-testid="auth-modal"
        initial={{ y: 30, opacity: 0, rotateX: 8 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}>
        <span className="mono-label">כניסה</span>
        <h2 id="auth-title">כניסת עורכת</h2>
        <p className="muted">הזיקוקים פתוחים לכולם. כניסה נדרשת רק לעריכה, פרסום ומחיקה.</p>
        {!prov && <p className="muted" data-testid="auth-loading">בודקת אפשרויות כניסה</p>}
        {prov?.google && <button className="btn btn-accent btn-block" data-testid="google" onClick={google}>כניסה עם Google</button>}
        {prov && !prov.google && (
          <p className="notice" data-testid="google-off">הכניסה עם Google עדיין לא הופעלה בפרויקט. אפשר להיכנס בקישור חד־פעמי למייל.</p>
        )}
        {prov && !prov.google && prov.email && (
          state === 'sent'
            ? <p className="notice ok" data-testid="magic-sent">נשלח קישור כניסה ל-{email}. פותחים אותו מהמייל ומגיעים ישר לכאן.</p>
            : (
              <form onSubmit={magic} className="auth-form">
                <label htmlFor="auth-email" className="mono-label">מייל</label>
                <input id="auth-email" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                <button className="btn btn-accent btn-block" disabled={state === 'sending'} data-testid="magic">{state === 'sending' ? 'שולחת' : 'שליחת קישור כניסה'}</button>
                {state === 'error' && <p className="notice err">השליחה נכשלה. נסו שוב בעוד דקה.</p>}
              </form>
            )
        )}
        <button className="btn btn-ghost btn-block" onClick={onClose} data-testid="auth-close">סגירה</button>
      </motion.div>
    </motion.div>
  )
}
