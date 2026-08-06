// Build-time configuration read from Vite env vars.
// See .env.example / SETUP.md for how each value is produced.

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL ?? ''

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export const LOGO_URL = import.meta.env.VITE_LOGO_URL ?? ''

export const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

/**
 * NOTE: this is a UX convenience check only, not a security boundary.
 * The real protection for Drive/Sheets/Forms is Google's own sharing permissions —
 * this site never writes data, it only decides whether to show admin deep links.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}
