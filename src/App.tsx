import { HashRouter, Routes, Route } from 'react-router'
import { useTranslation } from 'react-i18next'
import Header from './components/Header'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Events from './pages/Events'
import Contact from './pages/Contact'
import Committee from './pages/Committee'
import Admin from './pages/Admin'
import './App.css'

function Footer() {
  const { t } = useTranslation()
  const YOUTUBE_URL = 'https://www.youtube.com/channel/UCVg2vExlPnFA4_R5XWFN9CQ'
  
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>{t('site.name')}</h3>
          <p>{t('site.tagline') || 'Tamil Sangam'}</p>
        </div>
        <div className="footer-section">
          <h4>{t('footer.followUs') || 'Follow Us'}</h4>
          <div className="footer-links">
            <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="social-link youtube" title="YouTube">
              <span>YouTube</span>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          &copy; {new Date().getFullYear()} {t('site.name')}. {t('footer.allRightsReserved') || 'All rights reserved.'}
        </p>
      </div>
    </footer>
  )
}

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/:folderId" element={<Gallery />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:formId" element={<Events />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/committee" element={<Committee />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}

export default App
