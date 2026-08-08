export interface AdminLink {
  key: string
  url: string
}

// Only links with a configured URL are shown on the Admin Dashboard, so the admin
// can fill in whichever ones apply without breaking the page.
const raw: Record<string, string | undefined> = {
  driveRoot: import.meta.env.VITE_ADMIN_DRIVE_ROOT_URL,
  homeSheet: import.meta.env.VITE_ADMIN_HOME_SHEET_URL,
  contactSheet: import.meta.env.VITE_ADMIN_CONTACT_SHEET_URL,
  committeeSheet: import.meta.env.VITE_ADMIN_COMMITTEE_SHEET_URL,
  footerSheet: import.meta.env.VITE_ADMIN_FOOTER_SHEET_URL,
  eventsFolder: import.meta.env.VITE_ADMIN_EVENTS_FOLDER_URL,
  galleryFolder: import.meta.env.VITE_ADMIN_GALLERY_FOLDER_URL,
  appsScriptProject: import.meta.env.VITE_ADMIN_APPS_SCRIPT_URL,
}

export const ADMIN_LINKS: AdminLink[] = Object.entries(raw)
  .filter((entry): entry is [string, string] => Boolean(entry[1]))
  .map(([key, url]) => ({ key, url }))
