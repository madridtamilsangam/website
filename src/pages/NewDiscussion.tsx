import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { createDiscussion } from '../services/api'
import { useDiscussionsAuth } from '../hooks/useDiscussionsAuth'
import { useDiscussionTopics } from '../hooks/useDiscussionTopics'
import GoogleSignInButton from '../components/GoogleSignInButton'
import ErrorMessage from '../components/ErrorMessage'
import { MAX_TITLE, MAX_BODY } from '../utils/discussionLimits'
import './Discussions.css'

export default function NewDiscussion() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idToken, buttonRef, signOut } = useDiscussionsAuth()
  const { topics, labelFor } = useDiscussionTopics()

  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [notifyAuthor, setNotifyAuthor] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!topic && topics.length > 0) setTopic(topics[0].key)
  }, [topics, topic])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!idToken || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { id } = await createDiscussion(idToken, {
        topic,
        title: title.trim(),
        body: body.trim(),
        notifyAuthor,
      })
      navigate(`/discussions/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <section className="page discussions-page">
      <p>
        <Link to="/discussions">← {t('discussions.backToList')}</Link>
      </p>
      <h1>{t('discussions.newTitle')}</h1>

      {!profile ? (
        <div className="discussion-signin">
          <p>{t('discussions.signInPrompt')}</p>
          <GoogleSignInButton buttonRef={buttonRef} />
        </div>
      ) : (
        <form className="discussion-form" onSubmit={onSubmit}>
          <p className="discussion-privacy">
            {t('discussions.signedInAs', { name: profile.name })}{' '}
            <button type="button" className="link-button" onClick={signOut}>
              {t('events.signOut')}
            </button>
            <br />
            {t('discussions.privacyNotice')}
          </p>

          <label>
            {t('discussions.topicLabel')}
            <select value={topic} onChange={(e) => setTopic(e.target.value)} required>
              {topics.map((tp) => (
                <option key={tp.key} value={tp.key}>
                  {labelFor(tp.key)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('discussions.titleLabel')}
            <input
              type="text"
              value={title}
              maxLength={MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <span className="char-count">
              {title.length}/{MAX_TITLE}
            </span>
          </label>

          <label>
            {t('discussions.bodyLabel')}
            <textarea
              rows={8}
              value={body}
              maxLength={MAX_BODY}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <span className="char-count">
              {body.length}/{MAX_BODY}
            </span>
          </label>

          <label className="checkbox-label">
            <input type="checkbox" checked={notifyAuthor} onChange={(e) => setNotifyAuthor(e.target.checked)} />
            {t('discussions.notifyLabel')}
          </label>

          {error && <ErrorMessage message={error} />}

          <button type="submit" className="button" disabled={submitting || !title.trim() || !body.trim() || !topic}>
            {submitting ? t('discussions.posting') : t('discussions.post')}
          </button>
        </form>
      )}
    </section>
  )
}
