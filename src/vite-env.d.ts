/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_ADMIN_EMAILS: string
  readonly VITE_ADMIN_DRIVE_ROOT_URL?: string
  readonly VITE_ADMIN_HOME_SHEET_URL?: string
  readonly VITE_ADMIN_CONTACT_SHEET_URL?: string
  readonly VITE_ADMIN_EVENTS_FOLDER_URL?: string
  readonly VITE_ADMIN_GALLERY_FOLDER_URL?: string
  readonly VITE_ADMIN_APPS_SCRIPT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
