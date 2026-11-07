# Evening reminders

Moris remains an installable PWA. Opt-in reminders use the browser's Push API and
system Notifications API, with a small same-origin Sites Worker and D1 database.
The existing IndexedDB database, origin, manifest ID, service-worker scope,
habit records, XP and backup format are preserved.

## GitHub Pages installation, November 7, 2026

The public app at `https://miroslavreznik.github.io/moris/` uses
`https://moris-reminders.miroslavreznik.chatgpt.site/api/reminders/` for its
notification API. The separate public relay forwards only `GET config`,
`POST subscription` and `POST test` to the original **private** Sites service.
It bounds bodies, strips all caller cookies/identity/authorization headers,
rejects other origins, and never forwards dispatch or arbitrary paths.

The relay's `MORIS_SERVICE_TOKEN` is the existing supported service credential
returned by the original Site's `get_site`. It is stored only as a secret in the
relay's runtime, along with `MORIS_BACKEND_ORIGIN` and `MORIS_PUBLIC_ORIGIN`.
If the original service credential is revoked, refresh this runtime secret from
`get_site` and redeploy the relay; never put it in the Pages build or repository.

The private backend recognizes the relay's `x-moris-public-client: 1` marker only
on identity-less requests already admitted by the unchanged private Sites gate.
Public devices are controlled by their random installation token, stored hashed
on the server; no ChatGPT sign-in is required for the public app. Public device
registration is capped at the sender's 1,000-installation capacity. The existing
19:30 Europe/Budapest sender, D1 database and VAPID keys remain in place.
The original authenticated installation still works under its existing identity.

GitHub Pages uses `/moris/` as its manifest ID, start URL and service-worker scope.
Notification icons and click targets follow that scope, so other projects on the
same `github.io` origin are not opened by a Moris notification. Export/restore
transfers habits, XP and appearance to the new origin; notification permissions
must be enabled separately. Turn off the old installation's reminders if retiring
it. Neither backup files nor device control tokens are published with the code.

## Behavior

- Enable explicitly in Settings; never request permission on launch.
- One reminder per installation around **19:30 Europe/Budapest**, including DST.
- Skip complete days, rest days, archived goals and days explicitly closed in the
  evening review. A flexible weekly quota is considered only on Sunday and only
  if unfinished, with no entry already recorded that day.
- The evening review is also available from Today. It shows wins, remaining
  scheduled goals, and tomorrow's plan; adding a goal there defaults to tomorrow.
  Closing the day does not create completions, change goals, or grant XP.
- Ordinary daily sending is claimed in D1 before delivery. Concurrent runs and
  retries cannot send another notification for the same installation/day. An
  ambiguous delivery failure is not retried that evening. User-requested tests
  have a separate one-minute rate limit.
- Sending is allowed only between 19:30 and 20:00 Europe/Budapest, with a 30-minute
  push TTL. Late task runs skip sending. Phone settings may delay or hide delivery.
- We sync 14 dates of eligibility and stop after that window if Moris is not
  revisited. No indefinite inactivity or escalating reminder sequence.

## Privacy and limitations

The server receives the push endpoint and encryption keys, an installation ID,
a hash of its control token, the platform-provided Site user ID, a version, and
14 date/boolean pairs. It does **not** receive goal names, schedules, completion
history, XP, or journal text. Device-specific delivery credentials live in a
separate IndexedDB meta record and are not included in JSON habit backups.

Offline edits cannot reach the sender until reconnecting. Therefore an already
queued reminder can occasionally arrive after completing goals offline or very
close to dispatch. We do not try to silently discard incoming pushes: browser
push subscriptions require visible notifications. The app explains this limit.

iPhone/iPad require a supported OS and a Home Screen installation; desktop and
Android require supported browser/system notification permissions. No native
wrapper, app-store package, or paid notification provider is used.

## Hosted runtime

Source `.openai/hosting.json` retains the existing project ID, removes `static`,
and declares `d1: "DB"`. `npm run build` builds the unchanged Vite client/PWA and
then bundles the Worker with the client assets embedded. There is no dependency
on unsupported standalone Worker asset serving. The initial schema is in
`drizzle/0000_evening_reminders.sql`; future schema changes must append migrations.

Runtime variables: `VAPID_PUBLIC_KEY`, secret `VAPID_PRIVATE_KEY`, and
`VAPID_SUBJECT` (the HTTPS Site origin). Configure them only through Sites runtime
environment tools. Never regenerate an existing live VAPID key on an update.

The Site's unchanged **owner-private gate** protects the unattended
`POST /api/reminders/dispatch` endpoint. It rejects signed-in browser callers and
Origin-bearing calls. The service caller uses Sites service access from a fresh
`get_site` response. Do not change the Site audience without revisiting this
service authorization boundary. Subscription and test endpoints require the
platform-provided visitor identity plus the installation's control token; writes
reject cross-origin requests. Push endpoints are restricted to supported push
providers and fetch redirects are disabled.

## Unattended sender instructions

The linked daily Site cloud task runs at 19:30 Europe/Budapest. On each run:

1. Read this exact linked Site's metadata through Sites `get_site` and obtain its
   current service-access bearer in memory. Never put it in code, files or output.
2. POST to `/api/reminders/dispatch` at the returned live Site origin, with
   `OAI-Sites-Authorization: Bearer <service credential>`. No browser, visitor
   identity, source editing, deployment, or connected user apps are needed.
3. Read back the latest run from GET on the same path using the same access.
   Check its ID matches the POST result. Report only an operational failure;
   user-facing reminders are delivered by the Worker, not a separate chat message.
4. If service access is unavailable, stop and report the operational failure.
   Never make the Site public, create a bypass token or rotate VAPID credentials.
   Network retries are safe because the sender claims each installation/day.

## Validation

`npm test` uses a real in-memory SQLite schema and checks eligibility, DST,
deduplication, disabled/expired plans, stale updates, privacy, ownership,
unattended run readback, and encrypted push headers. `npm run test:reminders`
exercises opt-in, offline resync, closing the day, tomorrow planning, opt-out,
and the real browser Notifications API with the app tab closed. Its push transport
is simulated through Chromium DevTools; it does not prove live phone delivery.
The existing browser/offline and evolution suites remain mandatory regression
checks. Hosted writer readback must be verified before creating its schedule.
Actual Android/iOS delivery, permission, lock-screen tap and power-saving behavior
require the owner to enable reminders and send a test on those devices.
