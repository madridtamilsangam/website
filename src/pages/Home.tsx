import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getHome } from '../services/api'
import { LOGO_URL } from '../services/config'
import type { HomeItem } from '../types/api'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'

export default function Home() {
  const { t } = useTranslation()
  const [items, setItems] = useState<HomeItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getHome()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorMessage message={error} />
  if (!items) return <Loading />

  return (
    <section className="page home-page">
      {LOGO_URL && (
        <div className="home-hero">
          <img src={LOGO_URL} alt="Organization Logo" className="hero-logo" />
        </div>
      )}
      <h1>{t('home.title')}</h1>
      {items.length === 0 && <p>{t('home.empty')}</p>}
      <div className="card-grid">
        {items.map((item, index) => (
          <article className="card" key={`${item.name}-${index}`}>
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} loading="lazy" />}
            <h2>{item.name}</h2>
            <p>{item.details}</p>
          </article>
        ))}
      </div>

      <div className="form-container">
        <h2>{t('home.registration')}</h2>
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSfuQ9I8w5GJLxDbtDBNCcjv-vSD6_k3kLfpZHrgacx2wEASSQ/viewform?embedded=true"
          width="100%"
          height="600"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          className="embedded-form"
          title="Registration Form"
        >
          Loading…
        </iframe>
      </div>
    </section>
  )
}
