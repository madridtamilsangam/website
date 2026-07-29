import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getContact } from '../services/api'
import type { ContactEntry } from '../types/api'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'

export default function Contact() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<ContactEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getContact()
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorMessage message={error} />
  if (!entries) return <Loading />

  return (
    <section className="page contact-page">
      <h1>{t('contact.title')}</h1>
      {entries.length === 0 && <p>{t('contact.empty')}</p>}
      <div className="card-grid">
        {entries.map((entry, index) => (
          <article className="card contact-card" key={`${entry.name}-${index}`}>
            <h2>{entry.name}</h2>
            {entry.role && <p className="contact-role">{entry.role}</p>}
            {entry.phone && (
              <p>
                <a href={`tel:${entry.phone}`}>{entry.phone}</a>
              </p>
            )}
            {entry.email && (
              <p>
                <a href={`mailto:${entry.email}`}>{entry.email}</a>
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
