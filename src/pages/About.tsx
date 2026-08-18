import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAboutUs } from '../services/api'
import type { AboutUsData } from '../types/api'
import PDFViewer from '../components/PDFViewer'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import './About.css'

function renderContent(text: string) {
  const lines = text.split('\n').filter((line) => line.trim())

  if (lines.length <= 1) {
    return <p>{text}</p>
  }

  return (
    <ul className="content-bullets">
      {lines.map((line, idx) => (
        <li key={idx}>{line.trim()}</li>
      ))}
    </ul>
  )
}

export default function About() {
  const { t, i18n } = useTranslation()

  const [data, setData] = useState<AboutUsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAboutUs()
      .then((fetchedData) => {
        if (!cancelled) {
          setData(fetchedData)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className="page about-page">
        <Loading />
      </section>
    )
  }

  if (error) {
    return (
      <section className="page about-page">
        <ErrorMessage message={error} />
      </section>
    )
  }

  if (!data || data.sections.length === 0) {
    return (
      <section className="page about-page">
        <div className="about-container">
          <h1>{t('about.title')}</h1>
          <p className="empty-message">{t('about.empty')}</p>
        </div>
      </section>
    )
  }

  const isEnglish = i18n.language === 'en'

  return (
    <section className="page about-page">
      <div className="about-container">
        <h1>{t('about.title')}</h1>

        <div className="about-sections">
          {data.sections.map((section, idx) => (
            <article key={idx} className="about-section">
              {section.image_id && (
                <div className="section-image-wrapper">
                  <img
                    src={`https://drive.google.com/thumbnail?id=${section.image_id}&sz=w1000`}
                    alt={isEnglish ? section.en_title : section.ta_title}
                    className="section-image"
                  />
                </div>
              )}
              <div className="section-content">
                <h2 className="section-title">
                  {isEnglish ? section.en_title : section.ta_title}
                </h2>
                <div className="section-text">
                  {renderContent(isEnglish ? section.en_content : section.ta_content)}
                </div>
              </div>
            </article>
          ))}
        </div>

        {data.pdfFileId && (
          <div className="about-pdf-section">
            <h2>{isEnglish ? data.pdfTitle_en : data.pdfTitle_ta}</h2>
            <PDFViewer pdfFileId={data.pdfFileId} />
          </div>
        )}
      </div>
    </section>
  )
}
