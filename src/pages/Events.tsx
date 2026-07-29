import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getEventPrefillUrl, getEvents } from '../services/api'
import type { EventForm } from '../types/api'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'

function EventFormPanel({ form }: { form: EventForm }) {
  const { t } = useTranslation()
  const { profile, buttonRef, signOut } = useGoogleSignIn('visitor-google-profile')
  const [prefillUrl, setPrefillUrl] = useState<string | null>(null)
  const [prefillError, setPrefillError] = useState<string | null>(null)

  useEffect(() => {
    setPrefillUrl(null)
    setPrefillError(null)
    if (!profile) return
    let cancelled = false
    getEventPrefillUrl(form.id, profile.name, profile.email)
      .then((res) => {
        if (!cancelled) setPrefillUrl(res.url)
      })
      .catch((err) => {
        if (!cancelled) setPrefillError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [profile, form.id])

  return (
    <div className="event-form-panel">
      <h2>{form.title}</h2>
      {!profile ? (
        <>
          <p>{t('events.signInPrompt')}</p>
          <GoogleSignInButton buttonRef={buttonRef} />
        </>
      ) : (
        <>
          <p>
            {t('events.signedInAs', { name: profile.name })}{' '}
            <button type="button" className="link-button" onClick={signOut}>
              {t('events.signOut')}
            </button>
          </p>
          {prefillError && <ErrorMessage message={prefillError} />}
          <a className="button" href={prefillUrl ?? form.formUrl} target="_blank" rel="noopener noreferrer">
            {t('events.openForm')}
          </a>
        </>
      )}
    </div>
  )
}

export default function Events() {
  const { t } = useTranslation()
  const { formId } = useParams()
  const [forms, setForms] = useState<EventForm[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEvents()
      .then((data) => {
        if (!cancelled) setForms(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorMessage message={error} />
  if (!forms) return <Loading />

  const selected = forms.find((form) => form.id === formId) ?? null

  return (
    <section className="page events-page">
      <h1>{t('events.title')}</h1>
      {forms.length === 0 && <p>{t('events.empty')}</p>}
      {forms.length > 0 && (
        <nav className="submenu">
          {forms.map((form) => (
            <Link
              key={form.id}
              to={`/events/${form.id}`}
              className={form.id === formId ? 'submenu-link active' : 'submenu-link'}
            >
              {form.title}
            </Link>
          ))}
        </nav>
      )}
      {selected && <EventFormPanel form={selected} key={selected.id} />}
    </section>
  )
}
