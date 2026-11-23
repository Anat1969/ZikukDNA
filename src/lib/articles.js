import { mainImage } from './genes.js'

// Shared helpers for the articles tab.

// Page tones descend from light to dark with one sharp jump in the middle
// (Anat's magazine standard): #fff, #f3f3f3, #ddd, then #3e3e3e, #262626, #131313.
const LIGHT = ['#ffffff', '#f3f3f3', '#dddddd']
const DARK = ['#3e3e3e', '#262626', '#131313']
export function tones(n) {
  const half = Math.ceil(n / 2)
  const pick = (arr, i, count) => arr[count <= 1 ? 0 : Math.round((i / (count - 1)) * (arr.length - 1))]
  return Array.from({ length: n }, (_, i) => (i < half
    ? { bg: pick(LIGHT, i, half), dark: false }
    : { bg: pick(DARK, i - half, n - half), dark: true }))
}

export const storyOf = (articles, dnaId) => articles.find((a) => a.kind === 'story' && a.dna_id === dnaId)
export const latestSynthesis = (articles) => articles.find((a) => a.kind === 'synthesis' && a.published)

// The genomes an article draws on, in its own order.
export const sourcesOf = (article, dnas) => (article?.dna_ids ?? []).map((id) => dnas.find((d) => d.id === id)).filter(Boolean)

export const coverImage = (article, dnas) => mainImage(dnas.find((d) => d.id === article?.dna_id)) ?? mainImage(sourcesOf(article, dnas)[0])

// Genomes named in a block of text (synthesis chapters name the genomes they group).
export const namedIn = (text, dnas) => dnas.filter((d) => d.title && String(text ?? '').includes(d.title))

export const METHOD_STEPS = [
  { n: '01', t: 'חומר גלם', d: 'הרעיון כפי שנכתב, מה נאמר בו ומה נשאר לא אמור.' },
  { n: '02', t: 'מה מתחת', d: 'המהות: הבעיה או האמת שמתחת לרעיון.' },
  { n: '03', t: 'המתח', d: 'שני הקטבים, ואיך הם נראים בחומר, באור ובמרחב.' },
  { n: '04', t: 'הקוד', d: 'הגנים הדומיננטיים כעדות, והגן החלש שמסביר לא פחות.' },
  { n: '05', t: 'השושלת', d: 'בהכלאה ובמוטציה: מה עבר בירושה ומה נולד.' },
]
