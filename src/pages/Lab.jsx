import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Helix from '../components/Helix.jsx'
import DnaCard from '../components/DnaCard.jsx'
import DistillOverlay from '../components/DistillOverlay.jsx'
import { blendGenes, dnaCode } from '../lib/genes.js'
import { distill } from '../lib/supabase.js'
import { navigate, useRoute, setQuery } from '../lib/router.jsx'
import { useStore } from '../store.jsx'

function Slot({ dna, tag }) {
  return (
    <motion.div className={`slot ${dna ? 'full' : ''}`} layout data-testid={`slot-${tag}`}>
      <span className="mono-label">הורה {tag}</span>
      {dna ? (
        <>
          {dna.image_url && <img src={dna.image_url} alt="" />}
          <h3>{dna.title}</h3>
          <span className="mono">{dnaCode(dna.id)}</span>
        </>
      ) : <p className="muted">בחרו גנום מהרשימה</p>}
    </motion.div>
  )
}

export default function Lab() {
  const { dnas, upsert } = useStore()
  const { query } = useRoute()
  const aId = query.get('a'), bId = query.get('b')
  const A = dnas.find((d) => d.id === aId), B = dnas.find((d) => d.id === bId)
  const [intent, setIntent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const blend = useMemo(() => (A && B ? blendGenes(A, B) : null), [A, B])

  const pick = (d) => {
    if (d.id === aId) return setQuery({ a: bId ?? null, b: null })
    if (d.id === bId) return setQuery({ b: null })
    if (!aId) return setQuery({ a: d.id })
    setQuery({ b: d.id })
  }

  const cross = async () => {
    setBusy(true); setError('')
    try {
      const dna = await distill({ mode: 'hybrid', parentIds: [aId, bId], input: intent || undefined })
      upsert(dna); navigate(`/dna/${dna.id}`)
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <section className="page">
      <span className="mono-label">02 / הכלאה</span>
      <h1 className="display">מעבדת הכלאה</h1>
      <p className="lead">בוחרים שני גנומים. הצאצא יורש את הגנים החזקים של כל אחד, ומחפש מתח חדש.</p>
      <div className="lab-bench">
        <Slot dna={A} tag="א" />
        <div className="lab-center">
          <Helix genes={blend ?? undefined} rungs={22} speed={blend ? 1.2 : 0.4} label="תצוגה מקדימה של הצאצא" />
          <span className="mono-label">{blend ? 'תצוגה מקדימה של הצאצא' : 'ממתין לשני הורים'}</span>
        </div>
        <Slot dna={B} tag="ב" />
      </div>
      <div className="lab-actions">
        <input className="search" placeholder="כוונה להכלאה (לא חובה), למשל: לבית ספר" value={intent} onChange={(e) => setIntent(e.target.value)} data-testid="intent" />
        <button className="btn btn-accent btn-lg" disabled={!A || !B || busy} onClick={cross} data-testid="cross">להכליא</button>
        {(aId || bId) && <button className="btn btn-ghost" onClick={() => setQuery({ a: null, b: null })} data-testid="clear-lab">ניקוי</button>}
      </div>
      {error && <p className="notice err" data-testid="lab-error">{error}</p>}
      <div className="grid">
        {dnas.map((d, i) => <DnaCard key={d.id} dna={d} index={i} selectable selected={d.id === aId ? 'א' : d.id === bId ? 'ב' : null} onSelect={pick} />)}
      </div>
      <AnimatePresence>{busy && <DistillOverlay mode="hybrid" genes={blend} />}</AnimatePresence>
    </section>
  )
}
