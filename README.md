# Tamil Sangam Website

A static React + TypeScript + Vite site for the local Tamil community, hosted
on GitHub Pages. All content storage (photos, event forms, contact/home text)
lives in the admin's Google account — Drive, Sheets and Forms — and is served
to the site through a small read-only Google Apps Script Web App. No servers,
no database, no exposed secrets.

- **Home** — pulled from a "Home" Google Sheet + images in a "Home" Drive folder.
- **Gallery** — each subfolder of a Drive "Gallery" folder becomes a submenu of photos.
- **Events** — each Google Form in a Drive "Events" folder becomes a submenu; visitors
  sign in with Google before opening the form (name/email prefilled).
- **Contact Us** — pulled from a "ContactUs" Google Sheet.
- **Admin** (`/admin`) — Google sign-in gate (allow-listed emails) revealing deep
  links to the real Drive/Sheets/Forms editors. All edits happen there, never
  in this app.
- **Language** — Tamil (default) / English toggle for the UI chrome.

See [SETUP.md](SETUP.md) for the full one-time Google-side setup (Drive
structure, Sheet columns, Apps Script deployment, OAuth client, GitHub Pages).

## Development

```
npm install
cp .env.example .env.local   # fill in VITE_APPS_SCRIPT_URL etc.
npm run dev
```

## Build

```
npm run build
```

Deploys automatically to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on push to `main`
(requires repo Settings → Pages → Source = "GitHub Actions", and the env vars
in `.env.example` added as repository secrets).

## Tech stack

React 19 + TypeScript + Vite, `react-router` (HashRouter, for GitHub Pages
compatibility), `react-i18next` (Tamil/English), Google Identity Services
(Sign in with Google), Google Apps Script (backend), `yet-another-react-lightbox`
(gallery viewer).
