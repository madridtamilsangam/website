import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

export default function RegistrationCta() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="home-hero-cta home-registration-cta">
      <div className="cta-content">
        <h2 className="cta-heading">{t('home.cta_headline')}</h2>
        <p className="cta-subtitle">{t('home.cta_subtitle')}</p>
        <button onClick={() => navigate('/registration')} className="cta-button">
          {t('home.cta_button')}
        </button>
      </div>
    </div>
  )
}
