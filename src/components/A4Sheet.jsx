import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { mainImage, dnaCode, KIND_LABEL } from '../lib/genes.js'
import { sourcesOf } from '../lib/articles.js'

// Every article on one A4 page (210 x 297 mm), ready to download as PDF and to print.
// The type starts at 9.5pt and shrinks until the whole article fits the page.
const PAGE_W = 794 // 210mm at 96dpi
const PAGE_H = 1123 // 297mm at 96dpi
const SIGNATURE = "אד' ענת דוד שטיבלמן"
const num = (i) => String(i + 1).padStart(2, '0')
const cleanStep = (s) => String(s).replace(/^\s*\d+[.)]\s*/, '')
// A separate address, so the browser fetches the image with CORS and does not reuse the copy the page already shows.
const corsSrc = (src) => `${src}${src.includes('?') ? '&' : '?'}a4=1`

function fit(sheet) {
  if (!sheet) return
  const body = sheet.querySelector('.a4-content')
  let fs = 9.5
  sheet.style.setProperty('--a4-fs', `${fs}pt`)
  while (body.scrollHeight > body.clientHeight + 1 && fs > 6.25) {
    fs = Math.round((fs - 0.25) * 100) / 100
    sheet.style.setProperty('--a4-fs', `${fs}pt`)
  }
  sheet.dataset.fs = String(fs)
}

export default function A4Sheet({ article, dnas }) {
  const sheet = useRef(null)
  const box = useRef(null)
  const [scale, setScale] = useState(0.5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isSynth = article.kind === 'synthesis'
  const dna = dnas.find((d) => d.id === article.dna_id)
  const sources = sourcesOf(article, dnas)
  const cover = isSynth ? null : mainImage(dna) ?? mainImage(sources[0])
  const chapters = article.chapters ?? []
  const url = `${location.origin}/articles/${article.id}`

  useLayoutEffect(() => { fit(sheet.current) }, [article])
  useEffect(() => {
    // Fonts arriving later change the measures: fit again once they are ready.
    document.fonts?.ready.then(() => fit(sheet.current))
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / PAGE_W)))
    ro.observe(box.current)
    // Any print from this page prints the A4 sheet: a clean copy at body level, everything else hidden.
    const before = () => {
      fit(sheet.current)
      document.getElementById('a4-print')?.remove()
      const host = document.createElement('div')
      host.id = 'a4-print'
      const copy = sheet.current.cloneNode(true)
      copy.style.transform = 'none'
      host.appendChild(copy)
      document.body.appendChild(host)
      document.documentElement.classList.add('printing-a4')
    }
    const after = () => {
      document.getElementById('a4-print')?.remove()
      document.documentElement.classList.remove('printing-a4')
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => { ro.disconnect(); window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); after() }
  }, [])

  const download = async () => {
    setBusy(true); setError('')
    try {
      await document.fonts?.ready
      fit(sheet.current)
      const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
      const png = await toPng(sheet.current, { pixelRatio: 3, width: PAGE_W, height: PAGE_H, style: { transform: 'none' }, cacheBust: true, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      pdf.addImage(png, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
      pdf.setProperties({ title: `${article.title_light} ${article.title_bold}`, author: SIGNATURE, subject: 'זיקוק DNA' })
      pdf.save(`${article.title_light} ${article.title_bold}.pdf`)
    } catch (e) {
      console.error(e)
      setError('לא הצלחנו להכין את הקובץ. אפשר להדפיס ולבחור "שמירה כ-PDF".')
    } finally { setBusy(false) }
  }

  return (
    <section className="a4-wrap" data-testid="a4">
      <div className="a4-head">
        <div>
          <span className="mono-label">דף A4</span>
          <h2 className="h2">הכתבה בעמוד אחד</h2>
          <p className="muted">כל הכתבה על דף A4 אחד, מוכנה להורדה ולהדפסה. הגופן מוקטן אוטומטית עד שהכתבה נכנסת לעמוד.</p>
        </div>
        <div className="a4-actions">
          <button className="sq-btn" onClick={download} disabled={busy} data-testid="a4-pdf">{busy ? 'מכינה את הקובץ' : 'הורדת PDF'}</button>
          <button className="sq-btn" onClick={() => window.print()} data-testid="a4-print">הדפסה</button>
        </div>
      </div>
      {error && <p className="notice err" data-testid="a4-error">{error}</p>}
      <div className="a4-stage" ref={box} style={{ height: PAGE_H * scale }}>
        <div className="a4-sheet" ref={sheet} style={{ transform: `scale(${scale})` }} data-testid="a4-sheet" dir="rtl">
          {isSynth ? (
            <div className="a4-mosaic">{sources.slice(0, 6).map((d) => mainImage(d) && <img key={d.id} src={corsSrc(mainImage(d))} alt="" crossOrigin="anonymous" />)}</div>
          ) : cover && (
            <div className="a4-cover"><img src={corsSrc(cover)} alt="" crossOrigin="anonymous" /><span>הדמיה</span></div>
          )}
          <div className="a4-content">
            <div className="a4-kicker">
              {isSynth ? `מבט על הגנום / ${article.dna_ids.length} זיקוקים` : `סיפור זיקוק / ${dna ? `${dnaCode(dna.id)} ${KIND_LABEL[dna.kind]}` : ''}`}
            </div>
            <h1 className="a4-title"><span>{article.title_light}</span><b>{article.title_bold}</b></h1>
            <p className="a4-lede">{article.lede}</p>
            <div className="a4-cols">
              {chapters.map((c, i) => (
                <div key={i} className="a4-ch">
                  <div className="a4-ch-head"><span className="a4-num">{num(i)}</span><h3>{c.heading}</h3></div>
                  <p>{c.body}</p>
                  <p className="a4-insight">{c.insight}</p>
                </div>
              ))}
            </div>
            <div className="a4-meta">
              <span>תובנה מתובנות</span>
              <p className="a4-meta-text">{article.meta_insight}</p>
              <p>{article.meta_explain}</p>
            </div>
            <div className="a4-steps">
              {(article.steps ?? []).map((s, i) => <div key={i}><span className="a4-num">{num(i)}</span><p>{cleanStep(s)}</p></div>)}
            </div>
            {article.question && <p className="a4-question"><span>שאלה לקורא</span>{article.question}</p>}
          </div>
          <div className="a4-foot"><span>{SIGNATURE}</span><span dir="ltr">{url.replace(/^https?:\/\//, '')}</span><span>זיקוק DNA</span></div>
        </div>
      </div>
    </section>
  )
}
