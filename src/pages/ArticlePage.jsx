import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, navigate } from '../lib/router.jsx'
import { writeArticle, updateArticle, deleteArticle } from '../lib/supabase.js'
import { mainImage, dnaCode, KIND_LABEL } from '../lib/genes.js'
import { tones, sourcesOf, coverImage, namedIn } from '../lib/articles.js'
import { useStore } from '../store.jsx'

const SIGNATURE = "אד' ענת דוד שטיבלמן"
const num = (i) => String(i + 1).padStart(2, '0')

function AdminItems({ article }) {
  const store = useStore()
  const { setPageItems } = store
  const fns = useRef(store)
  fns.current = store
  const busy = useRef(false)
  useEffect(() => {
    const { upsertArticle, removeArticle, toast } = fns.current
    const run = async (fn, msg) => {
      if (busy.current) return
      busy.current = true
      try { await fn(); if (msg) toast(msg) } catch (e) { toast(`נכשל: ${e.message}`) } finally { busy.current = false }
    }
    setPageItems([
      ...(article.kind === 'story' ? [{ label: 'כתיבה מחדש של הכתבה', onSelect: () => run(async () => {
        toast('הכתבה נכתבת מחדש, דקה או שתיים')
        upsertArticle(await writeArticle({ dnaId: article.dna_id, rewrite: true }))
      }, 'הכתבה נכתבה מחדש') }] : []),
      { label: article.published ? 'הסתרת הכתבה' : 'פרסום הכתבה', onSelect: () => run(async () => upsertArticle(await updateArticle(article.id, { published: !article.published })), article.published ? 'הוסתרה' : 'פורסמה') },
      { label: 'מחיקת הכתבה', onSelect: () => {
        if (!confirm('למחוק את הכתבה לצמיתות?')) return
        run(async () => { await deleteArticle(article.id); removeArticle(article.id); navigate('/articles') }, 'נמחקה')
      } },
    ])
    return () => setPageItems([])
  }, [article, setPageItems])
  return null
}

function Thumbs({ items }) {
  if (!items.length) return null
  return (
    <div className="mag-thumbs">
      {items.map((d) => (
        <Link key={d.id} to={`/dna/${d.id}`} className="mag-thumb">
          {mainImage(d) && <img src={mainImage(d)} alt="" loading="lazy" />}
          <span>{d.title}</span>
        </Link>
      ))}
    </div>
  )
}

