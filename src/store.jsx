import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, listDnas, listArticles, checkAdmin } from './lib/supabase.js'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [dnas, setDnas] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [articles, setArticles] = useState([])
  const [articleStatus, setArticleStatus] = useState('loading')
  const [pageItems, setPageItems] = useState([]) // editing actions of the current page, shown in the A&I menu

  const refresh = useCallback(async () => {
    try { setDnas(await listDnas()); setStatus('ready') } catch { setStatus('error') }
    try { setArticles(await listArticles()); setArticleStatus('ready') } catch { setArticleStatus('error') }
  }, [])

  useEffect(() => {
    refresh()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [refresh])

  useEffect(() => {
    if (!session) { setIsAdmin(false); return }
    checkAdmin().then((ok) => { setIsAdmin(ok); if (ok) refresh() })
  }, [session, refresh])

  const toast = useCallback((text) => {
    const id = Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])

  const value = useMemo(() => ({
    dnas, status, session, isAdmin, refresh, toast, toasts, authOpen, pageItems, setPageItems, articles, articleStatus,
    upsertArticle: (a) => setArticles((all) => [a, ...all.filter((x) => x.id !== a.id)].sort((x, y) => y.created_at.localeCompare(x.created_at))),
    removeArticle: (id) => setArticles((all) => all.filter((x) => x.id !== id)),
    upsert: (d) => setDnas((all) => [d, ...all.filter((x) => x.id !== d.id)].sort((a, b) => b.created_at.localeCompare(a.created_at))),
    remove: (id) => setDnas((all) => all.filter((x) => x.id !== id)),
    openAuth: () => setAuthOpen(true),
    closeAuth: () => setAuthOpen(false),
    signOut: async () => { await supabase.auth.signOut(); setSession(null) },
  }), [dnas, status, session, isAdmin, refresh, toast, toasts, authOpen, pageItems, articles, articleStatus])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
