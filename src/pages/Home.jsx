import { useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Helix from '../components/Helix.jsx'
import DnaCard from '../components/DnaCard.jsx'
import { Link, useRoute, setQuery } from '../lib/router.jsx'
import { GENES, LENSES, geneList } from '../lib/genes.js'
import { useStore } from '../store.jsx'

const STEPS = [
  { n: '01', title: 'זיקוק', text: 'רעיון גולמי נכנס. יוצאים משפט זיקוק, מתח מרכזי, שישה גנים, פלטה, פרומפט בעברית ותמונה.', to: '/distill', cta: 'לזקק רעיון' },
  { n: '02', title: 'הכלאה', text: 'שני גנומים נפגשים. הצאצא יורש את הגנים החזקים ומייצר מתח שלא היה באף אחד מההורים.', to: '/lab', cta: 'למעבדה' },
  { n: '03', title: 'מוטציה', text: 'מזיזים גן אחד, אור, חומר או זמן, ורואים איך כל הזהות של הרעיון זזה איתו.', to: '/#genome', cta: 'לבחור גנום' },
]

function StepGlyph({ kind }) {
  // Small line illustrations: one strand, two strands crossing, a strand with one displaced rung.
  const strand = (dx, color, flip = 1) => (
    <path d={`M${20 + dx} 8 C ${60 + dx} ${28 * flip + 20}, ${-20 + dx} ${60}, ${20 + dx} 92`} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
  )
  return (
    <svg viewBox="0 0 120 100" className="step-glyph" aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${kind}`} x1="0" x2="1"><stop offset="0" stopColor="#f1ede6" /><stop offset="1" stopColor="#8e99a6" /></linearGradient>
      </defs>
      {kind === 0 && <>{strand(40, `url(#sg-${kind})`)}{GENES.map((g, i) => <line key={g.key} x1={44} x2={76} y1={16 + i * 13} y2={16 + i * 13} stroke={g.color} strokeWidth="3" strokeLinecap="round" opacity={0.5 + i * 0.08} />)}</>}
      {kind === 1 && <>{strand(20, '#c98a5a')}{strand(60, '#8fa3c4', -1)}<circle cx="60" cy="50" r="7" fill="#e3c26f" /></>}
      {kind === 2 && <>{strand(40, `url(#sg-${kind})`)}{GENES.map((g, i) => <line key={g.key} x1={i === 3 ? 30 : 44} x2={i === 3 ? 96 : 76} y1={16 + i * 13} y2={16 + i * 13} stroke={g.color} strokeWidth={i === 3 ? 5 : 3} strokeLinecap="round" opacity={i === 3 ? 1 : 0.45} />)}</>}
    </svg>
  )
}

export default function Home() {
  const { dnas, status } = useStore()
  const { query } = useRoute()
  const lens = query.get('lens') ?? ''
  const q = query.get('q') ?? ''
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 120])
  const heroFade = useTransform(scrollY, [0, 500], [1, 0.2])

  const avg = useMemo(() => GENES.map((g) => {
    const vals = dnas.map((d) => geneList(d).find((x) => x.key === g.key)?.intensity ?? 0)
    return { ...g, intensity: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 55 }
  }), [dnas])

  const filtered = dnas.filter((d) => (!lens || d.lens === lens) && (!q || `${d.title} ${d.distillation} ${d.source_input ?? ''}`.includes(q)))
  const featured = dnas.find((d) => d.featured && d.image_url) ?? dnas.find((d) => d.image_url)
  const counts = { all: dnas.length, hybrid: dnas.filter((d) => d.kind === 'hybrid').length, mutation: dnas.filter((d) => d.kind === 'mutation').length }

  return (
    <>
      <section className="hero">
        <motion.div className="hero-helix" style={{ y: heroY, opacity: heroFade }}>
          <Helix genes={avg} rungs={30} amplitude={0.26} speed={0.45} label="הסליל המשותף של כל הזיקוקים" />
        </motion.div>
        <div className="hero-copy">
          <motion.span className="mono-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>ZIKUK / DNA</motion.span>
          <motion.h1 className="display" initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}>
            כל רעיון נושא קוד.
          </motion.h1>
          <motion.p className="lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
            מזקקים אותו לשישה גנים, משפט אחד ותמונה, כדי שאפשר יהיה לבנות ממנו, להכליא אותו ולשנות אותו.
          </motion.p>
          <motion.div className="hero-cta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <Link to="/distill" className="btn btn-accent btn-lg" data-testid="cta-distill">לזקק רעיון</Link>
            <Link to="/lab" className="btn btn-glass btn-lg" data-testid="cta-lab">מעבדת הכלאה</Link>
          </motion.div>
          <div className="stats">
            <div><b>{counts.all}</b><span className="mono-label">גנומים</span></div>
            <div><b>{counts.hybrid}</b><span className="mono-label">הכלאות</span></div>
            <div><b>{counts.mutation}</b><span className="mono-label">מוטציות</span></div>
          </div>
          <ul className="gene-legend" aria-label="ששת הגנים">
            {GENES.map((g) => <li key={g.key}><i style={{ background: g.color }} />{g.label}</li>)}
          </ul>
        </div>
      </section>

      <section className="page">
        <div className="steps">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} className="step" initial={{ opacity: 0, y: 30, rotateX: 10 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }}>
              <StepGlyph kind={i} />
              <span className="mono-label">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <Link to={s.to} className="text-link">{s.cta}</Link>
            </motion.div>
          ))}
        </div>
      </section>

      {featured && (
        <section className="page">
          <Link to={`/dna/${featured.id}`} className="featured" data-testid="featured">
            <motion.img src={featured.image_url} alt={featured.title} initial={{ scale: 1.12 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }} />
            <div className="featured-copy">
              <span className="mono-label">גנום מוביל / {featured.lens}</span>
              <h2>{featured.title}</h2>
              <p>{featured.distillation}</p>
            </div>
          </Link>
        </section>
      )}

      <section className="page" id="genome">
        <div className="section-head">
          <div>
            <span className="mono-label">מפת הגנום</span>
            <h2 className="h2">כל הזיקוקים</h2>
          </div>
          <input className="search" type="search" placeholder="חיפוש בגנום" value={q} onChange={(e) => setQuery({ q: e.target.value })} aria-label="חיפוש" data-testid="search" />
        </div>
        <div className="chips" role="tablist" aria-label="סינון לפי עדשה">
          <button role="tab" aria-selected={!lens} className={`chip ${!lens ? 'on' : ''}`} onClick={() => setQuery({ lens: null })} data-testid="lens-all">הכול</button>
          {LENSES.map((l) => (
            <button key={l} role="tab" aria-selected={lens === l} className={`chip ${lens === l ? 'on' : ''}`} onClick={() => setQuery({ lens: l })} data-testid="lens-chip">{l}</button>
          ))}
        </div>
        {status === 'loading' && <div className="grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" />)}</div>}
        {status === 'error' && <p className="notice err" data-testid="load-error">לא הצלחנו לטעון את הגנום. בדקו חיבור ונסו לרענן.</p>}
        {status === 'ready' && !filtered.length && (
          <div className="empty" data-testid="empty">
            <p>{dnas.length ? 'אין גנום שמתאים לסינון.' : 'עדיין אין זיקוקים. הראשון מחכה לכם.'}</p>
            <Link to="/distill" className="btn btn-accent">לזקק רעיון</Link>
          </div>
        )}
        <div className="grid">
          {filtered.map((d, i) => <DnaCard key={d.id} dna={d} index={i} />)}
        </div>
      </section>
    </>
  )
}
