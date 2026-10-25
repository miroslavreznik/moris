# Moris

Every repetition changes you. A mobile-first, local-first habit PWA with an original evolving companion.

The working visual direction is **Sunday Club**, combined with **Oddly Good's readable progress grids**. Each habit has its own progress view; weekly quotas use calendar weeks rather than invented daily streaks.

## Run locally

Tested with Node 22.14.0 and npm 10.9.2.

```sh
npm ci
npm run dev
```

Build and inspect the production PWA:

```sh
npm run build
npm run preview
```

The production preview is normally at `http://localhost:4173`. The development server intentionally does not enable a service worker.

- `/`: normal onboarding and your own device-local data.
- `/?demo=1`: populated sample habits in a separate `moris-demo-v1` database. Changes in this mode do not touch your personal habits.
- `/?demo=1&view=progress`: the per-goal overview.
- `/?demo=1&view=progress&goal=demo-0`: the reading habit's calendar.

## What is implemented

- English onboarding with suggested/custom habits and configurable schedules.
- Create, edit, and archive habits; archiving retains history and XP.
- Daily, interval, selected-weekday, and flexible weekly-target schedules.
- Immediate one-tap completion, undo, a seven-day strip on Today, and local persistence.
- Separate goal overviews, 35-day calendars, historical corrections, current/best streaks, and up to 12 weeks of quota history.
- Prospective schedule revisions. A completed current day keeps its schedule; changes then start tomorrow or later. Partial first/changed weeks cannot become failed weekly streaks.
- Five original SVG evolution stages, derived XP, one-time skippable unlock celebrations, optional interaction-triggered audio, and reduced-motion support.
- IndexedDB via Dexie, a unique habit/date index, versioned schema, and transactional writes.
- Versioned JSON export/import, record validation, a pre-restore download, and a safety backup stored atomically before replacement. Failed replacement rolls back.
- PWA manifest, standard and maskable icons, Apple touch icon, locally bundled fonts, offline app shell, safe-area layout, and an explicit app-update prompt that waits for pending writes.

## Checks

```sh
npm test
npm run build
```

With the production preview running in a second terminal:

```sh
npm run test:browser
```

The browser suite uses installed Microsoft Edge on Windows. Elsewhere install Playwright Chromium with `npx playwright install chromium`. `MORIS_TEST_URL` can override the preview address; `MORIS_BROWSER` can override the Windows browser channel.

Browser artifacts are written to ignored `test-results/`. See `docs/qa.md` for validation evidence and the remaining physical-device/release checks.

## Data and scheduling

`src/domain.ts` contains calendar-date scheduling, revision-aware history, streaks, and rewards independently of React. Date arithmetic uses calendar dates in UTC; recorded local dates and their time zones stay fixed when the device travels. A Monday–Sunday quota counts distinct completion dates. Open days/weeks do not prematurely break streaks.

`src/storage.ts` declares IndexedDB version 1. Future database changes must add a version and migration, never delete the database during app updates. `src/store.ts` serializes writes while keeping UI feedback immediate. A storage failure reloads durable records and reports the failure.

There is **no account, server, automatic cloud backup, sync, subscription, or external analytics**. Clearing browser data or losing the device can lose records. Export backups regularly; demo data is illustrative.

## Deployment and release boundary

OpenAI Sites is the approved private hosting destination. See `docs/deployment.md` for the origin, exact source destination, package preparation, and release checks. Only a successful native deployment result confirms that a version is live.

Deploy the contents of `dist/` at the **origin root over HTTPS**. Rewrite navigation requests to `index.html`; serve JavaScript, CSS, manifest, and icon requests as actual files. Do not cache `index.html` or `sw.js` indefinitely; hashed assets may use immutable caching. The manifest and service-worker scope are root-relative.

The application runs and passes automated local checks. The full PRD definition of done still requires an HTTPS deployment and physical iPhone/Safari and Android/Chrome installation, standalone launch, offline restart, and update checks. Browser emulation is not a substitute for that device validation.

Original specification: `Moris_PRD_MVP_PWA_EN.md`.