export default function ArticlePage({ id }) {
  const { articles, articleStatus, dnas, isAdmin } = useStore()
  const article = articles.find((a) => a.id === id)

  if (!article) {
    return (
      <section className="page narrow center" data-testid="article-missing">
        {articleStatus === 'loading' ? <div className="skeleton tall" /> : (
          <>
            <span className="mono-label">לא נמצא</span>
            <h1 className="display">הכתבה הזו לא נמצאה</h1>
            <Link to="/articles" className="sq-btn dark">לכל הכתבות</Link>
          </>
        )}
      </section>
    )
  }

  const isSynth = article.kind === 'synthesis'
  const dna = dnas.find((d) => d.id === article.dna_id)
  const sources = sourcesOf(article, dnas)
  const parents = isSynth ? [] : sources.filter((d) => d.id !== article.dna_id)
  const chapters = article.chapters ?? []
  // cover, chapters, meta insight, steps and question
  const t = tones(chapters.length + 3)
  const tone = (i) => ({ background: t[i].bg })
  const cls = (i) => (t[i].dark ? 'mag-page dark' : 'mag-page')
  const cover = coverImage(article, dnas)
  const stories = articles.filter((a) => a.kind === 'story' && a.published)
  const at = stories.findIndex((a) => a.id === article.id)
  const next = at >= 0 ? stories[(at + 1) % stories.length] : null

  return (
    <article className="mag" data-testid="article-page">
      {isAdmin && <AdminItems article={article} />}

      <header className={cls(0)} style={tone(0)}>
        <div className="mag-cover">
          {isSynth ? (
            <div className="mag-cover-mosaic">{sources.slice(0, 9).map((d) => mainImage(d) && <img key={d.id} src={mainImage(d)} alt="" />)}</div>
          ) : cover && (
            <motion.img className="mag-cover-img" src={cover} alt={dna?.title ?? ''} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }} />
          )}
          {!isSynth && <span className="mag-tag">{dna?.mj_image_url ? 'הדמיה, מידג\'רני' : 'הדמיה'}</span>}
        </div>
        <div className="mag-inner">
          <div className="mag-kicker mono">
            <Link to="/articles">כתבות</Link><span>/</span>
            {isSynth ? <span>מבט על הגנום, {article.dna_ids.length} זיקוקים</span> : <>
              <span>סיפור זיקוק</span><span>/</span>{dna && <Link to={`/dna/${dna.id}`}>{dnaCode(dna.id)} {KIND_LABEL[dna.kind]}</Link>}
            </>}
            {!article.published && <span className="badge">מוסתרת</span>}
          </div>
          <h1 className="mag-title" data-testid="article-title"><span>{article.title_light}</span><b>{article.title_bold}</b></h1>
          <p className="mag-lede">{article.lede}</p>
          <p className="mag-sign">{SIGNATURE}</p>
        </div>
      </header>

      {chapters.map((c, i) => (
        <section key={i} className={cls(i + 1)} style={tone(i + 1)} data-testid="chapter">
          <div className="mag-inner mag-chapter">
            <motion.span className="mag-num" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>{num(i)}</motion.span>
            <div>
              <h2 className="mag-h">{c.heading}</h2>
              <p className="mag-body">{c.body}</p>
              {isSynth && <Thumbs items={namedIn(c.body, sources)} />}
              {!isSynth && i === chapters.length - 1 && parents.length > 0 && <Thumbs items={parents} />}
              <p className="mag-insight" data-testid="insight"><span className="mono-label">תובנה {num(i)}</span>{c.insight}</p>
            </div>
          </div>
        </section>
      ))}

      <section className={cls(chapters.length + 1)} style={tone(chapters.length + 1)} data-testid="meta">
        <div className="mag-inner">
          <span className="mono-label">תובנה מתובנות</span>
          <ol className="mag-converge" aria-label="תובנות הפרקים">
            {chapters.map((c, i) => <li key={i}><span className="mono">{num(i)}</span>{c.insight}</li>)}
          </ol>
          <motion.p className="mag-meta" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>{article.meta_insight}</motion.p>
          <p className="mag-body">{article.meta_explain}</p>
        </div>
      </section>

      <section className={cls(chapters.length + 2)} style={tone(chapters.length + 2)}>
        <div className="mag-inner">
          <span className="mono-label">מה זה אומר לתכנון</span>
          <ol className="mag-steps">{(article.steps ?? []).map((s, i) => <li key={i}><span className="mag-num small">{num(i)}</span><p>{String(s).replace(/^\s*\d+[.)]\s*/, '')}</p></li>)}</ol>
          {article.question && <p className="mag-question"><span className="mono-label">שאלה לקורא</span>{article.question}</p>}
          <div className="mag-end">
            {dna && <Link to={`/dna/${dna.id}`} className="sq-btn">לגנום {dna.title}</Link>}
            {next && next.id !== article.id && <Link to={`/articles/${next.id}`} className="sq-btn" data-testid="next-article">לכתבה הבאה</Link>}
            <Link to="/articles" className="sq-btn">לכל הכתבות</Link>
          </div>
          <p className="mag-colophon">הגוונים יורדים מדף לדף מבהיר לכהה, עם קפיצה אחת באמצע, כמו המעבר מהרעיון אל מה שמתחתיו. התמונות בצבע מלא. טקסט: שיטת "מתובנה לתובנה" של זיקוק DNA.</p>
        </div>
      </section>
    </article>
  )
}
