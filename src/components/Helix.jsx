import { useEffect, useRef } from 'react'

// Animated double helix. Each rung is one gene: colour = gene, weight = intensity.
// Drawn on canvas for smooth depth (back rungs fade and shrink).
export default function Helix({ genes, rungs = 24, orientation = 'vertical', amplitude = 0.32, speed = 0.6, className = '', label }) {
  const ref = useRef(null)
  const genesRef = useRef(genes)
  genesRef.current = genes

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, t0 = performance.now(), visible = true

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, r.width * dpr)
      canvas.height = Math.max(1, r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)

    const draw = (now) => {
      raf = requestAnimationFrame(draw)
      if (!visible) return
      const g = genesRef.current ?? []
      const w = canvas.clientWidth, h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      const vertical = orientation === 'vertical'
      const len = vertical ? h : w, cross = vertical ? w : h
      const phase = reduce ? 0.6 : ((now - t0) / 1000) * speed
      const amp = cross * amplitude
      const mid = cross / 2
      const pad = len * 0.06
      const step = (len - pad * 2) / (rungs - 1)
      const pts = []
      for (let i = 0; i < rungs; i++) {
        const a = phase + i * 0.42
        const along = pad + i * step
        const s = Math.sin(a), c = Math.cos(a)
        pts.push({ along, a1: mid + s * amp, a2: mid - s * amp, z1: c, z2: -c, gene: g.length ? g[i % g.length] : null })
      }
      const P = (along, acrossV) => (vertical ? [acrossV, along] : [along, acrossV])
      // rungs, back to front
      const order = [...pts].sort((p, q) => Math.min(p.z1, p.z2) - Math.min(q.z1, q.z2))
      for (const p of order) {
        const col = p.gene?.color ?? '#9aa3ad'
        const inten = (p.gene?.intensity ?? 60) / 100
        const depth = (Math.abs(p.z1) + 0.2)
        ctx.globalAlpha = 0.18 + 0.62 * inten * Math.min(1, depth)
        ctx.strokeStyle = col
        ctx.lineWidth = 1 + 3.2 * inten
        ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(...P(p.along, p.a1)); ctx.lineTo(...P(p.along, p.a2)); ctx.stroke()
      }
      // strands
      for (const [key, zk, tint] of [['a1', 'z1', '#f1ede6'], ['a2', 'z2', '#8e99a6']]) {
        ctx.globalAlpha = 1
        ctx.lineWidth = 2
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1]
          const z = (p[zk] + q[zk]) / 2
          ctx.globalAlpha = 0.25 + 0.65 * ((z + 1) / 2)
          ctx.strokeStyle = tint
          ctx.beginPath(); ctx.moveTo(...P(p.along, p[key])); ctx.lineTo(...P(q.along, q[key])); ctx.stroke()
        }
        for (const p of pts) {
          const z = (p[zk] + 1) / 2
          ctx.globalAlpha = 0.35 + 0.65 * z
          ctx.fillStyle = tint
          ctx.beginPath(); ctx.arc(...P(p.along, p[key]), 1.6 + 2.6 * z, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [rungs, orientation, amplitude, speed])

  return <canvas ref={ref} className={`helix ${className}`} role="img" aria-label={label ?? 'סליל DNA של הרעיון'} />
}
