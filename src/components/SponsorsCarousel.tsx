import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { SponsorItem } from '../types/api'
import './SponsorsCarousel.css'

// Fewer sponsors than this are shown as a static centered row instead of a marquee.
const MIN_FOR_MARQUEE = 3
// Each half of the marquee track is repeated until it holds at least this many cards,
// so there is never an empty gap on wide screens.
const MIN_CARDS_PER_HALF = 10
const SECONDS_PER_CARD = 4

interface SponsorLink {
  key: string
  label: string
  url: string
  icon: string
}

interface SponsorCardProps {
  sponsor: SponsorItem
  hidden: boolean
  chooserOpen: boolean
  onOpenChooser: () => void
  onCloseChooser: () => void
}

// Lets a visitor pick one of a sponsor's links. Rendered in a portal so the
// marquee's overflow clipping and the card hover transform don't affect it.
function LinkChooser({ name, links, onClose }: { name: string; links: SponsorLink[]; onClose: () => void }) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="sponsor-dialog-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="sponsor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="sponsor-dialog-title">{name}</h3>
        <p className="sponsor-dialog-hint">{t('sponsors.chooseLink')}</p>
        <ul className="sponsor-dialog-list">
          {links.map((link) => (
            <li key={link.key}>
              <a
                className="sponsor-dialog-option"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
              >
                <span aria-hidden="true">{link.icon}</span> {link.label}
              </a>
            </li>
          ))}
        </ul>
        <button type="button" className="sponsor-dialog-close" onClick={onClose}>
          {t('sponsors.close')}
        </button>
      </div>
    </div>,
    document.body,
  )
}

function SponsorCard({ sponsor, hidden, chooserOpen, onOpenChooser, onCloseChooser }: SponsorCardProps) {
  const { t, i18n } = useTranslation()
  const [logoFailed, setLogoFailed] = useState(false)
  const tagline = i18n.language.startsWith('ta')
    ? sponsor.tagline_ta || sponsor.tagline_en
    : sponsor.tagline_en || sponsor.tagline_ta
  const links: SponsorLink[] = [
    ...(sponsor.website
      ? [{ key: 'website', label: t('sponsors.visitWebsite'), url: sponsor.website, icon: '🌐' }]
      : []),
    ...(sponsor.whatsappGroupUrl
      ? [{ key: 'whatsapp', label: t('sponsors.joinWhatsapp'), url: sponsor.whatsappGroupUrl, icon: '💬' }]
      : []),
    ...(sponsor.otherUrl
      ? [{ key: 'other', label: sponsor.otherLabel || t('sponsors.moreInfo'), url: sponsor.otherUrl, icon: '🔗' }]
      : []),
  ]
  const tabIndex = hidden ? -1 : undefined

  const body = (
    <>
      {sponsor.logoUrl && !logoFailed ? (
        <img
          src={sponsor.logoUrl}
          alt={hidden ? '' : sponsor.name}
          loading="lazy"
          className="sponsor-logo"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="sponsor-logo sponsor-logo-fallback" aria-hidden="true">
          {sponsor.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="sponsor-name">{sponsor.name}</span>
      {tagline && <span className="sponsor-tagline">{tagline}</span>}
    </>
  )

  const tierClass = sponsor.tier ? ` sponsor-tier-${sponsor.tier.toLowerCase().replace(/\W+/g, '-')}` : ''

  let card
  if (links.length === 0) {
    card = <div className="sponsor-link">{body}</div>
  } else if (links.length === 1) {
    card = (
      <a
        className="sponsor-link"
        href={links[0].url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        tabIndex={tabIndex}
        title={sponsor.name}
      >
        {body}
      </a>
    )
  } else {
    card = (
      <button
        type="button"
        className="sponsor-link sponsor-link-button"
        tabIndex={tabIndex}
        aria-haspopup="dialog"
        aria-expanded={chooserOpen}
        onClick={onOpenChooser}
      >
        {body}
      </button>
    )
  }

  return (
    <li className={`sponsor-card${tierClass}`} data-dup={hidden || undefined} aria-hidden={hidden || undefined}>
      {card}
      {chooserOpen && <LinkChooser name={sponsor.name} links={links} onClose={onCloseChooser} />}
    </li>
  )
}

export default function SponsorsCarousel({ sponsors }: { sponsors: SponsorItem[] }) {
  const { t } = useTranslation()
  const [paused, setPaused] = useState(false)
  // Key of the card whose link chooser is open; the marquee stops while it is open.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const closeChooser = useCallback(() => setOpenKey(null), [])

  if (sponsors.length === 0) return null

  const marquee = sponsors.length >= MIN_FOR_MARQUEE
  const repeat = marquee ? Math.max(1, Math.ceil(MIN_CARDS_PER_HALF / sponsors.length)) : 1
  const half = Array.from({ length: repeat }, () => sponsors).flat()
  const cards = marquee ? [...half, ...half] : sponsors
  const duration = `${Math.max(20, half.length * SECONDS_PER_CARD)}s`

  return (
    <section className="section-sponsors" aria-labelledby="sponsors-heading">
      <div className="section-container">
        <div className="sponsors-header">
          <h2 id="sponsors-heading">{t('sponsors.title')}</h2>
          {marquee && (
            <button
              type="button"
              className="sponsors-toggle"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t('sponsors.play') : t('sponsors.pause')}
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                {paused ? (
                  <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
                ) : (
                  <>
                    <rect x="3.5" y="2.5" width="3" height="11" rx="0.5" fill="currentColor" />
                    <rect x="9.5" y="2.5" width="3" height="11" rx="0.5" fill="currentColor" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>

        <div className={marquee ? 'sponsors-marquee' : 'sponsors-static'}>
          <ul
            className={`sponsors-track${marquee && (paused || openKey !== null) ? ' paused' : ''}`}
            style={marquee ? { animationDuration: duration } : undefined}
          >
            {cards.map((sponsor, index) => {
              const key = `${sponsor.name}-${index}`
              return (
                <SponsorCard
                  key={key}
                  sponsor={sponsor}
                  hidden={marquee && index >= sponsors.length}
                  chooserOpen={openKey === key}
                  onOpenChooser={() => setOpenKey(key)}
                  onCloseChooser={closeChooser}
                />
              )
            })}
          </ul>
        </div>

        <p className="sponsors-cta">
          <Link to="/contact">{t('sponsors.become')}</Link>
        </p>
      </div>
    </section>
  )
}
