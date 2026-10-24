import { useEffect, useRef } from 'react'
import { DEV_CHAT_URL } from '../lib/supabase.js'
import { useStore } from '../store.jsx'

// The A&I logo button (<ai-menu> from https://appofapp-gh.vercel.app/ai-menu.js).
// It holds every editing and development action: copy link, dev chat, install,
// the current page's editing actions, sign in and out.
export default function BrandMenu() {
  const { session, isAdmin, openAuth, signOut, pageItems } = useStore()
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.items = [
      ...(isAdmin ? pageItems : []),
      session
        ? { label: isAdmin ? 'יציאה (אדמין)' : 'יציאה', onSelect: signOut }
        : { label: 'כניסה', onSelect: openAuth },
    ]
    el.status = session ? (isAdmin ? 'מחוברת כעורכת' : 'מחובר/ת') : ''
  }, [session, isAdmin, openAuth, signOut, pageItems])

  return <ai-menu ref={ref} chat={DEV_CHAT_URL} data-testid="system-menu" />
}
