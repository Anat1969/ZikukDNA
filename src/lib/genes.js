// Gene colours carry meaning and stay constant across the app.
export const GENES = [
  { key: 'form', label: 'צורה', color: '#8fa3c4' },
  { key: 'material', label: 'חומר', color: '#c98a5a' },
  { key: 'light', label: 'אור', color: '#e3c26f' },
  { key: 'color', label: 'צבע', color: '#c47a93' },
  { key: 'movement', label: 'תנועה', color: '#6fb3a7' },
  { key: 'time', label: 'זמן', color: '#a08cc9' },
]
export const geneMeta = (key) => GENES.find((g) => g.key === key) ?? GENES[0]

export const LENSES = ['אדריכלות', 'עיר ומרחב', 'רעיון ותודעה', 'חומר ואובייקט', 'טבע ונוף', 'אמנות ותרבות']
export const KIND_LABEL = { distill: 'זיקוק', hybrid: 'הכלאה', mutation: 'מוטציה' }

export function geneList(dna) {
  const raw = Array.isArray(dna?.genes) ? dna.genes : []
  return GENES.map((g) => {
    const f = raw.find((x) => x.key === g.key) ?? {}
    return { ...g, value: f.value ?? '', intensity: Number.isFinite(f.intensity) ? f.intensity : 0, note: f.note ?? '' }
  })
}

export function blendGenes(a, b) {
  const ga = geneList(a), gb = geneList(b)
  return ga.map((g, i) => ({ ...g, intensity: Math.round(Math.max(g.intensity, gb[i].intensity) * 0.6 + Math.min(g.intensity, gb[i].intensity) * 0.4) }))
}

// Short visual code, e.g. "ZK-7A3F", derived from the id.
export const dnaCode = (id = '') => `ZK-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`

export const dominant = (dna) => [...geneList(dna)].sort((x, y) => y.intensity - x.intensity)[0]
