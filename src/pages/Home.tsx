import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getHighlights, getYouTubeVideos, getGalleryFolders, getGalleryPhotos } from '../services/api'
import type { HighlightItem, YouTubeVideo, GalleryPhoto, GalleryFolder } from '../types/api'
import HighlightCard from '../components/HighlightCard'
import YouTubeGrid from '../components/YouTubeGrid'

export default function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [highlights, setHighlights] = useState<HighlightItem[] | null>(null)
  const [highlightsError, setHighlightsError] = useState<string | null>(null)

  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null)
  const [videosError, setVideosError] = useState<string | null>(null)
  const [videoPage, setVideoPage] = useState(1)
  const VIDEOS_PER_PAGE = 6

  // Gallery with per-folder photos
  interface FolderWithPhotos {
    folder: GalleryFolder
    photos: GalleryPhoto[]
  }
  const [foldersWithPhotos, setFoldersWithPhotos] = useState<FolderWithPhotos[]>([])
  const [galleryPhotos, setGalleryPhotos] = useState<(GalleryPhoto & { folderId: string })[]>([])
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [galleryPage, setGalleryPage] = useState(1)
  const PHOTOS_PER_PAGE = 10

  // Fetch highlights
  useEffect(() => {
    let cancelled = false
    getHighlights()
      .then((data) => {
        if (!cancelled) setHighlights(data)
      })
      .catch((err) => {
        if (!cancelled)
          setHighlightsError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch YouTube videos
  useEffect(() => {
    let cancelled = false
    getYouTubeVideos()
      .then((data) => {
        if (!cancelled) setVideos(data)
      })
      .catch((err) => {
        if (!cancelled) setVideosError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch gallery photos - 2 per folder max
  useEffect(() => {
    let cancelled = false
    const fetchGallery = async () => {
      try {
        const folders = await getGalleryFolders()
        const foldersData: FolderWithPhotos[] = []
        const allPhotosWithFolderId: (GalleryPhoto & { folderId: string })[] = []

        // Fetch up to 2 photos from each folder
        for (const folder of folders) {
          try {
            const photos = await getGalleryPhotos(folder.id)
            const folderPhotos = photos.slice(0, 2) // Take only first 2 photos
            foldersData.push({ folder, photos: folderPhotos })
            
            // Add photos with folder info
            folderPhotos.forEach(photo => {
              allPhotosWithFolderId.push({ ...photo, folderId: folder.id })
            })
          } catch (err) {
            console.error(`Error fetching photos from folder ${folder.name}:`, err)
          }
        }

        if (!cancelled) {
          setFoldersWithPhotos(foldersData)
          // Set gallery photos for current page (0-9 for first page, 10-19 for second, etc.)
          setGalleryPhotos(allPhotosWithFolderId)
          setGalleryPage(1)
        }
      } catch (err) {
        if (!cancelled)
          setGalleryError(err instanceof Error ? err.message : String(err))
      }
    }

    fetchGallery()
    return () => {
      cancelled = true
    }
  }, [])

  const handlePhotoClick = (folderId: string, photoId: string) => {
    navigate(`/gallery/${folderId}?photo=${photoId}`)
  }

  return (
    <section className="page home-page">
      {/* Section 1: Hero CTA */}
      <div className="home-hero-cta">
        <div className="cta-content">
          <h1>{t('home.cta_headline')}</h1>
          <p className="cta-subtitle">{t('home.cta_subtitle')}</p>
          <button
            onClick={() => navigate('/registration')}
            className="cta-button"
          >
            {t('home.cta_button')}
          </button>
        </div>
      </div>

      {/* Section 2: Recent Highlights */}
      {highlights && highlights.length > 0 ? (
        <section className="section-highlights">
          <div className="section-container">
            <h2>{t('home.highlights_title')}</h2>
            <div className="highlights-grid">
              {highlights.map((highlight, index) => (
                <HighlightCard
                  key={`${highlight.title}-${index}`}
                  highlight={highlight}
                />
              ))}
            </div>
          </div>
        </section>
      ) : highlightsError ? (
        <section className="section-highlights">
          <div className="section-container">
            <p className="error-text">{t('common.error')}</p>
          </div>
        </section>
      ) : highlights !== null ? (
        <section className="section-highlights">
          <div className="section-container">
            <h2>{t('home.highlights_title')}</h2>
            <p className="empty-text">{t('home.empty')}</p>
          </div>
        </section>
      ) : null}

      {/* Section 3: Gallery Showcase */}
      {galleryPhotos.length > 0 ? (
        <section className="section-gallery">
          <div className="section-container">
            <h2>{t('home.gallery_title')}</h2>
            {(() => {
              const totalPages = Math.ceil(galleryPhotos.length / PHOTOS_PER_PAGE)
              const startIdx = (galleryPage - 1) * PHOTOS_PER_PAGE
              const paginatedPhotos = galleryPhotos.slice(startIdx, startIdx + PHOTOS_PER_PAGE)
              
              return (
                <>
                  <div className="gallery-showcase-grid">
                    {paginatedPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="gallery-item"
                        onClick={() => handlePhotoClick(photo.folderId, photo.id)}
                        aria-label={photo.name}
                        title="Click to view all photos in this folder"
                      >
                        <img
                          src={photo.url}
                          alt={photo.name}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  
                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="gallery-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setGalleryPage(Math.max(1, galleryPage - 1))}
                        disabled={galleryPage === 1}
                      >
                        ← {t('common.previous') || 'Previous'}
                      </button>
                      <span className="pagination-info">
                        {t('common.page') || 'Page'} {galleryPage} {t('common.of') || 'of'} {totalPages}
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() => setGalleryPage(Math.min(totalPages, galleryPage + 1))}
                        disabled={galleryPage === totalPages}
                      >
                        {t('common.next') || 'Next'} →
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </section>
      ) : galleryError ? (
        <section className="section-gallery">
          <div className="section-container">
            <p className="error-text">{t('common.error')}</p>
          </div>
        </section>
      ) : galleryPhotos.length === 0 && foldersWithPhotos.length === 0 ? (
        <section className="section-gallery">
          <div className="section-container">
            <h2>{t('home.gallery_title')}</h2>
            <p className="empty-text">{t('home.empty')}</p>
          </div>
        </section>
      ) : null}

      {/* Section 4: YouTube Videos */}
      {videos && videos.length > 0 ? (
        <section className="section-youtube">
          <div className="section-container">
            <h2>{t('home.youtube_title')}</h2>
            <YouTubeGrid 
              videos={videos} 
              currentPage={videoPage}
              videosPerPage={VIDEOS_PER_PAGE}
              onPageChange={setVideoPage}
            />
          </div>
        </section>
      ) : videosError ? (
        <section className="section-youtube">
          <div className="section-container">
            <p className="error-text">{t('common.error')}</p>
          </div>
        </section>
      ) : videos !== null ? (
        <section className="section-youtube">
          <div className="section-container">
            <h2>{t('home.youtube_title')}</h2>
            <p className="empty-text">{t('home.empty')}</p>
          </div>
        </section>
      ) : null}
    </section>
  )
}
