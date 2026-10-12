import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  acceptReply,
  deleteDiscussion,
  deleteReply,
  editDiscussion,
  editReply,
  getDiscussion,
  pinDiscussion,
  replyToDiscussion,
  reportDiscussionItem,
  setDiscussionStatus,
  setDiscussionVisibility,
} from '../services/api'
import type { DiscussionDetail, DiscussionReply, DiscussionStatus } from '../types/api'
import { useDiscussionsAuth } from '../hooks/useDiscussionsAuth'
import { useDiscussionTopics } from '../hooks/useDiscussionTopics'
import { formatDateTime } from '../utils/time'
import { MAX_TITLE, MAX_BODY } from '../utils/discussionLimits'
import DiscussionBody from '../components/DiscussionBody'
import GoogleSignInButton from '../components/GoogleSignInButton'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import './Discussions.css'

function Avatar({ name, picture }: { name: string; picture?: string }) {
  if (picture && picture.startsWith('https://')) {
    return <img className="avatar" src={picture} alt="" referrerPolicy="no-referrer" loading="lazy" />
  }
  return (
    <span className="avatar avatar-fallback" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

interface ReplyItemProps {
  reply: DiscussionReply
  canAccept: boolean
  isAdmin: boolean
  signedIn: boolean
  busy: boolean
  locale: string
  onEdit: (reply: DiscussionReply, body: string) => Promise<void>
  onDelete: (reply: DiscussionReply) => void
  onAccept: (reply: DiscussionReply) => void
  onToggleHidden: (reply: DiscussionReply) => void
  onReport: (reply: DiscussionReply) => void
}

function ReplyItem({
  reply,
  canAccept,
  isAdmin,
  signedIn,
  busy,
  locale,
  onEdit,
  onDelete,
  onAccept,
  onToggleHidden,
  onReport,
}: ReplyItemProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.body)

  const save = async () => {
    await onEdit(reply, draft)
    setEditing(false)
  }

  return (
    <li className={`discussion-reply${reply.isAccepted ? ' accepted' : ''}${reply.hidden ? ' is-hidden' : ''}`}>
      <div className="discussion-author">
        <Avatar name={reply.authorName} picture={reply.authorPicture} />
        <div>
          <strong>{reply.authorName}</strong>
          <span className="discussion-time">
            {formatDateTime(reply.createdAt, locale)}
            {reply.editedAt && ` · ${t('discussions.edited')}`}
          </span>
        </div>
        {reply.isAccepted && <span className="status-chip status-resolved">✔ {t('discussions.acceptedAnswer')}</span>}
        {reply.hidden && <span className="status-chip status-closed">{t('discussions.hiddenBadge')}</span>}
      </div>

      {editing ? (
        <div className="discussion-edit">
          <textarea rows={5} value={draft} maxLength={MAX_BODY} onChange={(e) => setDraft(e.target.value)} />
          <div className="discussion-actions">
            <button type="button" className="button" disabled={busy || !draft.trim()} onClick={save}>
              {t('discussions.save')}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setEditing(false)}>
              {t('discussions.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <DiscussionBody text={reply.body} />
      )}

      {!editing && signedIn && (
        <div className="discussion-actions">
          {canAccept && !reply.hidden && (
            <button type="button" className="link-button" disabled={busy} onClick={() => onAccept(reply)}>
              {reply.isAccepted ? t('discussions.unaccept') : t('discussions.accept')}
            </button>
          )}
          {reply.canEdit && (
            <>
              <button type="button" className="link-button" onClick={() => { setDraft(reply.body); setEditing(true) }}>
                {t('discussions.edit')}
              </button>
              <button type="button" className="link-button" disabled={busy} onClick={() => onDelete(reply)}>
                {t('discussions.delete')}
              </button>
            </>
          )}
          {isAdmin && (
            <button type="button" className="link-button" disabled={busy} onClick={() => onToggleHidden(reply)}>
              {reply.hidden ? t('discussions.unhide') : t('discussions.hide')}
            </button>
          )}
          {!reply.canEdit && (
            <button type="button" className="link-button" disabled={busy} onClick={() => onReport(reply)}>
              {t('discussions.report')}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default function DiscussionThread() {
  const { threadId = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { labelFor } = useDiscussionTopics()
  const { profile, idToken, buttonRef, signOut } = useDiscussionsAuth()

  const [detail, setDetail] = useState<DiscussionDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [replyText, setReplyText] = useState('')
  const [editingThread, setEditingThread] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    getDiscussion(threadId, idToken)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [threadId, idToken, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // Runs a write action with the current token, then refreshes the thread.
  const run = useCallback(
    async (action: (token: string) => Promise<unknown>): Promise<boolean> => {
      if (!idToken) return false
      setBusy(true)
      setActionError(null)
      try {
        await action(idToken)
        reload()
        return true
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err))
        return false
      } finally {
        setBusy(false)
      }
    },
    [idToken, reload],
  )

  if (loadError && !detail) {
    return (
      <section className="page discussions-page">
        <p>
          <Link to="/discussions">← {t('discussions.backToList')}</Link>
        </p>
        <ErrorMessage message={loadError} />
      </section>
    )
  }
  if (!detail) return <Loading />

  const { thread, replies } = detail
  const isAdmin = !!detail.viewerIsAdmin
  const signedIn = !!idToken
  const canManageThread = !!thread.canEdit
  const closed = thread.status === 'closed'
  const canReply = signedIn && (!closed || isAdmin)

  const setStatus = (status: DiscussionStatus) => run((token) => setDiscussionStatus(token, thread.id, status))

  const submitReply = async (event: FormEvent) => {
    event.preventDefault()
    const text = replyText.trim()
    if (!text) return
    if (await run((token) => replyToDiscussion(token, thread.id, text))) setReplyText('')
  }

  const report = async (type: 'thread' | 'reply', id: string) => {
    const reason = window.prompt(t('discussions.reportPrompt'))
    if (!reason || !reason.trim()) return
    if (await run((token) => reportDiscussionItem(token, type, id, reason.trim()))) {
      window.alert(t('discussions.reportThanks'))
    }
  }

  const saveThread = async () => {
    const ok = await run((token) =>
      editDiscussion(token, thread.id, { title: draftTitle.trim(), body: draftBody.trim() }),
    )
    if (ok) setEditingThread(false)
  }

  return (
    <section className="page discussions-page discussion-thread">
      <p>
        <Link to="/discussions">← {t('discussions.backToList')}</Link>
      </p>

      <article className={`discussion-post${thread.hidden ? ' is-hidden' : ''}`}>
        <div className="recent-discussion-meta">
          <span className="topic-chip">{labelFor(thread.topic)}</span>
          <span className={`status-chip status-${thread.status}`}>{t(`discussions.status.${thread.status}`)}</span>
          {thread.pinned && <span className="status-chip">📌 {t('discussions.pinned')}</span>}
          {thread.hidden && <span className="status-chip status-closed">{t('discussions.hiddenBadge')}</span>}
        </div>

        {editingThread ? (
          <div className="discussion-edit">
            <input type="text" value={draftTitle} maxLength={MAX_TITLE} onChange={(e) => setDraftTitle(e.target.value)} />
            <textarea rows={8} value={draftBody} maxLength={MAX_BODY} onChange={(e) => setDraftBody(e.target.value)} />
            <div className="discussion-actions">
              <button type="button" className="button" disabled={busy || !draftTitle.trim() || !draftBody.trim()} onClick={saveThread}>
                {t('discussions.save')}
              </button>
              <button type="button" className="button button-secondary" onClick={() => setEditingThread(false)}>
                {t('discussions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="discussion-title">{thread.title}</h1>
            <div className="discussion-author">
              <Avatar name={thread.authorName} picture={thread.authorPicture} />
              <div>
                <strong>{thread.authorName}</strong>
                <span className="discussion-time">{formatDateTime(thread.createdAt, i18n.language)}</span>
              </div>
            </div>
            <DiscussionBody text={thread.body} />
          </>
        )}

        {signedIn && !editingThread && (
          <div className="discussion-actions">
            {canManageThread && (
              <>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setDraftTitle(thread.title)
                    setDraftBody(thread.body)
                    setEditingThread(true)
                  }}
                >
                  {t('discussions.edit')}
                </button>
                <button
                  type="button"
                  className="link-button"
                  disabled={busy || (closed && !isAdmin)}
                  onClick={() => setStatus(thread.status === 'resolved' ? 'open' : 'resolved')}
                >
                  {thread.status === 'resolved' ? t('discussions.reopen') : t('discussions.markResolved')}
                </button>
                <button
                  type="button"
                  className="link-button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(t('discussions.confirmDelete'))) return
                    if (await run((token) => deleteDiscussion(token, thread.id))) navigate('/discussions')
                  }}
                >
                  {t('discussions.delete')}
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <button type="button" className="link-button" disabled={busy} onClick={() => run((token) => pinDiscussion(token, thread.id, !thread.pinned))}>
                  {thread.pinned ? t('discussions.unpin') : t('discussions.pin')}
                </button>
                <button type="button" className="link-button" disabled={busy} onClick={() => setStatus(closed ? 'open' : 'closed')}>
                  {closed ? t('discussions.reopen') : t('discussions.close')}
                </button>
                <button type="button" className="link-button" disabled={busy} onClick={() => run((token) => setDiscussionVisibility(token, 'thread', thread.id, !!thread.hidden))}>
                  {thread.hidden ? t('discussions.unhide') : t('discussions.hide')}
                </button>
              </>
            )}
            {!canManageThread && (
              <button type="button" className="link-button" disabled={busy} onClick={() => report('thread', thread.id)}>
                {t('discussions.report')}
              </button>
            )}
          </div>
        )}
      </article>

      {canManageThread && !editingThread && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={!!thread.notifyAuthor}
            disabled={busy}
            onChange={(e) => run((token) => editDiscussion(token, thread.id, { notifyAuthor: e.target.checked }))}
          />
          {t('discussions.notifyLabel')}
        </label>
      )}

      {actionError && <ErrorMessage message={actionError} />}

      <h2 className="discussion-replies-title">{t('discussions.replies', { count: replies.length })}</h2>
      {replies.length === 0 ? (
        <p className="empty-text">{t('discussions.noReplies')}</p>
      ) : (
        <ul className="discussion-replies">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              canAccept={canManageThread}
              isAdmin={isAdmin}
              signedIn={signedIn}
              busy={busy}
              locale={i18n.language}
              onEdit={async (r, body) => {
                await run((token) => editReply(token, r.id, body.trim()))
              }}
              onDelete={async (r) => {
                if (window.confirm(t('discussions.confirmDelete'))) await run((token) => deleteReply(token, r.id))
              }}
              onAccept={(r) => run((token) => acceptReply(token, thread.id, r.id, !r.isAccepted))}
              onToggleHidden={(r) => run((token) => setDiscussionVisibility(token, 'reply', r.id, !!r.hidden))}
              onReport={(r) => report('reply', r.id)}
            />
          ))}
        </ul>
      )}

      <div className="discussion-composer">
        {!profile ? (
          <div className="discussion-signin">
            <p>{t('discussions.signInToReply')}</p>
            <GoogleSignInButton buttonRef={buttonRef} />
          </div>
        ) : closed && !isAdmin ? (
          <p className="empty-text">{t('discussions.closedNotice')}</p>
        ) : canReply ? (
          <form className="discussion-form" onSubmit={submitReply}>
            <p className="discussion-privacy">
              {t('discussions.signedInAs', { name: profile.name })}{' '}
              <button type="button" className="link-button" onClick={signOut}>
                {t('events.signOut')}
              </button>
            </p>
            <label>
              {t('discussions.yourReply')}
              <textarea rows={5} value={replyText} maxLength={MAX_BODY} onChange={(e) => setReplyText(e.target.value)} required />
              <span className="char-count">
                {replyText.length}/{MAX_BODY}
              </span>
            </label>
            <button type="submit" className="button" disabled={busy || !replyText.trim()}>
              {busy ? t('discussions.posting') : t('discussions.postReply')}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  )
}
