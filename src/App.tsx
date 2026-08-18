import { HashRouter, Routes, Route } from 'react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Header from './components/Header'
import Home from './pages/Home'
import About from './pages/About'
import Gallery from './pages/Gallery'
import Events from './pages/Events'
import Contact from './pages/Contact'
import Committee from './pages/Committee'
import Admin from './pages/Admin'
import Registration from './pages/Registration'
import { getFooter } from './services/api'
import type { FooterData } from './types/api'
import { LOGO_URL as logoUrl } from './services/config'
import './App.css'

function Footer() {
  const { t } = useTranslation()
  const [footerData, setFooterData] = useState<FooterData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getFooter()
      .then((data) => {
        if (!cancelled) setFooterData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <footer className="app-footer">
        <div className="footer-content">
          <p style={{ color: '#dc2626', fontSize: '14px' }}>{t('common.error')}</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="app-footer">
      <div className="footer-content footer-grid">
        {/* Column 1: Logo, Name & About Description */}
        <div className="footer-section footer-brand-col">
          {logoUrl && <img src={logoUrl} alt="Logo" className="footer-logo" />}
          <h3>{t('site.name')}</h3>
          <p className="footer-about-text">Asociación de Tamil</p>
        </div>

        {/* Column 2: Links */}
        <div className="footer-section">
          <h4>{t('footer.navigation')}</h4>
          <nav className="footer-nav">
            <a href="#/" className="footer-nav-link">
              {t('nav.home')}
            </a>
            <a href="#/about" className="footer-nav-link">
              {t('nav.about')}
            </a>
            <a href="#/gallery" className="footer-nav-link">
              {t('nav.gallery')}
            </a>
            <a href="#/events" className="footer-nav-link">
              {t('nav.events')}
            </a>
            <a href="#/contact" className="footer-nav-link">
              {t('nav.contact')}
            </a>
            <a href="#/committee" className="footer-nav-link">
              {t('nav.committee')}
            </a>
          </nav>
        </div>

        {/* Column 3: Contact */}
        {(footerData?.contact?.address || footerData?.contact?.phone || footerData?.contact?.email) && (
          <div className="footer-section">
            <h4>{t('footer.contact')}</h4>
            <div className="footer-contact">
              {footerData.contact.address && (
                <div className="contact-item">
                  <span className="contact-icon">📍</span>
                  <span>{footerData.contact.address}</span>
                </div>
              )}
              {footerData.contact.phone && (
                <div className="contact-item">
                  <a href={`tel:${footerData.contact.phone}`} title="Call">
                    <span className="contact-icon">📞</span>
                    <span>{footerData.contact.phone}</span>
                  </a>
                </div>
              )}
              {footerData.contact.email && (
                <div className="contact-item">
                  <a href={`mailto:${footerData.contact.email}`} title="Email">
                    <span className="contact-icon">✉️</span>
                    <span>{footerData.contact.email}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Column 4: Follow Us */}
        {footerData?.socials && Object.keys(footerData.socials).length > 0 && (
          <div className="footer-section">
            <h4>{t('footer.followUs')}</h4>
            <div className="footer-social-links">
              {Object.entries(footerData.socials).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social-link social-${platform.toLowerCase()}`}
                  title={platform}
                  aria-label={`Visit our ${platform} page`}
                >
                  <span>{getSocialIcon(platform)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="footer-bottom">
        <p>
          &copy; {new Date().getFullYear()} {t('site.name')}. {t('footer.allRightsReserved')}
        </p>
      </div>
    </footer>
  )
}

// Helper function to return icon for each social platform
function getSocialIcon(platform: string): string {
  const icons: Record<string, string> = {
    facebook: 'f',
    instagram: '📷',
    linkedin: 'in',
    twitter: '𝕏',
    github: '⚙',
    youtube: '▶',
    whatsapp: '💬',
    email: '✉',
    website: '🌐',
  }
  return icons[platform.toLowerCase()] || platform.charAt(0).toUpperCase()
}

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/:folderId" element={<Gallery />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:formId" element={<Events />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/committee" element={<Committee />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}

export default App
