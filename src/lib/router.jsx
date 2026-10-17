import { useEffect, useState } from 'react'

export function navigate(to) {
  if (to === location.pathname + location.search) return
  history.pushState({}, '', to)
  window.dispatchEvent(new Event('zk:navigate'))
  window.scrollTo({ top: 0, behavior: 'instant' })
}

export function useRoute() {
  const read = () => ({ path: location.pathname, query: new URLSearchParams(location.search) })
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('popstate', on)
    window.addEventListener('zk:navigate', on)
    return () => { window.removeEventListener('popstate', on); window.removeEventListener('zk:navigate', on) }
  }, [])
  return route
}

export function Link({ to, children, ...rest }) {
  return (
    <a href={to} {...rest} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault(); rest.onClick?.(e); navigate(to)
    }}>{children}</a>
  )
}

// Replace query params without a new history entry (filters, selections).
export function setQuery(params) {
  const q = new URLSearchParams(location.search)
  Object.entries(params).forEach(([k, v]) => (v == null || v === '' ? q.delete(k) : q.set(k, v)))
  const s = q.toString()
  history.replaceState({}, '', location.pathname + (s ? `?${s}` : ''))
  window.dispatchEvent(new Event('zk:navigate'))
}
