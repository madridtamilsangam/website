import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getHighlights, getYouTubeVideos, getGalleryFolders, getGalleryPhotos } from '../services/api'
import type { HighlightItem, YouTubeVideo, GalleryPhoto } from '../types/api'
import HighlightCard from '../components/HighlightCard'
import YouTubeGrid from '../components/YouTubeGrid'

export default function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [highlights, setHighlights] = useState<HighlightItem[] | null>(null)
  const [highlightsError, setHighlightsError] = useState<string | null>(null)

  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null)
  const [videosError, setVideosError] = useState<string | null>(null)

  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryError, setGalleryError] = useState<string | null>(null)

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

  // Fetch gallery photos
  useEffect(() => {
    let cancelled = false
    const fetchGallery = async () => {
      try {
        const folders = await getGalleryFolders()
        const allPhotos: GalleryPhoto[] = []

        // Fetch photos from all folders
        for (const folder of folders) {
          try {
            const photos = await getGalleryPhotos(folder.id)
            allPhotos.push(...photos)
          } catch (err) {
            console.error(`Error fetching photos from folder ${folder.name}:`, err)
          }
        }

        if (!cancelled) {
          // Shuffle and take first 10
          const shuffled = allPhotos.sort(() => Math.random() - 0.5)
          setGalleryPhotos(shuffled.slice(0, 10))
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
            <div className="gallery-showcase-grid">
              {galleryPhotos.map((photo, index) => (
                <div key={`${photo.id}-${index}`} className="gallery-item">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : galleryError ? (
        <section className="section-gallery">
          <div className="section-container">
            <p className="error-text">{t('common.error')}</p>
          </div>
        </section>
      ) : galleryPhotos !== undefined ? (
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
            <YouTubeGrid videos={videos} />
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
