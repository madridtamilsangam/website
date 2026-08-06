import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LOGO_URL } from '../services/config'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')

export default function Header() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to="/" end className="brand">
          {LOGO_URL && <img src={LOGO_URL} alt="Logo" className="logo" />}
          <span className="brand-text">{t('site.name')}</span>
        </NavLink>
        <nav className="main-nav">
          <NavLink to="/" end className={navClass}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/gallery" className={navClass}>
            {t('nav.gallery')}
          </NavLink>
          <NavLink to="/events" className={navClass}>
            {t('nav.events')}
          </NavLink>
          <NavLink to="/contact" className={navClass}>
            {t('nav.contact')}
          </NavLink>
          <NavLink to="/committee" className={navClass}>
            {t('nav.committee')}
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link nav-link-admin active' : 'nav-link nav-link-admin')}>
            {t('nav.admin')}
          </NavLink>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
