import { HashRouter, Routes, Route } from 'react-router'
import { useTranslation } from 'react-i18next'
import Header from './components/Header'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Events from './pages/Events'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import './App.css'

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="app-footer">
      <p>
        &copy; {new Date().getFullYear()} {t('site.name')}
      </p>
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
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}

export default App
