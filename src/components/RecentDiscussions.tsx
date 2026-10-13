import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getRecentDiscussions } from '../services/api'
import type { DiscussionThread } from '../types/api'
import { useDiscussionTopics } from '../hooks/useDiscussionTopics'
import { formatRelativeTime } from '../utils/time'
import '../pages/Discussions.css'

const RECENT_LIMIT = 6

export default function RecentDiscussions() {
  const { t, i18n } = useTranslation()
  const { labelFor } = useDiscussionTopics()
  const [threads, setThreads] = useState<DiscussionThread[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRecentDiscussions(RECENT_LIMIT)
      .then((data) => {
        if (!cancelled) setThreads(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="recent-discussions-block">
      <h2 className="subblock-title">{t('discussions.homeTitle')}</h2>

      <div className="discussions-panel">
        {error ? (
          <p className="error-text">{t('common.error')}</p>
        ) : threads === null ? (
          <p className="empty-text">{t('common.loading')}</p>
        ) : threads.length === 0 ? (
          <p className="empty-text">{t('discussions.empty')}</p>
        ) : (
          <ul className="recent-discussions">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Link to={`/discussions/${thread.id}`} className="recent-discussion-link">
                  <span className="recent-discussion-title">
                    {thread.pinned && <span aria-hidden="true">📌 </span>}
                    {thread.title}
                  </span>
                  <span className="recent-discussion-meta">
                    <span className="topic-chip">{labelFor(thread.topic)}</span>
                    {thread.status === 'resolved' && (
                      <span className="status-chip status-resolved">✔ {t('discussions.status.resolved')}</span>
                    )}
                    <span>{t('discussions.replies', { count: thread.replyCount })}</span>
                    <span>· {formatRelativeTime(thread.lastActivityAt, i18n.language)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="discussions-panel-actions">
          <Link to="/discussions" className="button button-secondary">
            {t('discussions.viewAll')}
          </Link>
          <Link to="/discussions/new" className="button">
            {t('discussions.ask')}
          </Link>
        </div>
      </div>
    </div>
  )
}
