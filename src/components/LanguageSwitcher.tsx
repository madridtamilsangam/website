import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'ta', labelKey: 'language.tamil' },
  { code: 'en', labelKey: 'language.english' },
] as const

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <div className="language-switcher" role="group" aria-label={t('language.switcherLabel')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={i18n.language.startsWith(lang.code) ? 'lang-btn active' : 'lang-btn'}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {t(lang.labelKey)}
        </button>
      ))}
    </div>
  )
}
