import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import Helix from '../components/Helix.jsx'
import CopyBox from '../components/CopyBox.jsx'
import DnaCard from '../components/DnaCard.jsx'
import DistillOverlay from '../components/DistillOverlay.jsx'
import MjImage from '../components/MjImage.jsx'
import { geneList, dnaCode, KIND_LABEL, mainImage } from '../lib/genes.js'
import { distill, updateDna, deleteDna } from '../lib/supabase.js'
import { Link, navigate, useRoute, setQuery } from '../lib/router.jsx'
import { useStore } from '../store.jsx'

function Editable({ as: Tag = 'p', field, dna, editing, setDraft, className, testId }) {
  if (!editing) return <Tag className={className} data-testid={testId}>{dna[field]}</Tag>
  // Uncontrolled: React never touches the children while the field is being edited.
  const init = (el) => { if (el && !el.dataset.init) { el.textContent = dna[field] ?? ''; el.dataset.init = '1' } }
  return (
    <Tag ref={init} className={`${className ?? ''} editable`} contentEditable suppressContentEditableWarning data-testid={`edit-${field}`}
      onInput={(e) => { const v = e.currentTarget.textContent; setDraft((d) => ({ ...d, [field]: v })) }} />
  )
}

// The genome's editing actions live in the A&I logo button, not in a floating bar.
function AdminBar({ dna, editing, setEditing, draft, setDraft }) {
  const store = useStore()
  const { setPageItems } = store
  const fns = useRef(store)
  fns.current = store
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const { upsert, remove, toast } = fns.current
    const run = async (fn, msg) => {
      setBusy(true)
      try { await fn(); if (msg) toast(msg) } catch (e) { toast(`נכשל: ${e.message}`) } finally { setBusy(false) }
    }
    setPageItems([
      ...(editing ? [
        { label: 'שמירה', disabled: busy, onSelect: () => run(async () => {
          const patch = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, (v ?? '').trim()]).filter(([k, v]) => v && v !== dna[k]))
          if (Object.keys(patch).length) upsert(await updateDna(dna.id, patch))
          setEditing(false); setDraft({})
        }, 'נשמר') },
        { label: 'ביטול עריכה', onSelect: () => { setEditing(false); setDraft({}) } },
      ] : [
        { label: 'עריכת טקסט', onSelect: () => setEditing(true) },
      ]),
      { label: dna.published ? 'הסתרה' : 'פרסום', disabled: busy, onSelect: () => run(async () => upsert(await updateDna(dna.id, { published: !dna.published })), dna.published ? 'הוסתר' : 'פורסם') },
      { label: dna.featured ? 'הסרה מהמוביל' : 'גנום מוביל', disabled: busy, onSelect: () => run(async () => upsert(await updateDna(dna.id, { featured: !dna.featured })), 'עודכן') },
      { label: 'מחיקת הגנום', disabled: busy, onSelect: () => {
        if (!confirm('למחוק את הגנום הזה לצמיתות?')) return
        run(async () => { await deleteDna(dna.id); remove(dna.id); navigate('/') }, 'נמחק')
      } },
    ])
  }, [dna, editing, draft, busy, setEditing, setDraft, setPageItems])
  useEffect(() => () => setPageItems([]), [setPageItems])
  return null
}

