# Setup Guide (Admin)

This guide walks the site admin through the one-time Google-side setup. Nobody
needs to touch application code to manage content afterwards — everything is
edited directly in Google Drive, Sheets and Forms.

## 1. Create the Drive structure

Create a root folder (any name, e.g. "Tamil Sangam Website") containing:

```
Tamil Sangam Website/
├── Home/                 # images referenced by the Home sheet
├── Gallery/
│   ├── <Menu Name 1>/    # each subfolder becomes a Gallery submenu
│   ├── <Menu Name 2>/
│   └── ...
└── Events/
    ├── <Google Form 1>   # each Google Form becomes an Events submenu
    ├── <Google Form 2>
    └── ...
```

- Share the **Home** folder and **all Gallery subfolders** as
  "Anyone with the link — Viewer" (Share → General access). This lets the
  public site show images via Drive's public thumbnail URLs.
- The **Events** folder does not need to be publicly shared — the Apps Script
  backend (running as you) reads it directly.
- Note the folder IDs (the long string in each folder's URL after `folders/`).

## 2. Create the Google Sheet

Create one Spreadsheet (any name) with two tabs:

**`Home`** — columns (first row = header): `Name`, `Details`, `ImageFileName`
(the exact file name of an image inside the `Home` Drive folder).

**`ContactUs`** — columns: `Name`, `Phone`, `Email`, `Role` (Role is optional).

Note the Spreadsheet ID (the long string in its URL after `/d/`).

## 3. Deploy the Apps Script backend

1. Open [script.google.com](https://script.google.com) with the admin Google
   account and create a new project (or use `clasp` — see below).
2. Copy the contents of [`appsscript/Code.gs`](appsscript/Code.gs) into the
   script editor, and copy [`appsscript/appsscript.json`](appsscript/appsscript.json)
   into the project's manifest (Project Settings → "Show appsscript.json").
3. Fill in the `CONFIG` object at the top of `Code.gs` with your Spreadsheet ID
   and folder IDs from steps 1–2.
4. Deploy → New deployment → type "Web app".
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the resulting Web App URL — this goes into `VITE_APPS_SCRIPT_URL`.

Re-run "Manage deployments" → edit → new version whenever you change `Code.gs`.

### Optional: keep Code.gs version-controlled with clasp

```
npm install -g @google/clasp
clasp login
cd appsscript
clasp create --type webapp --title "Tamil Sangam Backend"
# or: clasp clone <existing-script-id>
clasp push
clasp deploy
```

Copy `.clasp.json.example` to `.clasp.json` (git-ignored) and fill in the real
`scriptId` clasp gives you.

## 4. Create a Google OAuth Client ID (Sign-In with Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs &
   Services → Credentials.
2. Create an **OAuth 2.0 Client ID** of type "Web application".
3. Under "Authorized JavaScript origins", add your GitHub Pages URL, e.g.
   `https://madridtamilsangam.github.io`.
4. Copy the Client ID into `VITE_GOOGLE_CLIENT_ID`.

This powers both the Admin sign-in gate and the Events sign-in gate. It does
not grant access to your Drive/Sheets/Forms — it only lets the site read the
signer's name/email to personalize the page.

## 5. Configure each Google Form

For every form placed in the `Events` folder:

- Open the form → Settings → "Responses" → enable **"Requires sign-in"** (this
  is Google's own, real enforcement — the site's sign-in gate is just a
  matching UX step, not the security boundary).
- Make sure the form has fields literally titled **"Name"** and **"Email"**
  if you want the site's sign-in prefill to work.

## 6. Configure environment variables

Copy [`.env.example`](.env.example) to `.env.local` for local development, and
add the same values as **repository secrets** (Settings → Secrets and
variables → Actions) so the GitHub Actions build can inject them:

- `VITE_APPS_SCRIPT_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_ADMIN_EMAILS` (comma-separated)
- `VITE_ADMIN_DRIVE_ROOT_URL`, `VITE_ADMIN_HOME_SHEET_URL`,
  `VITE_ADMIN_CONTACT_SHEET_URL`, `VITE_ADMIN_EVENTS_FOLDER_URL`,
  `VITE_ADMIN_GALLERY_FOLDER_URL`, `VITE_ADMIN_APPS_SCRIPT_URL` (optional,
  shown as deep links on the Admin Dashboard)

## 7. Enable GitHub Pages

Repo Settings → Pages → Source → **GitHub Actions**. Pushing to `main` will
then build and deploy automatically via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
