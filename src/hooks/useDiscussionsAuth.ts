import { useEffect } from 'react'
import { useGoogleSignIn } from './useGoogleSignIn'

/**
 * Sign-in for the Discussions feature. Shares the visitor session with Events,
 * and signs the user out automatically once the Google ID token expires so the
 * sign-in button reappears (the backend rejects expired tokens).
 */
export function useDiscussionsAuth() {
  const auth = useGoogleSignIn('visitor-google-profile')
  const { profile, signOut } = auth

  const expiresAtMs = profile ? (profile.exp ?? 0) * 1000 : 0
  const hasValidToken = !!profile?.idToken && expiresAtMs > Date.now()

  useEffect(() => {
    if (!profile) return
    const remaining = expiresAtMs - Date.now()
    if (!profile.idToken || remaining <= 0) {
      signOut()
      return
    }
    const timer = window.setTimeout(signOut, remaining)
    return () => window.clearTimeout(timer)
  }, [profile, expiresAtMs, signOut])

  return { ...auth, idToken: hasValidToken ? (profile?.idToken ?? null) : null }
}