export default function DnaPage({ id }) {
  const { dnas, status, isAdmin, upsert } = useStore()
  const { query } = useRoute()
  const dna = dnas.find((d) => d.id === id)
  const activeGene = query.get('gene')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState('')
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.16])

  useEffect(() => { setEditing(false); setDraft({}) }, [id])

  if (!dna) {
    return (
      <section className="page narrow center" data-testid="dna-missing">
        {status === 'loading' ? <div className="skeleton tall" /> : (
          <>
            <span className="mono-label">לא נמצא</span>
            <h1 className="display">הגנום הזה לא נמצא</h1>
            <Link to="/" className="btn btn-accent">למפת הגנום</Link>
          </>
        )}
      </section>
    )
  }

  const genes = geneList(dna)
  const parents = (dna.parent_ids ?? []).map((pid) => dnas.find((d) => d.id === pid)).filter(Boolean)
  const children = dnas.filter((d) => (d.parent_ids ?? []).includes(dna.id))
  const focus = genes.find((g) => g.key === activeGene)

  const mutate = async (gene, direction) => {
    setMutating(true); setError('')
    try {
      const child = await distill({ mode: 'mutation', parentIds: [dna.id], gene, direction })
      upsert(child); navigate(`/dna/${child.id}`)
    } catch (e) { setError(e.message); setMutating(false) }
  }

  const ep = { dna, editing, draft, setDraft }
  return (
    <article className="dna-page" data-testid="dna-page">
      <header className="dna-hero" ref={heroRef}>
        <div className="dna-hero-media">
          {mainImage(dna)
            ? <motion.img key={mainImage(dna)} src={mainImage(dna)} alt={dna.title} style={{ y: imgY, scale: imgScale }} />
            : <div className="card-media-fallback" style={{ background: `linear-gradient(135deg, ${(dna.palette ?? []).join(', ') || '#2a2e33, #5d646c'})` }} />}
          <div className="dna-hero-shade" />
        </div>
        <div className="dna-hero-copy">
          <div className="crumbs mono">
            <Link to="/">גנום</Link><span>/</span><span>{dnaCode(dna.id)}</span><span>/</span><span>{KIND_LABEL[dna.kind]}</span>
            {dna.lens && <><span>/</span><Link to={`/?lens=${encodeURIComponent(dna.lens)}#genome`}>{dna.lens}</Link></>}
            {!dna.published && <span className="badge">מוסתר</span>}
          </div>
          <Editable as="h1" field="title" className="display" testId="dna-title" {...ep} />
          <Editable as="p" field="distillation" className="distillation" testId="dna-distillation" {...ep} />
        </div>
      </header>

      <div className="page dna-body">
        <section className="dna-core">
          <div className="core-text">
            <div className="kv">
              <span className="mono-label">מהות</span>
              <Editable field="essence" {...ep} />
            </div>
            <div className="kv">
              <span className="mono-label">מתח</span>
              <Editable field="tension" className="tension" {...ep} />
            </div>
            <div className="kv">
              <span className="mono-label">תיאור</span>
              <Editable field="description_he" {...ep} />
            </div>
            {dna.palette?.length > 0 && (
              <div className="kv">
                <span className="mono-label">פלטה</span>
                <div className="palette">
                  {dna.palette.map((c) => <span key={c} style={{ background: c }} title={c}><i className="mono">{c}</i></span>)}
                </div>
              </div>
            )}
          </div>
          <div className="core-helix">
            <Helix genes={focus ? genes.map((g) => ({ ...g, intensity: g.key === focus.key ? 100 : g.intensity * 0.35 })) : genes} rungs={26} speed={0.8} />
          </div>
        </section>

        <section>
          <span className="mono-label">שישה גנים</span>
          <div className="genes" role="tablist" aria-label="גנים">
            {genes.map((g, i) => (
              <motion.button key={g.key} role="tab" aria-selected={activeGene === g.key} className={`gene ${activeGene === g.key ? 'on' : ''}`}
                style={{ '--gene': g.color }} data-testid="gene"
                onClick={() => setQuery({ gene: activeGene === g.key ? null : g.key })}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <span className="gene-head"><b>{g.label}</b><span className="mono">{g.intensity}</span></span>
                <span className="gene-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${g.intensity}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 + i * 0.06 }} /></span>
                <span className="gene-value">{g.value}</span>
                <AnimatePresence>
                  {activeGene === g.key && g.note && <motion.span className="gene-note" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{g.note}</motion.span>}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="mutation" data-testid="mutation">
          <div>
            <span className="mono-label">03 / מוטציה</span>
            <h2 className="h2">{focus ? `להזיז את גן ה${focus.label}` : 'בחרו גן כדי להזיז אותו'}</h2>
            <p className="muted">{focus ? 'המוטציה שומרת על שאר הגנים ובודקת איך הזהות כולה משתנה.' : 'לחיצה על אחד מששת הגנים פותחת את המוטציה.'}</p>
          </div>
          <div className="mutation-actions">
            <button className="btn btn-accent" disabled={!focus || mutating} onClick={() => mutate(focus.key, 'up')} data-testid="mutate-up">להקצין</button>
            <button className="btn btn-glass" disabled={!focus || mutating} onClick={() => mutate(focus.key, 'down')} data-testid="mutate-down">להחליש</button>
            <Link to={`/lab?a=${dna.id}`} className="btn btn-ghost" data-testid="to-lab">להכליא עם גנום אחר</Link>
          </div>
          {error && <p className="notice err" data-testid="mutate-error">{error}</p>}
        </section>

        <section className="studio" data-testid="studio">
          <div className="studio-head">
            <span className="mono-label">04 / מהפרומפט לתמונה</span>
            <h2 className="h2">{dna.mj_image_url ? 'התמונה שמייצגת את הגנום' : 'העתיקו, צרו במידג\'רני, החזירו לכאן'}</h2>
            <ol className="studio-steps">
              <li>מעתיקים את הפרומפט</li>
              <li>יוצרים תמונה במידג'רני</li>
              <li>גוררים, מדביקים או בוחרים אותה כאן. היא הופכת לתמונה של הגנום, עם הטקסט שלו.</li>
            </ol>
            <CopyBox label="פרומפט למידג'רני" text={dna.prompt_he} testId="copy-prompt" />
            {dna.mj_image_url && dna.image_url && (
              <div className="studio-auto">
                <img src={dna.image_url} alt="" />
                <span className="muted">התמונה שנוצרה אוטומטית בזיקוק</span>
              </div>
            )}
          </div>
          <MjImage dna={dna} />
        </section>

        <section className="prompts">
          <CopyBox label={`פרומפט המשך ל-Claude${dna.magic_words?.length ? ` / ${dna.magic_words.join(', ')}` : ''}`} text={dna.next_prompt} testId="copy-next" />
          {dna.source_input && <CopyBox label="הרעיון הגולמי" text={dna.source_input} testId="copy-source" />}
        </section>

        {(parents.length > 0 || children.length > 0) && (
          <section>
            <span className="mono-label">שושלת</span>
            <h2 className="h2">{parents.length ? 'הורים' : 'צאצאים'}</h2>
            <div className="grid">
              {[...parents, ...children].map((d, i) => <DnaCard key={d.id} dna={d} index={i} />)}
            </div>
          </section>
        )}
      </div>

      {isAdmin && <AdminBar dna={dna} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} />}
      <AnimatePresence>{mutating && <DistillOverlay mode="mutation" genes={genes} />}</AnimatePresence>
    </article>
  )
}
