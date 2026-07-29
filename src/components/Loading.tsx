import { useTranslation } from 'react-i18next'

export default function Loading() {
  const { t } = useTranslation()
  return <p className="status status-loading">{t('common.loading')}</p>
}
