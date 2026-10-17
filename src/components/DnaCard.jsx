import { motion } from 'framer-motion'
import { Link } from '../lib/router.jsx'
import { geneList, dnaCode, KIND_LABEL } from '../lib/genes.js'

export function GeneStrip({ dna, height = 6 }) {
  return (
    <div className="gene-strip" style={{ height }} aria-hidden="true">
      {geneList(dna).map((g) => (
        <span key={g.key} style={{ flexGrow: Math.max(4, g.intensity), background: g.color, opacity: 0.35 + g.intensity / 160 }} />
      ))}
    </div>
  )
}

export default function DnaCard({ dna, index = 0, selectable, selected, onSelect }) {
  const body = (
    <>
      <div className="card-media">
        {dna.image_url
          ? <img src={dna.image_url} alt={dna.title} loading="lazy" />
          : <div className="card-media-fallback" style={{ background: `linear-gradient(135deg, ${(dna.palette ?? ['#2a2e33', '#5d646c']).join(', ')})` }} />}
        <span className="card-code mono">{dnaCode(dna.id)}</span>
        {dna.kind !== 'distill' && <span className="card-kind mono">{KIND_LABEL[dna.kind]}</span>}
        {selectable && <span className={`card-select mono ${selected ? 'on' : ''}`}>{selected ? `נבחר ${selected}` : 'בחירה'}</span>}
      </div>
      <GeneStrip dna={dna} />
      <div className="card-body">
        <span className="mono-label">{dna.lens ?? 'גנום'}</span>
        <h3>{dna.title}</h3>
        <p>{dna.distillation}</p>
      </div>
    </>
  )
  return (
    <motion.article
      className={`dna-card ${selected ? 'is-selected' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: Math.min(index, 8) * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={{ y: -6 }}
      data-testid="dna-card"
    >
      {selectable
        ? <button type="button" className="card-link" onClick={() => onSelect?.(dna)} aria-pressed={!!selected}>{body}</button>
        : <Link to={`/dna/${dna.id}`} className="card-link">{body}</Link>}
    </motion.article>
  )
}
