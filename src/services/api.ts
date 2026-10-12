import { APPS_SCRIPT_URL } from './config'
import type {
  CommitteeData,
  ContactEntry,
  EventForm,
  FooterData,
  GalleryFolder,
  GalleryPhoto,
  HomeItem,
  HighlightItem,
  YouTubeVideo,
  AboutUsData,
  PdfContent,
  SponsorItem,
  DiscussionTopic,
  DiscussionThread,
  DiscussionListResult,
  DiscussionDetail,
  DiscussionStatus,
} from '../types/api'

interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: string
}

// Simple in-memory response cache so re-visiting a page (or React StrictMode's
// double-invoke in dev) doesn't spam the Apps Script backend. The backend also
// caches independently via CacheService, so this is just an extra client-side layer.
const cache = new Map<string, { expires: number; promise: Promise<unknown> }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function request<T>(
  action: string,
  params: Record<string, string> = {},
  options: { noCache?: boolean } = {},
): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL is not configured. See .env.example / SETUP.md.')
  }

  const url = new URL(APPS_SCRIPT_URL)
  url.searchParams.set('action', action)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const cacheKey = url.toString()

  if (options.noCache) {
    return fetchEnvelope<T>(cacheKey)
  }

  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.promise as Promise<T>
  }

  const promise = fetchEnvelope<T>(cacheKey).catch((err) => {
    cache.delete(cacheKey) // never cache failures
    throw err
  })

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, promise })
  return promise as Promise<T>
}

async function fetchEnvelope<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
  }
  const body = (await res.json()) as ApiEnvelope<T>
  if (!body.ok) {
    throw new Error(body.error ?? 'Unknown API error')
  }
  return body.data as T
}

// Writes (Discussions only). Sent as text/plain so the browser skips the CORS
// preflight that Apps Script cannot answer; the body is still JSON.
async function post<T>(action: string, idToken: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL is not configured. See .env.example / SETUP.md.')
  }
  const data = await fetchEnvelope<T>(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, idToken, ...payload }),
  })
  return data
}

export function getHome() {
  return request<HomeItem[]>('home')
}

export function getGalleryFolders() {
  return request<GalleryFolder[]>('gallery')
}

export function getGalleryPhotos(folderId: string) {
  return request<GalleryPhoto[]>('gallery-photos', { id: folderId })
}

export function getEvents() {
  return request<EventForm[]>('events')
}

export function getEventPrefillUrl(formId: string, name: string, email: string) {
  return request<{ url: string }>('prefill-url', { formId, name, email })
}

export function getContact() {
  return request<ContactEntry[]>('contact')
}

export function getCommittee() {
  return request<CommitteeData>('committee')
}

export function getFooter() {
  return request<FooterData>('footer')
}

export function getHighlights() {
  return request<HighlightItem[]>('highlights')
}

export function getYouTubeVideos() {
  return request<YouTubeVideo[]>('youtube')
}

export function getAboutUs() {
  return request<AboutUsData>('aboutus')
}

export function getPdfContent(fileId: string) {
  return request<PdfContent>('pdf-content', { id: fileId })
}

export function getSponsors() {
  return request<SponsorItem[]>('sponsors')
}

// ---- Discussions (reads bypass the client cache; the backend caches for ~60s) ----
export function getDiscussionTopics() {
  return request<DiscussionTopic[]>('discussion-topics')
}

export function getRecentDiscussions(limit = 6) {
  return request<DiscussionThread[]>('discussions-recent', { limit: String(limit) }, { noCache: true })
}

export interface DiscussionQuery {
  topic?: string
  sort?: 'activity' | 'newest' | 'unanswered'
  q?: string
  page?: number
  pageSize?: number
}

export function getDiscussions(query: DiscussionQuery = {}) {
  const params: Record<string, string> = {}
  if (query.topic) params.topic = query.topic
  if (query.sort) params.sort = query.sort
  if (query.q) params.q = query.q
  if (query.page) params.page = String(query.page)
  if (query.pageSize) params.pageSize = String(query.pageSize)
  return request<DiscussionListResult>('discussions', params, { noCache: true })
}

// With a token the backend also returns per-viewer permissions (canEdit, hidden items for admins).
export function getDiscussion(threadId: string, idToken?: string | null) {
  if (idToken) return post<DiscussionDetail>('get-thread', idToken, { threadId })
  return request<DiscussionDetail>('discussion', { id: threadId }, { noCache: true })
}

export function createDiscussion(
  idToken: string,
  input: { topic: string; title: string; body: string; notifyAuthor: boolean },
) {
  return post<{ id: string }>('create-thread', idToken, input)
}

export function replyToDiscussion(idToken: string, threadId: string, body: string) {
  return post<{ id: string }>('reply', idToken, { threadId, body })
}

export function editDiscussion(
  idToken: string,
  threadId: string,
  changes: { title?: string; body?: string; topic?: string; notifyAuthor?: boolean },
) {
  return post<{ ok: true }>('edit-thread', idToken, { threadId, ...changes })
}

export function editReply(idToken: string, replyId: string, body: string) {
  return post<{ ok: true }>('edit-reply', idToken, { replyId, body })
}

export function deleteDiscussion(idToken: string, threadId: string) {
  return post<{ ok: true }>('delete-thread', idToken, { threadId })
}

export function deleteReply(idToken: string, replyId: string) {
  return post<{ ok: true }>('delete-reply', idToken, { replyId })
}

export function setDiscussionStatus(idToken: string, threadId: string, status: DiscussionStatus) {
  return post<{ ok: true }>('set-status', idToken, { threadId, status })
}

export function acceptReply(idToken: string, threadId: string, replyId: string, accepted: boolean) {
  return post<{ ok: true }>('accept-reply', idToken, { threadId, replyId, accepted })
}

export function pinDiscussion(idToken: string, threadId: string, pinned: boolean) {
  return post<{ ok: true }>('pin', idToken, { threadId, pinned })
}

export function setDiscussionVisibility(
  idToken: string,
  targetType: 'thread' | 'reply',
  targetId: string,
  visible: boolean,
) {
  return post<{ ok: true }>('set-visibility', idToken, { targetType, targetId, visible })
}

export function reportDiscussionItem(
  idToken: string,
  targetType: 'thread' | 'reply',
  targetId: string,
  reason: string,
) {
  return post<{ ok: true }>('report', idToken, { targetType, targetId, reason })
}
