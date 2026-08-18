import { APPS_SCRIPT_URL } from './config'
import type { CommitteeData, ContactEntry, EventForm, FooterData, GalleryFolder, GalleryPhoto, HomeItem, HighlightItem, YouTubeVideo, AboutUsData, PdfContent } from '../types/api'

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

async function request<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL is not configured. See .env.example / SETUP.md.')
  }

  const url = new URL(APPS_SCRIPT_URL)
  url.searchParams.set('action', action)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const cacheKey = url.toString()

  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.promise as Promise<T>
  }

  const promise = fetch(cacheKey)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }
      const body = (await res.json()) as ApiEnvelope<T>
      if (!body.ok) {
        throw new Error(body.error ?? 'Unknown API error')
      }
      return body.data as T
    })
    .catch((err) => {
      cache.delete(cacheKey) // never cache failures
      throw err
    })

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, promise })
  return promise as Promise<T>
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
