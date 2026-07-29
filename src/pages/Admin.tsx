import { useTranslation } from 'react-i18next'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'
import { isAdminEmail } from '../services/config'
import { ADMIN_LINKS } from '../services/adminLinks'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Admin() {
  const { t } = useTranslation()
  const { profile, buttonRef, signOut } = useGoogleSignIn('admin-google-profile')

  if (!profile) {
    return (
      <section className="page admin-page">
        <h1>{t('admin.title')}</h1>
        <p>{t('admin.signInPrompt')}</p>
        <GoogleSignInButton buttonRef={buttonRef} />
      </section>
    )
  }

  if (!isAdminEmail(profile.email)) {
    return (
      <section className="page admin-page">
        <h1>{t('admin.title')}</h1>
        <p>{t('admin.notAuthorized', { email: profile.email })}</p>
        <button type="button" className="button" onClick={signOut}>
          {t('admin.signOut')}
        </button>
      </section>
    )
  }

  return (
    <section className="page admin-page">
      <h1>{t('admin.dashboardTitle')}</h1>
      <p>
        {t('admin.signedInAs', { name: profile.name })}{' '}
        <button type="button" className="link-button" onClick={signOut}>
          {t('admin.signOut')}
        </button>
      </p>
      <p className="admin-note">{t('admin.note')}</p>
      <ul className="admin-links">
        {ADMIN_LINKS.map((link) => (
          <li key={link.key}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {t(`admin.links.${link.key}`)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
