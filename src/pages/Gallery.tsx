import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { getGalleryFolders, getGalleryPhotos } from '../services/api'
import type { GalleryFolder, GalleryPhoto } from '../types/api'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'

export default function Gallery() {
  const { t } = useTranslation()
  const { folderId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [folders, setFolders] = useState<GalleryFolder[] | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getGalleryFolders()
      .then((data) => {
        if (cancelled) return
        setFolders(data)
        if (!folderId && data.length > 0) {
          navigate(`/gallery/${data[0].id}`, { replace: true })
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [folderId, navigate])

  useEffect(() => {
    if (!folderId) return
    let cancelled = false
    setPhotos(null)
    setLightboxIndex(null)
    getGalleryPhotos(folderId)
      .then((data) => {
        if (!cancelled) {
          setPhotos(data)
          
          // Auto-open lightbox if photoId is provided in query params
          const photoId = searchParams.get('photo')
          if (photoId) {
            const index = data.findIndex(p => p.id === photoId)
            if (index !== -1) {
              setLightboxIndex(index)
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [folderId, searchParams])

  if (error) return <ErrorMessage message={error} />
  if (!folders) return <Loading />

  return (
    <section className="page gallery-page">
      <h1>{t('gallery.title')}</h1>
      {folders.length === 0 && <p>{t('gallery.empty')}</p>}
      {folders.length > 0 && (
        <nav className="submenu">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              to={`/gallery/${folder.id}`}
              className={folder.id === folderId ? 'submenu-link active' : 'submenu-link'}
            >
              {folder.name}
            </Link>
          ))}
        </nav>
      )}

      {folderId && !photos && <Loading />}

      {photos && (
        <>
          {photos.length === 0 && <p>{t('gallery.noPhotos')}</p>}
          <div className="photo-grid">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="photo-thumb"
                onClick={() => setLightboxIndex(index)}
                aria-label={photo.name}
              >
                <img src={photo.url} alt={photo.name} loading="lazy" />
              </button>
            ))}
          </div>
          <Lightbox
            open={lightboxIndex !== null}
            index={lightboxIndex ?? 0}
            close={() => setLightboxIndex(null)}
            slides={photos.map((photo) => ({ src: photo.url, alt: photo.name }))}
          />
        </>
      )}
    </section>
  )
}
