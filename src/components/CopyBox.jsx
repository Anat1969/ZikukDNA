import { useState } from 'react'

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  }
}

export default function CopyBox({ label, text, dir = 'rtl', mono = false, testId }) {
  const [done, setDone] = useState(false)
  if (!text) return null
  return (
    <div className="copybox">
      <div className="copybox-head">
        <span className="mono-label">{label}</span>
        <button className="btn btn-ghost btn-sm" data-testid={testId} onClick={async () => { await copyText(text); setDone(true); setTimeout(() => setDone(false), 1600) }}>
          {done ? 'הועתק' : 'העתקה'}
        </button>
      </div>
      <p className={mono ? 'copybox-body mono' : 'copybox-body'} dir={dir}>{text}</p>
    </div>
  )
}
