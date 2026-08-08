import { useTranslation } from 'react-i18next'

export default function Registration() {
  const { t } = useTranslation()

  return (
    <section className="page">
      <h1>{t('nav.admin') === t('nav.admin') ? 'Register' : t('nav.admin')}</h1>
      
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
