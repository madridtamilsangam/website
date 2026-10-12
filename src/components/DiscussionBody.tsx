import type { ReactNode } from 'react'

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g

// Renders user-submitted text as plain text (React escapes it) and turns http(s)
// URLs into safe external links. Line breaks are preserved via CSS (pre-wrap).
export default function DiscussionBody({ text }: { text: string }) {
  const parts: ReactNode[] = text.split(URL_PATTERN).map((part, index) => {
    if (index % 2 === 1) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow ugc">
          {part}
        </a>
      )
    }
    return part
  })
  return <p className="discussion-body">{parts}</p>
}
