export interface GoogleProfile {
  email: string
  name: string
  picture?: string
}

/**
 * Decodes the payload of a Google Identity Services JWT credential.
 * This does NOT verify the token's signature — it is only used to read
 * display claims (name/email/picture) client-side for UX purposes
 * (personalization, admin allow-list gating, form prefill). It is never
 * treated as a security boundary; real access control stays in Google's
 * own products (Drive/Sheets/Forms sharing permissions).
 */
export function profileFromCredential(credential: string): GoogleProfile {
  const payload = credential.split('.')[1] ?? ''
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const json = decodeURIComponent(
    atob(padded)
      .split('')
      .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  const claims = JSON.parse(json) as Record<string, unknown>
  return {
    email: String(claims.email ?? ''),
    name: String(claims.name ?? claims.email ?? ''),
    picture: claims.picture ? String(claims.picture) : undefined,
  }
}
