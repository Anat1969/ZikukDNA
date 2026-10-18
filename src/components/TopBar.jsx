import { Link, useRoute } from '../lib/router.jsx'
import BrandMenu from './BrandMenu.jsx'

const NAV = [
  { to: '/distill', label: 'זיקוק חדש' },
  { to: '/lab', label: 'מעבדת הכלאה' },
  { to: '/#genome', label: 'מפת הגנום' },
]

export default function TopBar() {
  const { path } = useRoute()
  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" data-testid="brand" aria-label="זיקוק DNA, לדף הבית">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span className="brand-name">זיקוק <b>DNA</b></span>
        </Link>
        <nav className="topnav" aria-label="ניווט ראשי">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`navlink ${path === n.to ? 'active' : ''}`}>{n.label}</Link>
          ))}
        </nav>
        <BrandMenu nav={NAV} />
      </div>
    </header>
  )
}
