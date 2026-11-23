import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, navigate } from '../lib/router.jsx'
import { writeArticle } from '../lib/supabase.js'
import { mainImage, KIND_LABEL, dnaCode } from '../lib/genes.js'
import { storyOf, latestSynthesis, coverImage, sourcesOf, METHOD_STEPS } from '../lib/articles.js'
import { useStore } from '../store.jsx'

function Method() {
  return (
    <section className="method" data-testid="method" aria-labelledby="method-title">
      <div className="method-head">
        <span className="mono-label">שיטת הכתיבה</span>
        <h2 id="method-title" className="h2">מתובנה לתובנה</h2>
        <p className="muted">כל כתבה מספרת איך רעיון גולמי הפך לקוד עיצובי. כל פרק נגמר בתובנה אחת, טענה שאפשר להתווכח איתה. בסוף מניחים את התובנות זו לצד זו ושואלים מה נראה רק מהחיבור ביניהן: זו התובנה מתובנות. כל כמה כתבות נכתבת סינתזה שעושה את אותו הדבר לכל האוסף.</p>
      </div>
      <ol className="method-steps">
        {METHOD_STEPS.map((s, i) => (
          <motion.li key={s.n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
            <span className="method-n">{s.n}</span><b>{s.t}</b><span>{s.d}</span><i>תובנה</i>
          </motion.li>
        ))}
        <motion.li className="method-meta" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
          <span className="method-n">+</span><b>תובנה מתובנות</b><span>מה שנראה רק מהחיבור בין תובנות הפרקים. ואחריה שלושה צעדים לתכנון ושאלה לקורא.</span>
        </motion.li>
      </ol>
    </section>
  )
}

function ArticleCard({ article, dnas, index }) {
  const dna = dnas.find((d) => d.id === article.dna_id)
  const img = coverImage(article, dnas)
  return (
    <motion.article className="article-card" data-testid="article-card"
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.05 }} whileHover={{ y: -6 }}>
      <Link to={`/articles/${article.id}`} className="article-card-link">
        <div className="article-card-img">{img ? <img src={img} alt="" loading="lazy" /> : <span />}</div>
        <div className="article-card-body">
          <span className="mono-label">{dna ? `${KIND_LABEL[dna.kind]} / ${dnaCode(dna.id)}` : 'סיפור זיקוק'}</span>
          <h3><span>{article.title_light}</span><b>{article.title_bold}</b></h3>
          <p>{article.lede}</p>
        </div>
      </Link>
    </motion.article>
  )
}

// A genome whose story is not written yet. Any visitor can ask for it.
function PendingCard({ dna }) {
  const { upsertArticle, toast } = useStore()
  const [busy, setBusy] = useState(false)
  return (
    <div className="article-card pending" data-testid="pending-card">
      <div className="article-card-img">{mainImage(dna) && <img src={mainImage(dna)} alt="" loading="lazy" />}</div>
      <div className="article-card-body">
        <span className="mono-label">עוד לא נכתב / {dnaCode(dna.id)}</span>
        <h3><b>{dna.title}</b></h3>
        <p>{dna.distillation}</p>
        <button className="sq-btn" disabled={busy} data-testid="write-story" onClick={async () => {
          setBusy(true)
          try { const a = await writeArticle({ dnaId: dna.id }); upsertArticle(a); navigate(`/articles/${a.id}`) } catch (e) { toast(e.message); setBusy(false) }
        }}>{busy ? 'הכתבה נכתבת, דקה או שתיים' : 'לכתוב את הסיפור'}</button>
      </div>
    </div>
  )
}

function AdminItems() {
  const store = useStore()
  const { setPageItems } = store
  const fns = useRef(store)
  fns.current = store
  const busy = useRef(false)
  useEffect(() => {
    const { upsertArticle, toast } = fns.current
    setPageItems([{ label: 'סינתזה חדשה של כל התובנות', onSelect: async () => {
      if (busy.current) return
      busy.current = true
      toast('הסינתזה נכתבת, כמה דקות')
      try { upsertArticle(await writeArticle({ mode: 'synthesis' })); toast('הסינתזה נכתבה') } catch (e) { toast(`נכשל: ${e.message}`) } finally { busy.current = false }
    } }])
    return () => setPageItems([])
  }, [setPageItems])
  return null
}

export default function Articles() {
  const { articles, articleStatus, dnas, isAdmin } = useStore()
  const synthesis = latestSynthesis(articles)
  const stories = articles.filter((a) => a.kind === 'story')
  const pending = useMemo(() => dnas.filter((d) => d.published && !storyOf(articles, d.id)), [dnas, articles])
  const metas = stories.filter((s) => s.meta_insight)

  return (
    <section className="page articles" data-testid="articles">
      {isAdmin && <AdminItems />}
      <span className="mono-label">כתבות</span>
      <h1 className="display">כל זיקוק מקבל סיפור.</h1>
      <p className="lead">{stories.length} כתבות על {dnas.length} זיקוקים. כל סיפור נגמר בתובנה מתובנות, וכל כמה סיפורים נכתבת סינתזה של כל האוסף.</p>

      {synthesis && (
        <Link to={`/articles/${synthesis.id}`} className="synth-feature" data-testid="synthesis-feature">
          <div className="synth-mosaic" aria-hidden="true">
            {sourcesOf(synthesis, dnas).slice(0, 9).map((d) => mainImage(d) && <img key={d.id} src={mainImage(d)} alt="" loading="lazy" />)}
          </div>
          <div className="synth-copy">
            <span className="mono-label">מבט על הגנום / סינתזה של {synthesis.dna_ids.length} זיקוקים</span>
            <h2><span>{synthesis.title_light}</span><b>{synthesis.title_bold}</b></h2>
            <p className="synth-meta">{synthesis.meta_insight}</p>
          </div>
        </Link>
      )}

      <Method />

      {metas.length > 0 && (
        <section className="metas" data-testid="metas">
          <span className="mono-label">תובנות מתובנות</span>
          <h2 className="h2">מה כל סיפור למד</h2>
          <ol>
            {metas.map((s) => (
              <li key={s.id}><Link to={`/articles/${s.id}`}><q>{s.meta_insight}</q><span className="mono-label">{s.title_light} {s.title_bold}</span></Link></li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <span className="mono-label">סיפורי הזיקוק</span>
        {articleStatus === 'loading' && <div className="grid">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" />)}</div>}
        {articleStatus === 'error' && <p className="notice err">לא הצלחנו לטעון את הכתבות. בדקו חיבור ונסו לרענן.</p>}
        {articleStatus === 'ready' && !stories.length && !pending.length && <p className="notice">עדיין אין זיקוקים. כל זיקוק חדש יקבל כתבה משלו.</p>}
        <div className="grid">
          {stories.map((a, i) => <ArticleCard key={a.id} article={a} dnas={dnas} index={i} />)}
          {pending.map((d) => <PendingCard key={d.id} dna={d} />)}
        </div>
      </section>
    </section>
  )
}
