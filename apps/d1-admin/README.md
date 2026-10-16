# D1 Admin

Destiny One for leaders and admins, on the Mac. Built from the design canvas (kept in `design/`)
"The One App — Mac": group chat plus the admin queues (reports, access
requests, paused groups, people, invites, communities, feedback, audit log,
app settings), a menu bar popover, notifications and Touch ID.

Tauri 2 (Rust, `src-tauri/`) around a React + Vite UI (`src/`). It uses the
same backend as the phone app (`/api/app/v1/one`) and the website's admin
(`/api/admin/destiny-one`). How it fits together is in
`REPOSITORY_DOCUMENTATION.md` under "D1 Admin".

## Who can sign in

Leaders and admins. The sidebar shows only the admin pages your roles open:

| Role | Pages |
|---|---|
| Destiny One Admin | Access requests, People, Invites, Communities, Feedback, App settings |
| Safeguarding Admin | Reports, Paused groups, Audit log |
| Leader (no admin role) | Chat, and managing the groups you lead |

## Running it (on a Mac)

You need Node 22+, Rust (`curl https://sh.rustup.rs -sSf | sh`) and the Xcode
command line tools (`xcode-select --install`).

```bash
cd apps/d1-admin
cp .env.example .env.local     # fill in the Supabase URL and publishable key
npm install
npm run tauri:dev              # the app, with hot reload
```

`npm run dev` alone serves the UI in a browser for layout work. There's no
Keychain, Touch ID or menu bar there, and the API needs CORS, so use
`tauri:dev` for anything real.

The website's API host must be in `src-tauri/capabilities/default.json`
(the HTTP allow-list); the app refuses to send its token anywhere else. For a
local website, `http://localhost:3000` is already listed: set
`VITE_API_BASE_URL=http://localhost:3000`.

## Building the app

```bash
npm run tauri:build
```

The `.dmg` is in `src-tauri/target/release/bundle/dmg/` and the `.app` in
`src-tauri/target/release/bundle/macos/`.

The build is **unsigned** for now. The first time someone opens it, macOS
blocks it: right-click the app, choose Open, then Open again. After that it
opens normally. Updates are by hand: install the new `.dmg` over the old app.

### When the Apple Developer account is ready

1. In Xcode, create a "Developer ID Application" certificate in your keychain.
2. In `src-tauri/tauri.conf.json`, set `bundle.macOS.signingIdentity` to its
   name (`"Developer ID Application: Destiny Church (TEAMID)"`).
3. For notarisation, set `APPLE_ID`, `APPLE_PASSWORD` (an app-specific
   password) and `APPLE_TEAM_ID` in the environment before `npm run tauri:build`.

A signed, notarised build opens without the warning, and auto-update
(`tauri-plugin-updater`) can be added on top.

## Backend this needs

- Migration `supabase/migrations/20261011_01_destiny_one_restrictions_escalation.sql`
  applied (timed restrictions and report escalation). Without it, Restrict and
  Escalate fail; everything else works.
- The website deployed with the bearer-token support for
  `/api/admin/destiny-one` and the new `whoami`, `restrict`, `escalate` and
  `audit` routes.

## Icons

`src-tauri/icons/source.png` is the 1024px master; `npm run icons` regenerates
the set. `tray.png` is the menu bar template icon (black on transparent).
