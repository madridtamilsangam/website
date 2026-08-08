import type { YouTubeVideo } from '../types/api'

interface YouTubeGridProps {
  videos: YouTubeVideo[]
}

export default function YouTubeGrid({ videos }: YouTubeGridProps) {
  const getThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  const getYouTubeUrl = (videoId: string): string => {
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  return (
    <div className="youtube-grid">
      {videos.map((video, index) => (
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
  )
}
