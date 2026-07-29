import { useTranslation } from 'react-i18next'

export default function ErrorMessage({ message }: { message: string }) {
  const { t } = useTranslation()
  return (
    <p className="status status-error" role="alert">
      {t('common.error')}: {message}
    </p>
  )
}
