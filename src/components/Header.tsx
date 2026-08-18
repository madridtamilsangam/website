import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LOGO_URL as logoUrl } from '../services/config'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')

export default function Header() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to="/" end className="brand">
          {logoUrl && <img src={logoUrl} alt="Logo" className="logo" />}
          <div className="brand-text-wrapper">
            <span className="brand-text">{t('site.name')}</span>
            <span className="brand-subtitle">Asociación de Tamil</span>
          </div>
        </NavLink>
        <nav className="main-nav">
          <NavLink to="/" end className={navClass}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/about" className={navClass}>
            {t('nav.about')}
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
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
