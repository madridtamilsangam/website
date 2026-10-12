import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getDiscussions, type DiscussionQuery } from '../services/api'
import type { DiscussionListResult } from '../types/api'
import { useDiscussionTopics } from '../hooks/useDiscussionTopics'
import { formatRelativeTime } from '../utils/time'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import './Discussions.css'

const PAGE_SIZE = 10
const SORTS: NonNullable<DiscussionQuery['sort']>[] = ['activity', 'newest', 'unanswered']

export default function Discussions() {
  const { t, i18n } = useTranslation()
  const { topics, labelFor } = useDiscussionTopics()
  const [params, setParams] = useSearchParams()
  const topic = params.get('topic') ?? ''
  const q = params.get('q') ?? ''
  const sortParam = params.get('sort')
  const sort = SORTS.find((s) => s === sortParam) ?? 'activity'
  const page = Math.max(1, Number(params.get('page') || 1))

  const [searchText, setSearchText] = useState(q)
  const [result, setResult] = useState<DiscussionListResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    getDiscussions({ topic, q, sort, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [topic, q, sort, page])

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1

  return (
    <section className="page discussions-page">
      <div className="discussions-heading">
        <h1>{t('discussions.title')}</h1>
        <Link to="/discussions/new" className="button">
          {t('discussions.ask')}
        </Link>
      </div>

      <form
        className="discussions-toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: searchText.trim() })
        }}
      >
        <input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('discussions.searchPlaceholder')}
          aria-label={t('discussions.searchPlaceholder')}
        />
        <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label={t('discussions.sortLabel')}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`discussions.sort.${s}`)}
            </option>
          ))}
        </select>
      </form>

      <nav className="submenu" aria-label={t('discussions.topicLabel')}>
        <button
          type="button"
          className={topic === '' ? 'submenu-link active' : 'submenu-link'}
          onClick={() => update({ topic: '' })}
        >
          {t('discussions.allTopics')}
        </button>
        {topics.map((tp) => (
          <button
            key={tp.key}
            type="button"
            className={topic === tp.key ? 'submenu-link active' : 'submenu-link'}
            onClick={() => update({ topic: tp.key })}
          >
            {labelFor(tp.key)}
          </button>
        ))}
      </nav>

      {error ? (
        <ErrorMessage message={error} />
      ) : !result ? (
        <Loading />
      ) : result.threads.length === 0 ? (
        <p className="empty-text">{t('discussions.empty')}</p>
      ) : (
        <>
          <ul className="discussion-list">
            {result.threads.map((thread) => (
              <li key={thread.id} className="discussion-list-item">
                <Link to={`/discussions/${thread.id}`} className="discussion-list-link">
                  <span className="discussion-list-title">
                    {thread.pinned && <span aria-hidden="true">📌 </span>}
                    {thread.title}
                  </span>
                  <span className="discussion-list-excerpt">{thread.body}</span>
                  <span className="recent-discussion-meta">
                    <span className="topic-chip">{labelFor(thread.topic)}</span>
                    <span className={`status-chip status-${thread.status}`}>
                      {t(`discussions.status.${thread.status}`)}
                    </span>
                    <span>{thread.authorName}</span>
                    <span>· {t('discussions.replies', { count: thread.replyCount })}</span>
                    <span>· {formatRelativeTime(thread.lastActivityAt, i18n.language)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="gallery-pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={result.page <= 1}
                onClick={() => update({ page: String(result.page - 1) })}
              >
                ← {t('common.previous')}
              </button>
              <span className="pagination-info">
                {t('common.page')} {result.page} {t('common.of')} {totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                disabled={result.page >= totalPages}
                onClick={() => update({ page: String(result.page + 1) })}
              >
                {t('common.next')} →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
