import { useCallback, useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../services/config'
import { profileFromCredential, type GoogleProfile } from '../services/googleAuth'

let scriptLoadPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

function readStoredProfile(storageKey: string): GoogleProfile | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as GoogleProfile) : null
  } catch {
    return null
  }
}

/**
 * Google Identity Services "Sign in with Google" hook.
 * `storageKey` scopes the signed-in session (sessionStorage, tab-scoped) so the
 * admin sign-in and the events visitor sign-in never share state.
 */
export function useGoogleSignIn(storageKey: string) {
  const [profile, setProfile] = useState<GoogleProfile | null>(() => readStoredProfile(storageKey))
  const [ready, setReady] = useState(false)
  const buttonRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!GOOGLE_CLIENT_ID) return
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            const nextProfile = profileFromCredential(response.credential)
            setProfile(nextProfile)
            sessionStorage.setItem(storageKey, JSON.stringify(nextProfile))
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })
        setReady(true)
      })
      .catch(() => {
        // Sign-in stays unavailable; pages handle a null profile gracefully.
      })
    return () => {
      cancelled = true
    }
  }, [storageKey])

  useEffect(() => {
    if (ready && !profile && buttonRef.current && window.google) {
      buttonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
      })
    }
  }, [ready, profile])

  const signOut = useCallback(() => {
    setProfile(null)
    sessionStorage.removeItem(storageKey)
    window.google?.accounts.id.disableAutoSelect()
  }, [storageKey])

  return { profile, buttonRef, signOut, ready }
}
