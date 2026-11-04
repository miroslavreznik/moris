# Moris validation

## Evening-reminder checks, November 4, 2026

- TypeScript and the combined Vite/PWA plus Worker build pass.
- 46 domain, backup, IndexedDB, reminder-policy and SQLite-backed server checks pass.
- The existing 15 browser checks and three evolution checks pass against the production Worker.
- Six additional browser checks verify opt-in eligibility without habit names, offline completion resync, consciously closing a day without completion/XP, tomorrow planning, real system-notification display after closing the app tab, and opt-out/unsubscription.
- The browser's incoming push event is simulated through Chromium DevTools; live push-service delivery to phones is not claimed. The backend tests generate real encrypted Web Push payloads and verify VAPID, aes128gcm and TTL headers.
- A 320 px Settings screenshot was visually inspected. See `docs/reminders.md` for the hosted writer, schedule, privacy and device-validation boundaries.

## Verified locally, October 25, 2026

- TypeScript checking and the production Vite/PWA build pass.
- 35 domain, backup-validation, and IndexedDB tests pass.
- 15 production-browser checks pass in Microsoft Edge, with a Europe/Budapest browser time zone, plus three evolution browser checks.
- Responsive review includes all four screens at 320 CSS px, a 390 px mobile view, and a 1440 px desktop view. Screenshots are generated in ignored `test-results/`.
- The generated service worker precaches the app shell, JavaScript, CSS, fonts, and icons. The normal and demonstration databases are separate.

The browser checks cover:

1. Per-goal 35-day history and persistent retrospective corrections.
2. Flexible weekly quotas and actual dates, with no failed unchosen weekdays.
3. All four screens fitting a 320 px viewport.
4. Onboarding, completion, undo, redo, and refresh without duplicate XP.
5. Habit creation, editing, and archiving.
6. Valid JSON export and rejection of an orphaned-record import without changing data.
7. Restore into a clean installation with both a downloaded and locally stored safety copy.
8. Interval creation and a prospective weekday revision preserving the original completed schedule.
9. Skippable evolution celebration, remembered across undo/redo.
10. Cached offline launch, offline habit creation/completion, and records surviving reload.
11. Reduced motion disabling creature animation without impairing completion.
12. Manifest and standard/maskable icon responses.
13. Completion immediately after midnight using the new local date before the dashboard refresh timer fires.
14. Tapping the habit title or completion icon records today without navigation or a date picker; the separate View history action opens the same habit's existing record without changing it.
15. Weekly habits also record today directly, and Space/Enter toggle completion without duplicate XP. The exported record uses today's local date.

Unit checks additionally cover DST date arithmetic, fixed-schedule missed/due/future states, weekly period boundaries, partial first/changed weeks, historical schedule revisions, archived rewards and archive-day undo, time-zone retention, unique completion indexes, database reopen, transactional replacement rollback, invalid schedules/dates/references/zones, and archiving a not-yet-started habit.

## Remaining release checks

These have **not** been performed and are required before claiming the PRD's full MVP definition of done:

- HTTPS publication is complete at `https://moris-habit-club.miroslavreznik.chatgpt.site`, with native deployment success recorded in `docs/deployment.md`. The private gate responds over HTTPS. Authenticated app navigation, manifest/service-worker/icon responses, and cache-header behavior still require sign-in verification.
- On a physical iPhone, install through Safari's Share → Add to Home Screen; verify standalone launch, safe areas, keyboard/dialog behavior, and manual install guidance.
- On a physical Android phone, verify the available browser install flow and standalone launch.
- On both devices, load online once, close the app, disable the connection, reopen, create/complete a habit, close/reopen, and verify persistence.
- Deploy an updated build over the existing installation. Verify that the update prompt leaves the current session usable and applying it retains habits, revisions, completions, settings, and backups. Automated database reopening is covered; a complete installed-app upgrade on actual hardware is not.
- Verify device-specific audio, muted behavior, optional haptics, reduced motion, storage-permission/failure handling, backup-file saving, and reimport from the real device's file picker.
- Dogfood with a few real habits and review the size/readability of the per-goal cells on the intended phones.

Production deployment is confirmed by Sites independently of the local automated checks. Physical-device validation and authenticated hosted-app checks are not claimed.

## Seven-form evolution upgrade

The added evolution suite passes three browser scenarios in addition to the 13 existing production-browser checks:

- Cosmic Moris unlocks at 1,200 XP with its own SVG illustration, skippable celebration, and next-evolution progress.
- Moris the Infinite unlocks at 2,000 XP. Undo/redo and reload retain all 200 test completions and celebration history without duplicate XP or replayed celebrations.
- A pre-existing higher-XP profile discovers the newly added forms once after an update. The seven-form screen fits at 320 CSS px.

Additional unit checks preserve the original five thresholds, verify both new boundaries, preserve old backup records, and restore celebration state for the added forms. Screenshots are `test-results/new-moris-stages.png` and `test-results/evolution-mobile.png`.
