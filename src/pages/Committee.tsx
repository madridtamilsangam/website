import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCommittee } from '../services/api'
import type { CommitteeData } from '../types/api'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import './Committee.css'

export default function Committee() {
  const { t } = useTranslation()
  const [data, setData] = useState<CommitteeData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCommittee()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorMessage message={error} />
  if (!data) return <Loading />

  if (data.years.length === 0) {
    return (
      <section className="page committee-page">
        <h1>{t('committee.title')}</h1>
        <p>{t('committee.empty')}</p>
      </section>
    )
  }

  return (
    <section className="page committee-page">
      <h1>{t('committee.title')}</h1>

      {data.years.map((yearGroup) => (
        <div key={yearGroup.year} className="year-section">
          <h2 className="year-heading">{t('committee.year', { year: yearGroup.year })}</h2>
          <div className="member-grid">
            {yearGroup.members.map((member, idx) => (
              <article key={`${member.name}-${idx}`} className="member-card">
                {member.imageUrl && (
                  <img src={member.imageUrl} alt={member.name} className="member-photo" />
                )}
                <div className="member-info">
                  <h3 className="member-name">{member.name}</h3>
                  {member.role && <p className="member-role">{member.role}</p>}
                  <div className="member-contact">
                    {member.email && (
                      <a href={`mailto:${member.email}`} title="Email">
                        {member.email}
                      </a>
                    )}
                    {member.email && member.phone && <span className="separator">·</span>}
                    {member.phone && (
                      <a href={`tel:${member.phone}`} title="Phone">
                        {member.phone}
                      </a>
                    )}
                  </div>
                  {member.socialLinks && Object.keys(member.socialLinks).length > 0 && (
                    <div className="member-socials">
                      {Object.entries(member.socialLinks).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`social-icon social-${platform.toLowerCase()}`}
                          title={platform}
                          aria-label={`${member.name}'s ${platform}`}
                        >
                          {getSocialIcon(platform)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

// Helper function to return icon/text for each social platform
function getSocialIcon(platform: string): string {
  const icons: Record<string, string> = {
    facebook: 'f',
    instagram: '📷',
    linkedin: 'in',
    twitter: '𝕏',
    github: '⚙',
    youtube: '▶',
    whatsapp: '💬',
    email: '✉',
    website: '🌐',
  }
  return icons[platform.toLowerCase()] || platform.charAt(0).toUpperCase()
}
