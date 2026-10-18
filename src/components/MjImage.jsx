import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { uploadMj } from '../lib/supabase.js'
import { geneList, dnaCode } from '../lib/genes.js'
import { useStore } from '../store.jsx'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIDE = 2400

// Keeps the original when it is already small enough; otherwise re-encodes to JPEG.
async function prepare(file) {
  if (!file.type.startsWith('image/')) throw new Error('זה לא קובץ תמונה')
  const bmp = await createImageBitmap(file)
  const big = Math.max(bmp.width, bmp.height) > MAX_SIDE
  if (ACCEPT.includes(file.type) && file.size < 4_000_000 && !big) return file
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))
  return new File([blob], 'midjourney.jpg', { type: 'image/jpeg' })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text ?? '').split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += '...' }
  return lines
}

// A shareable 4:5 card: the image above, the genome's text and gene strip below.
async function downloadCard(dna, src) {
  await document.fonts.ready
  const W = 1080, H = 1350, IMG = 1080
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0f1113'; ctx.fillRect(0, 0, W, H)
  // Fresh CORS request: a copy cached from the plain <img> would taint the canvas.
  const img = await loadImage(`${src}${src.includes('?') ? '&' : '?'}card=1`)
  const s = Math.max(W / img.width, IMG / img.height)
  ctx.drawImage(img, (W - img.width * s) / 2, (IMG - img.height * s) / 2, img.width * s, img.height * s)
  const grad = ctx.createLinearGradient(0, IMG - 220, 0, IMG)
  grad.addColorStop(0, 'rgba(15,17,19,0)'); grad.addColorStop(1, 'rgba(15,17,19,.9)')
  ctx.fillStyle = grad; ctx.fillRect(0, IMG - 220, W, 220)
  const genes = geneList(dna)
  const total = genes.reduce((a, g) => a + Math.max(4, g.intensity), 0)
  let x = W
  for (const g of genes) {
    const w = (Math.max(4, g.intensity) / total) * W
    ctx.fillStyle = g.color; ctx.fillRect(x - w, IMG, w, 8); x -= w
  }
  ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = '#ece8e1'
  ctx.font = '200 64px "IBM Plex Sans Hebrew"'
  ctx.fillText(dna.title ?? '', W - 60, IMG - 40)
  ctx.font = '300 32px "IBM Plex Sans Hebrew"'
  wrap(ctx, dna.distillation, W - 120, 3).forEach((l, i) => ctx.fillText(l, W - 60, IMG + 76 + i * 46))
  ctx.fillStyle = '#a7adb4'; ctx.font = '400 22px "IBM Plex Mono"'
  ctx.direction = 'ltr'; ctx.textAlign = 'left'
  ctx.fillText(`ZIKUK / DNA  ${dnaCode(dna.id)}`, 60, H - 48)
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${dna.title ?? 'zikuk-dna'}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export default function MjImage({ dna }) {
  const { isAdmin, upsert, toast } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [preview, setPreview] = useState(null)
  const [replacing, setReplacing] = useState(false)
  const has = !!dna.mj_image_url
  const canWrite = !has || isAdmin
  const showDrop = canWrite && (!has || replacing)

  const send = useCallback(async (file) => {
    if (busy) return
    setError('')
    let ready
    try { ready = await prepare(file) } catch (e) { setError(e.message || 'לא הצלחנו לקרוא את התמונה'); return }
    const local = URL.createObjectURL(ready)
    setPreview(local); setBusy(true)
    try {
      upsert(await uploadMj(dna.id, ready))
      setReplacing(false)
      toast('התמונה נשמרה בגנום')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false); setPreview(null); URL.revokeObjectURL(local)
    }
  }, [busy, dna.id, upsert, toast])

  // Paste anywhere on the page (Ctrl+V / Cmd+V) while the drop zone is open.
  useEffect(() => {
    if (!showDrop) return
    const onPaste = (e) => {
      if (isTyping(document.activeElement)) return
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'))
      if (!item) return
      e.preventDefault()
      send(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [showDrop, send])

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'))
    if (file) send(file)
    else setError('גררו את קובץ התמונה עצמו. מתוך דף אינטרנט עדיף להעתיק את התמונה ולהדביק כאן.')
  }

  const remove = async () => {
    if (!confirm('להסיר את התמונה ממידג\'רני מהגנום?')) return
    setBusy(true)
    try { upsert(await uploadMj(dna.id, null)); toast('התמונה הוסרה') } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const shown = preview || dna.mj_image_url
  return (
    <div className="mj" data-testid="mj">
      <AnimatePresence mode="wait">
        {shown && !showDrop ? (
          <motion.figure key="plate" className="mj-plate" data-testid="mj-plate"
            initial={{ opacity: 0, y: 24, rotateX: 6 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <div className="mj-plate-img">
              <img src={shown} alt={`${dna.title}, התמונה ממידג'רני`} data-testid="mj-img" />
              <span className="card-code mono">{dnaCode(dna.id)}</span>
            </div>
            <div className="gene-strip" aria-hidden="true">
              {geneList(dna).map((g) => <span key={g.key} style={{ flexGrow: Math.max(4, g.intensity), background: g.color }} />)}
            </div>
            <figcaption>
              <span className="mono-label">{dna.lens ?? 'גנום'} / מידג'רני</span>
              <h3>{dna.title}</h3>
              <p className="mj-distill">{dna.distillation}</p>
              {dna.tension && <p className="muted">{dna.tension}</p>}
            </figcaption>
          </motion.figure>
        ) : showDrop ? (
          <motion.label key="drop" htmlFor={`mj-file-${dna.id}`} data-testid="mj-drop"
            className={`mj-drop ${drag ? 'over' : ''} ${busy ? 'busy' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setDrag(true) }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: drag ? 1.02 : 1 }} exit={{ opacity: 0 }}>
            {preview && <img src={preview} alt="" className="mj-drop-preview" />}
            <span className="mj-drop-frame" aria-hidden="true" />
            <span className="mono-label">{busy ? 'מעלה' : 'התמונה שלך'}</span>
            <b>{busy ? 'שומרת את התמונה בגנום' : 'גררו לכאן את התמונה ממידג\'רני'}</b>
            <span className="muted">או הדביקו אותה (Ctrl+V), או לחצו לבחירת קובץ. JPG, PNG או WEBP.</span>
            <input id={`mj-file-${dna.id}`} type="file" accept={ACCEPT.join(',')} hidden data-testid="mj-input"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) send(f) }} />
          </motion.label>
        ) : null}
      </AnimatePresence>

      {error && <p className="notice err" data-testid="mj-error">{error}</p>}

      <div className="mj-actions">
        {has && !showDrop && <button className="btn btn-accent btn-sm" data-testid="mj-card" onClick={() => downloadCard(dna, dna.mj_image_url).catch(() => setError('לא הצלחנו להכין את הכרטיס'))}>הורדת כרטיס עם הטקסט</button>}
        {has && canWrite && !replacing && <button className="btn btn-ghost btn-sm" data-testid="mj-replace" onClick={() => setReplacing(true)}>החלפת תמונה</button>}
        {replacing && <button className="btn btn-ghost btn-sm" data-testid="mj-cancel" onClick={() => { setReplacing(false); setError('') }}>ביטול</button>}
        {has && isAdmin && <button className="btn btn-danger btn-sm" disabled={busy} data-testid="mj-remove" onClick={remove}>הסרת התמונה</button>}
      </div>
    </div>
  )
}
