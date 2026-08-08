import type { HighlightItem } from '../types/api'

interface HighlightCardProps {
  highlight: HighlightItem
}

export default function HighlightCard({ highlight }: HighlightCardProps) {
  // Parse date string (YYYY-MM-DD format) and format for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00Z')
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const cardContent = (
    <>
      {highlight.imageUrl && (
        <div className="highlight-image-wrapper">
          <img src={highlight.imageUrl} alt={highlight.title} loading="lazy" />
          {highlight.date && (
            <span className="date-badge">{formatDate(highlight.date)}</span>
          )}
        </div>
      )}
      <div className="highlight-content">
        <h3>{highlight.title}</h3>
        <p>{highlight.description}</p>
      </div>
    </>
  )

  // Wrap in anchor if link exists, otherwise render as article
  if (highlight.link) {
    return (
      <a
        href={highlight.link}
        target="_blank"
        rel="noopener noreferrer"
        className="card highlight-card highlight-card-link"
        title={highlight.title}
      >
        {cardContent}
      </a>
    )
  }

  return <article className="card highlight-card">{cardContent}</article>
}
