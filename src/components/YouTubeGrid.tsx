import type { YouTubeVideo } from '../types/api'

interface YouTubeGridProps {
  videos: YouTubeVideo[]
  currentPage?: number
  videosPerPage?: number
  onPageChange?: (page: number) => void
}

export default function YouTubeGrid({ 
  videos, 
  currentPage = 1, 
  videosPerPage = 6,
  onPageChange 
}: YouTubeGridProps) {
  const getThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  const getYouTubeUrl = (videoId: string): string => {
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  // Calculate pagination
  const totalPages = Math.ceil(videos.length / videosPerPage)
  const startIndex = (currentPage - 1) * videosPerPage
  const endIndex = startIndex + videosPerPage
  const paginatedVideos = videos.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1)
      // Scroll to section
      const section = document.querySelector('.section-youtube')
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1)
      // Scroll to section
      const section = document.querySelector('.section-youtube')
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <div className="youtube-grid">
        {paginatedVideos.map((video, index) => (
          <a
            key={`${video.videoId}-${index}`}
            href={getYouTubeUrl(video.videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="youtube-card"
            title={video.title}
          >
            <div className="video-thumbnail">
              <img
                src={getThumbnailUrl(video.videoId)}
                alt={video.title}
                loading="lazy"
              />
              <div className="play-button">
                <span>▶</span>
              </div>
            </div>
            <h4>{video.title}</h4>
          </a>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="youtube-pagination">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
            className="pagination-btn pagination-prev"
            title="Previous page"
          >
            ← Previous
          </button>

          <div className="pagination-info">
            Page <span className="page-number">{currentPage}</span> of{' '}
            <span className="page-total">{totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="pagination-btn pagination-next"
            title="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </>
  )
}
