# Moris validation

## Verified locally, October 25, 2026

- TypeScript checking and the production Vite/PWA build pass.
- 32 domain, backup-validation, and IndexedDB tests pass.
- 13 production-browser checks pass in Microsoft Edge, with a Europe/Budapest browser time zone.
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

Unit checks additionally cover DST date arithmetic, fixed-schedule missed/due/future states, weekly period boundaries, partial first/changed weeks, historical schedule revisions, archived rewards and archive-day undo, time-zone retention, unique completion indexes, database reopen, transactional replacement rollback, invalid schedules/dates/references/zones, and archiving a not-yet-started habit.

## Remaining release checks

These have **not** been performed and are required before claiming the PRD's full MVP definition of done:

- Deploy a production build over HTTPS with appropriate navigation fallback/cache headers.
- On a physical iPhone, install through Safari's Share → Add to Home Screen; verify standalone launch, safe areas, keyboard/dialog behavior, and manual install guidance.
- On a physical Android phone, verify the available browser install flow and standalone launch.
- On both devices, load online once, close the app, disable the connection, reopen, create/complete a habit, close/reopen, and verify persistence.
- Deploy an updated build over the existing installation. Verify that the update prompt leaves the current session usable and applying it retains habits, revisions, completions, settings, and backups. Automated database reopening is covered; a complete installed-app upgrade on actual hardware is not.
- Verify device-specific audio, muted behavior, optional haptics, reduced motion, storage-permission/failure handling, backup-file saving, and reimport from the real device's file picker.
- Dogfood with a few real habits and review the size/readability of the per-goal cells on the intended phones.

No production deployment or physical-device validation is claimed by the automated checks.
