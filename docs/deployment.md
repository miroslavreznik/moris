# Moris HTTPS deployment

## Public GitHub Pages, November 7, 2026

The user authorized making `miroslavreznik/moris` public and publishing the app
at `https://miroslavreznik.github.io/moris/`. `.github/workflows/pages.yml`
tests and builds `main`, uploads only the browser `dist` output and deploys it
through GitHub Pages. `npm run build:pages` does not include the private Worker.
The build sets `MORIS_BASE_PATH=/moris/` and a public notification API URL.
The repository contains source code, not personal habits, exported backups or
runtime credentials. Source publication does not publish IndexedDB records.

The original Site below remains owner-private, retaining its D1 data, VAPID keys
and existing cloud sender. Its updated API accepts token-controlled public
installations only through supported private service access. The public relay
is a separate Site, `appgprj_6aef8a9554d481919e155b6a5dcdf7bc`, at
`https://moris-reminders.miroslavreznik.chatgpt.site`. Its local source copy is
`sites/moris-reminders-relay`; prepare it with
`node scripts/prepare-reminder-relay.mjs`. It holds the private backend's existing
service credential only as a runtime secret. It exposes only config, subscription
and test, with CORS restricted to `https://miroslavreznik.github.io`.
It has no database and no independent sender or schedule.

The original Site's audience must stay private because it protects dispatch.
Publish the relay first privately, verify it, then make that separate relay
public. Verify Pages HTML/assets, manifest scope, service worker, offline reopen,
public API preflight and device-token isolation. Record exact deployment receipts
in ignored `deployment-artifacts/github-pages-deployment.json`.

Moving addresses needs a one-time export/restore and new notification opt-in.
Turning off old reminders avoids notifications from two separate installations.
Physical Android/iOS push transport remains a phone-level check.

## Original installation and history

Status: privately deployed over HTTPS on October 25, 2026. The native Sites deployment returned succeeded. Authenticated hosted-app checks and physical-device tests remain pending sign-in/device access.

## Selected destination

- Hosting provider: OpenAI Sites.
- Audience: private, owner-only. No invitations or sharing changes have been made.
- Registered project ID: `appgprj_6ade4dba1b348191bf2a58c3d1540816`.
- Live origin: `https://moris-habit-club.miroslavreznik.chatgpt.site`.
- Successful deployment: `appgdep_6ade534d91148191a3d6d39a82350ed5`.
- Saved version: `appgprj_6ade4dba1b348191bf2a58c3d1540816~appgver_db685858f89c8191a8cb2f72613ccc5a`.
- Published source commit: `051d80fe730ee25bf482ea04e45b325a8a4005a1`.
- Full native deployment receipt: `deployment-artifacts/live-deployment.json` (ignored local artifact).
- Source repository: `https://git.chatgpt-team.site/5a4aa536-9fc4-43e4-a5cf-f6faa150c533/appgprj_6ade4dba1b348191bf2a58c3d1540816.git`, branch `main`.

The private hosting gate is separate from Moris, which has no application account system. Phone testing may require signing into the owner's ChatGPT account at the hosting gate. The eventual no-login public release needs an explicit audience decision.

## Prepared source and artifact

The canonical app remains at the project root. `node scripts/prepare-hosting.mjs` copies a restricted source allowlist into `sites/moris`, verifies the source/public trees by SHA-256 inventory, and preserves the registered project identity. It excludes personal habit databases, exported backups, browser profiles, test outputs, local dependencies, credentials, and the uploaded PRD.

The private source copy includes application code, tests, public assets, package files, relevant documentation, and the non-secret hosting manifest. The original project has not been moved or replaced.

The locally packaged static deployment archive is `deployment-artifacts/moris-beta.tar.gz`. It contains the compiled app and hosting metadata. A final archive must be generated from the exact pushed source commit through the Sites source workflow before saving/deploying a version.

`public/_headers` requests fresh checks for `index.html`, `sw.js`, and the manifest; hashed assets use immutable caching. These rules must be checked on the actual host after deployment. Local files alone do not prove remote header behavior.

## Approval boundary

Automatic approval review rejected the command that would start the Sites source workflow and push to the private source repository. Its stated reason was that general HTTPS deployment authorization did not explicitly approve this particular destination or source-code upload. The rejection was respected. The user subsequently explicitly approved OpenAI Sites and instructed the upload and deployment to proceed.

Authorized publication procedure:

1. Reuse `.openai/hosting.json` and the existing project ID; do not create another Site.
2. Refresh the short-lived source credential for this project if needed. Keep it in session memory and supply it only through the source helper's hidden stdin.
3. Sync the current canonical source, then use the source helper to build, commit/push, and package that exact source state.
4. Use the returned commit SHA and archive with the native private save-and-deploy tool. Preserve owner-only access.
5. Follow the returned deployment until a terminal status, then report the actual live URL.
6. Verify hosted manifest/icons/headers, service-worker scope, a clean launch, offline reopen, and data persistence after an app update. Do not manufacture an authentication bypass for testing.
7. Perform the physical iPhone/Android checks listed in `docs/qa.md`.

## Hosted verification

The native save-and-deploy operation confirmed success and returned the live HTTPS URL. The existing in-app browser was navigated to the origin and reached the private ChatGPT sign-in flow. It currently requires the owner to complete password sign-in; no credentials were read or entered.

Unauthenticated HEAD requests to `/`, `/manifest.webmanifest`, `/sw.js`, and `/icon-192.png` returned HTTP 401 with `Cache-Control: no-store`, consistent with the owner-private gate. This verifies HTTPS reachability and the gate, not the authenticated app resources or their cache headers. No authentication bypass was created or used.

Physical installation, authenticated manifest/service-worker responses, hosted offline restart, and installed-app update persistence still need verification after sign-in on the actual phones. The existing local production tests remain the available evidence for those app flows.

## Seven-stage upgrade

The added Cosmic Moris (1,200 XP) and Moris the Infinite (2,000 XP) were privately published successfully. Source commit: `79049e835e127ae7419f7e489b68b38b098ea14d`. Deployment: `appgdep_6ade567f80388191af65c241383e9f7e`. Saved version: `appgprj_6ade4dba1b348191bf2a58c3d1540816~appgver_86e92d354af48191a48ab569b7cbc5b4`. The live URL and owner-private audience remain unchanged. The native receipt is `deployment-artifacts/evolution-deployment.json`. All 35 unit checks, the original 13 browser checks, three new evolution browser checks, and the production build passed. Existing thresholds, IndexedDB schema, and backup format were retained. Installed apps can apply the new service-worker version through the Save & update prompt.

## Direct completion from Today

The entire main habit area now completes or undoes today's entry, including taps on the habit name. A separate View history button opens the per-habit calendar. Daily and weekly habits share this interaction. The production build, 35 unit tests, 15 general browser checks, and three evolution browser checks pass. The browser suite verifies title/icon taps, keyboard activation, no completion navigation/date picker, the saved local date, history navigation, and no duplicate XP. Publication details are recorded in the ignored `deployment-artifacts/today-interaction-deployment.json` receipt after native deployment succeeds. Apply the update through Save & update on existing installations.

## Browser push iteration, November 4, 2026

This iteration preserves the original Site identity, owner-private audience, URL,
PWA manifest ID, root service-worker scope, IndexedDB schema and habit backups.
The source hosting manifest now declares a `DB` D1 binding and removes the static
deployment declaration. The Worker embeds all browser assets and serves the
original client plus same-origin reminder endpoints. Sites applies the appended
`drizzle/0000_evening_reminders.sql` migration before deploying the Worker.

The VAPID public key, secret private key and HTTPS subject are runtime environment
variables stored through Sites. They are excluded from source and build output.
The source allowlist now also includes the Worker, migration, reminder browser
checks and `docs/reminders.md`, which contains the unattended sender instructions.
The source helper remains responsible for committing, pushing and packaging the
exact checked source state. Native publication and schedule receipts belong in
ignored `deployment-artifacts/`; only a successful native result confirms release.

Before attaching the daily 19:30 Europe/Budapest task, POST to the hosted
`/api/reminders/dispatch` through the existing private Site's supported service
access, then GET the same endpoint and match the run ID. A run outside the evening
window deliberately persists a zero-send result, so readiness can be checked
without notifying anyone. Keep credentials in memory, not files, logs or prompts.

The local checks include 46 automated tests, all 15 original browser checks, three
evolution checks and six reminder browser checks. Incoming push transport is
simulated in browser QA; actual Android/iOS delivery still needs an opt-in test on
the owner's phone. Apply the PWA update with Save & update, then enable reminders
in Settings and use Send a test notification. No reinstall or data clearing is
needed.

## Personal companion and animation iteration, November 4, 2026

The next iteration adds personal color/detail settings, more expressive creature
reactions and a skippable transformation scene, plus early XP thresholds of
30/100/250. Later thresholds, existing habit records, IndexedDB version, manifest
ID, service-worker scope, push credentials, reminder database and the linked
19:30 daily schedule are retained. The appearance defaults make existing records
compatible without resetting storage. Source and publication receipts are kept
in ignored `deployment-artifacts/companion-deployment.json` after success.
