import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import DistillOverlay from '../components/DistillOverlay.jsx'
import { LENSES } from '../lib/genes.js'
import { distill } from '../lib/supabase.js'
import { navigate } from '../lib/router.jsx'
import { useStore } from '../store.jsx'

const SEEDS = [
  'כיכר שמתפקדת כסלון משותף בשעות החום',
  'מבנה ציבור שמתבגר יפה במקום להתיישן',
  'שקט כחומר בנייה',
  'גבול בין שכונה לחוף שאינו קו אלא רצועה',
]

export default function Distill() {
  const { upsert } = useStore()
  const [input, setInput] = useState('')
  const [lens, setLens] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!input.trim()) { setError('צריך לכתוב רעיון לזיקוק.'); return }
    setBusy(true); setError('')
    try {
      const dna = await distill({ mode: 'distill', input, lens: lens || undefined })
      upsert(dna)
      navigate(`/dna/${dna.id}`)
    } catch (err) {
      setError(err.message || 'הזיקוק נכשל. נסו שוב.')
      setBusy(false)
    }
  }

  return (
    <section className="page narrow">
      <span className="mono-label">01 / זיקוק</span>
      <h1 className="display">מה הרעיון?</h1>
      <p className="lead">משפט, מקום, תחושה או בעיה. לא צריך לנסח יפה. הזיקוק מחפש את מה שמתחת.</p>
      <form className="distill-form" onSubmit={submit}>
        <label htmlFor="idea" className="mono-label">הרעיון הגולמי</label>
        <motion.textarea id="idea" data-testid="idea" rows={6} maxLength={4000} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="למשל: רחוב שבו הצל הוא תשתית ציבורית" whileFocus={{ scale: 1.005 }} />
        <div className="seed-row">
          {SEEDS.map((s) => <button type="button" key={s} className="chip ghost" onClick={() => setInput(s)} data-testid="seed">{s}</button>)}
        </div>
        <span className="mono-label">עדשה (לא חובה)</span>
        <div className="chips">
          <button type="button" className={`chip ${!lens ? 'on' : ''}`} onClick={() => setLens('')} data-testid="lens-auto">שהזיקוק יבחר</button>
          {LENSES.map((l) => <button type="button" key={l} className={`chip ${lens === l ? 'on' : ''}`} onClick={() => setLens(l)} data-testid="lens-pick">{l}</button>)}
        </div>
        {error && <p className="notice err" data-testid="distill-error">{error}</p>}
        <button className="btn btn-accent btn-lg" disabled={busy} data-testid="submit-distill">{busy ? 'מזקקת' : 'לזקק'}</button>
      </form>
      <AnimatePresence>{busy && <DistillOverlay mode="distill" />}</AnimatePresence>
    </section>
  )
}
