import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Helix from './Helix.jsx'
import { GENES } from '../lib/genes.js'

const STAGES = {
  distill: ['מפרקת את הרעיון לרכיבים', 'מאתרת את המתח המרכזי', 'מקודדת שישה גנים', 'מנסחת משפט זיקוק', 'מפתחת תמונה', 'שומרת בגנום'],
  hybrid: ['מיישרת את שני הסלילים', 'בוחרת גנים דומיננטיים', 'מחפשת מתח חדש', 'מקודדת את הצאצא', 'מפתחת תמונה', 'שומרת בגנום'],
  mutation: ['פותחת את הסליל', 'מזיזה גן אחד', 'בודקת מה השתנה בזהות', 'מקודדת מחדש', 'מפתחת תמונה', 'שומרת בגנום'],
}

export default function DistillOverlay({ mode = 'distill', genes }) {
  const [i, setI] = useState(0)
  const stages = STAGES[mode]
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, stages.length - 1)), 9000)
    return () => clearInterval(t)
  }, [stages.length])
  const g = genes ?? GENES.map((x, k) => ({ ...x, intensity: 40 + ((k * 23) % 60) }))
  return (
    <motion.div className="overlay" data-testid="distill-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
      <div className="overlay-helix"><Helix genes={g} speed={2.2} rungs={30} /></div>
      <div className="overlay-text">
        <span className="mono-label">{String(i + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}</span>
        <AnimatePresence mode="wait">
          <motion.h2 key={i} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -12 }}>{stages[i]}</motion.h2>
        </AnimatePresence>
        <div className="progress"><motion.span animate={{ width: `${((i + 1) / stages.length) * 100}%` }} /></div>
        <p className="muted">זיקוק מלא עם תמונה לוקח בדרך כלל דקה עד שתיים.</p>
      </div>
    </motion.div>
  )
}
