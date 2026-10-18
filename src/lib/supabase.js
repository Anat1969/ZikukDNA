import { createClient } from '@supabase/supabase-js'

// Shared cultura-GH project. ZikukDNA owns only zikuk_* tables and the zikuk-media bucket.
export const SUPABASE_URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const DEV_CHAT_URL = 'https://claude.ai/code/session_01PSpgUm8awdgvBVVGzYKP4o'

const COLS = 'id,created_at,kind,lens,title,source_input,distillation,essence,tension,genes,palette,magic_words,description_he,prompt_he,prompt_en,next_prompt,image_url,mj_image_url,parent_ids,published,featured'

export async function listDnas() {
  const { data, error } = await supabase.from('zikuk_dnas').select(COLS).order('created_at', { ascending: false }).limit(300)
  if (error) throw error
  return data ?? []
}

export async function distill(payload) {
  const call = () => fetch(`${SUPABASE_URL}/functions/v1/zikuk-distill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(payload),
  })
  // A cold function occasionally fails to boot (503) before running any code; retrying is safe.
  let res = await call()
  for (let i = 0; res.status === 503 && i < 2; i++) {
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    res = await call()
  }
  let body = {}
  try { body = await res.json() } catch { /* empty */ }
  if (!res.ok || !body.dna) throw new Error(body.error || `שגיאה ${res.status}`)
  return body.dna
}

// Attaches (or, with file=null, removes) the Midjourney image for a genome.
export async function uploadMj(dnaId, file) {
  const fd = new FormData()
  fd.append('dnaId', dnaId)
  if (file) fd.append('file', file, file.name || 'midjourney.jpg')
  else fd.append('remove', '1')
  const { data } = await supabase.auth.getSession()
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  if (data.session?.access_token) headers['x-user-token'] = data.session.access_token
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zikuk-upload`, { method: 'POST', headers, body: fd })
  let body = {}
  try { body = await res.json() } catch { /* empty */ }
  if (!res.ok || !body.dna) throw new Error(body.error || `שגיאה ${res.status}`)
  return body.dna
}

export async function updateDna(id, patch) {
  const { data, error } = await supabase.from('zikuk_dnas').update(patch).eq('id', id).select(COLS).single()
  if (error) throw error
  return data
}

export async function deleteDna(id) {
  const { error } = await supabase.from('zikuk_dnas').delete().eq('id', id)
  if (error) throw error
}

export async function checkAdmin() {
  const { data } = await supabase.from('zikuk_admins').select('email').limit(1)
  return !!(data && data.length)
}

export async function authProviders() {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
    const s = await r.json()
    return { google: !!s?.external?.google, email: s?.external?.email !== false }
  } catch {
    return { google: false, email: true }
  }
}
