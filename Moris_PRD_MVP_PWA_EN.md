# Moris — Product Requirements Document (PRD)

**Version:** 1.0 (MVP specification)  
**Date:** October 25, 2026  
**Status:** Ready as an initial design and development brief; final visuals and illustrations still need to be created  
**Platform:** Mobile-first web app + installable Progressive Web App (PWA) for iOS and Android  
**Product language at launch:** **English throughout** (onboarding, navigation, labels, feedback, settings, notifications, error messages, accessibility labels, and help content). Architecture should support future localization.

> **Product idea:** *Every repetition changes you.*  
> **Working tagline:** *Every repetition changes you.*

---

## 1. Executive summary

**Moris** is a playful app for building and maintaining habits. Users set up habits such as reading, exercising, avoiding their phone in the morning, or going for a walk. They then open the app and **mark a habit complete with a single tap**. Completion is designed to feel especially satisfying: an immediate visual state change, a short animation, optional sound, and a visible addition to the progress history. Each completion also contributes to the **evolution of a funny creature named Moris**.

Moris should not feel like a corporate task manager. It should be friendly, a little absurd, visually playful, and **extremely fast for everyday use**.

**Core product priority:** Checking off a habit should be easier than opening a notes app or a paper tracker. Gamification should reinforce the core action, never get in its way.

**Technical priority:** PWA support is part of the foundation, not a later enhancement. The first useful version must launch from a phone's home-screen icon, work offline, and preserve data locally. No account or payment is required for the MVP.

## 2. Context and problem

### 2.1 Why this product exists

- Existing habit apps can offer enjoyable onboarding but quickly introduce a subscription paywall.
- Traditional habit trackers are functional but often fail to make checking something off emotionally rewarding.
- Paper checklists offer a satisfying feeling of filling a box and seeing a growing row of completed days.
- Some habits are daily; others happen every other day or twice per week. One universal daily streak is misleading.

### 2.2 Jobs to be done

1. **When I finish a habit,** I want to check it off in a second and feel rewarded.
2. **When I look back at the week or month,** I want to see clearly that I'm improving and sticking to my own plan.
3. **When I miss an occurrence,** I want to know what is missing without losing all my previous progress.
4. **When I use the app on my phone,** I want to access it as easily as a native app.

### 2.3 Target audience

**Primary:** Individuals who want to maintain 2–6 recurring habits and are motivated by visual progress. Initially, the founder will use the product personally (dogfooding), followed by a small group of testers.

**Secondary, later:** People who respond well to light gamification, collectible progress, and playful reminders.

## 3. Product principles

1. **One tap to done.** No confirmation dialog for routine completion.
2. **Delight without delay.** Make the microinteraction rewarding, but do not block the next action.
3. **Progress you can see.** History must be understandable at a glance, including partial weekly goals.
4. **Your schedule, not a daily guilt trip.** Unscheduled days are not failures.
5. **Never punish a missed day by resetting the creature.** A miss can break a streak but must not erase earned evolution.
6. **Fun, not childish.** Humor and warmth without overwhelming the interface.
7. **Local-first.** Immediate offline use, with transparent backup and sync limitations.
8. **English-first.** All shipping product copy is in English, consistently and without mixed-language screens.

## 4. Scope and prioritization

| Priority | Feature | MVP? |
|---|---|---|
| P0 | Create, edit, and archive habits | Yes |
| P0 | Repetition: daily, every N days, selected weekdays, X times per week | Yes |
| P0 | One-tap completion and undo | Yes |
| P0 | Optional sound, immediate animation, clear filled/completed state | Yes |
| P0 | Today dashboard for relevant habits | Yes |
| P0 | Day/week history with clearly visible empty slots | Yes |
| P0 | Accurate streak and weekly-goal calculations | Yes |
| P0 | Moris character with several evolution stages | Yes |
| P0 | Installable PWA, offline use, and local persistence | Yes |
| P0 | JSON backup export/import | Yes |
| P0 | Sound and reduced-animation settings | Yes |
| P0 | Complete English-language UI and content | Yes |
| P1 | Haptic feedback where supported | Optional |
| P1 | Advanced statistics and yearly overview | Later |
| P1 | Push reminders | Later |
| P1 | Accounts and cross-device sync | Later |
| P2 | Character customization and items | Later |
| P2 | Sharing progress, friends, competitions | Later |
| P2 | Monetization | Outside MVP |

**Out of scope for the MVP:** Subscriptions/paywall, social network, inventory, mini-games, generative 3D evolution, wearables, AI coaching, and multi-device synchronization. No backend is required for the first version.

## 5. Primary user journeys

### 5.1 Onboarding: create the first habits

**Goal:** Reach a useful first screen without registration in approximately 1–2 minutes.

1. **Welcome:** Introduce the idea “Every repetition changes you” and show Moris in its initial form.
2. **Choose suggested habits:** “Read”, “Work out”, “No phone after waking up”, “Go for a walk”, “Meditate”, or “Create my own”.
3. **Configure each selected habit:** Choose a frequency with sensible defaults. Optionally edit its name, color, and icon.
4. **Enter Today:** No mandatory account, payment card, or paywall.
5. **Offer installation:** Show “Add to Home Screen” guidance after the first meaningful moment (for example, the first completion), and make it available in Settings.

**Exception:** Onboarding can be completed with just one habit. If no habits are selected, display a helpful empty state.

### 5.2 Everyday use: mark it done

1. The user launches Moris from the phone's home-screen icon.
2. They see relevant habits, weekly goals, and a short progress summary.
3. They tap the large completion target for one habit.
4. The completion is **persisted locally immediately**, and the UI switches to its completed state without waiting for a server.
5. A short rewarding animation plays, with optional sound and haptics. The history cell fills and XP increases.
6. Moris reacts briefly. If the user reaches an evolution milestone, show a special, skippable celebration.
7. The user can undo the completion. XP and derived statistics update accordingly.

### 5.3 Reviewing progress

- A habit detail screen shows the **last 28–35 days** as a compact grid or calendar. Completed scheduled dates stand out; missed scheduled dates remain visibly empty; unscheduled dates are neutral.
- For a goal of “2 times per week,” the primary unit is the week: for example **1/2 this week**, with 8–12 weeks of progress. Users can also inspect the specific dates they completed it.
- Daily and every-other-day habits show a current and best streak counted by **scheduled opportunities**, not necessarily calendar days.
- Users can correct historical records without earning duplicate rewards.

## 6. Scheduling and consistency rules (critical domain logic)

### 6.1 Supported schedule types

| Type | Example | Behavior |
|---|---|---|
| `daily` | Read every day | Due every local calendar day from its start date. |
| `interval` | Run every other day | Due every N calendar days from a defined `anchorDate` (e.g. N = 2). |
| `weekdays` | Gym on Mon + Thu | Due only on selected weekdays. |
| `weekly_target` | Gym twice per week | Target at least X **distinct calendar days** per Monday–Sunday week, with no fixed weekdays. |

**Specification:** Weeks start on Monday and end on Sunday. In the MVP, a completion represents “this habit was done on this local calendar date” (at most once per day), not multiple repetitions in the same day. The completion stores the local date and time zone used when recording it.

### 6.2 Day and week states

- `completed`: Completed.
- `due`: Scheduled but not yet completed (today/current period).
- `missed`: A scheduled opportunity or closed period ended without completion.
- `not_scheduled`: No activity required on that date; **do not represent this as failure**.
- `future`: A scheduled date in the future.

For a **`weekly_target`**, individual uncompleted weekdays should **not** be marked `missed`, since the user can choose which days to complete the goal. A week becomes `completed` once the target X is reached; it becomes `missed` only after the week ends with fewer than X completions. During the week, show partial progress such as “1/2”.

After a user meets a twice-weekly goal, they can optionally record another completion on a different day. It appears in history, but the weekly streak is based on meeting the threshold. The same date must never count twice.

### 6.3 Streak definitions

- **Daily / interval / selected weekdays:** Number of consecutive **scheduled opportunities** completed. Ignore non-scheduled dates. Today's outstanding occurrence does not break a streak before the day ends.
- **X times per week:** Number of consecutive **successful calendar weeks**. The currently open week does not break the preceding streak; it can extend the streak as soon as its target is reached.
- **Best streak:** Historical maximum under the same schedule-specific rules.
- **Historical edits:** Recompute all streaks and statistics deterministically from completion records, rather than incrementing a mutable counter.
- **Schedule changes:** New schedules take effect prospectively from a selected date (default: today). Historical statistics use the schedule revision that was effective at that time. Do not silently rewrite past obligations.

### 6.4 Edge cases

- **Crossing midnight:** A completion is assigned to a local calendar date at the time of recording. Later travel must not shift it to a different historical date.
- **Daylight saving time:** Calculate schedules using calendar dates, not elapsed blocks of exactly 24 hours.
- **Habit created midweek:** Do not penalize the first **partial week** as a failed weekly target. The setup could offer a next-Monday start or a partial progress-only week. **MVP default:** Display the partial first week but do not count it as a failed week for streak purposes.
- **Archived habit:** Remove it from Today but retain its history and previously earned XP.
- **Backdated completion:** Allow it, but make it clear that the entry is being recorded retrospectively.
- **Duplicates:** Enforce a unique `(habitId, localDate)` pair.

## 7. Core interaction: completion as a reward

### 7.1 State sequence

**Idle → tap → confirmed check → animation → updated progress → brief Moris reaction.**

The visual state must change **without a network round trip**. Target initial feedback within approximately **100 ms** on a typical phone. The animation should last approximately **400–800 ms** and must not block subsequent actions.

Suggested animation:

1. A prominent empty checkbox fills with a slight spring motion.
2. A checkmark appears with a subtle “pop.”
3. Three to six small colorful particles fly from the checkbox toward the progress indicator or Moris.
4. The day/week indicator advances smoothly, and XP is added.
5. Moris gives a brief funny reaction: a blink, jump, wobble, or wiggle.

**Audio:** Use a short original pleasant sound (such as a soft pop with a tiny chime), at a restrained volume. Provide a separate toggle and persist the setting. Play audio only in response to deliberate user interaction and within browser/platform constraints.

**Haptics:** Use only if genuinely available through the browser and device; never make them a dependency. Do not assume haptics will work in an iOS PWA.

**Reduced motion:** Respect `prefers-reduced-motion`, displaying a clear static final state with at most a gentle fade. Users can independently disable extra animations and sound.

**Undo:** Keep an accessible undo action. Re-completing the same habit on the same day must never produce duplicate records or XP.

### 7.2 Reward design principle

**Filling a real cell in a meaningful personal plan matters more than random confetti.** Completion must remain satisfying and legible even with animation and sound switched off. History and progress updates are the main reward; effects amplify them.

## 8. Moris: character and evolution

### 8.1 Fantasy evolution, not a biology lesson

Moris begins as a funny single-celled creature and gradually becomes a more complex fantastical being. This is **not** a claim that real biological evolution proceeds along one straight line from a protozoan to a fish, monkey, and human. The progression is a **fictional metamorphosis** inspired by evolutionary imagery.

The character must be **original**. Do not copy appearance, assets, or personality from existing apps or film characters.

### 8.2 Proposed stages (configurable)

| Stage | Working name | Visual transformation | XP threshold |
|---|---|---|---:|
| 1 | **Proto-Moris** | A blob with eyes and exaggerated expressions | 0 |
| 2 | **Finny Moris** | A tiny swimming creature with fins | 50 |
| 3 | **Leggy Moris** | A creature with new legs and clumsy movement | 150 |
| 4 | **Primate-ish Moris** | A furrier, more self-confident form | 350 |
| 5 | **Super Moris** | A highly stylized, absurd final super-form | 700 |

*These are working creative names rather than realistic biological stages. For the MVP, three to five polished illustrations and a few short reactions are enough; the table defines the desired range.*

### 8.3 XP system

- The first valid completion of a given habit on a given local date earns **+10 XP**.
- Additional completions of the same habit on that same date are not allowed and earn no more XP.
- XP is derived from valid stored completions. If a completion is undone or corrected, recalculate XP.
- Missing an occurrence **never subtracts previously earned XP** or downgrades Moris's evolved form.
- No coins, purchases, quests, or leaderboards.
- Crossing a threshold unlocks the next stage, with a brief skippable celebration the first time it is reached.
- After the final stage, XP and history continue to be displayed. Further character forms/customization can come later.

**Implementation note:** The MVP does not need a finely tuned game economy. Keep XP values and thresholds in configuration so they can be adjusted without data migrations.

### 8.4 Character's role in UX

Moris should be visible on the home screen, but **must not occupy most of the viewport**. The character should not require care through a separate mini-game. The purpose of its reactions is to make repeated real-world effort feel visibly meaningful.

## 9. Information architecture and screens

### 9.1 Today / Home (top priority)

**Suggested mobile-first order:**

1. Simple header: “Today,” local date, and optionally one short encouraging line.
2. Compact Moris character with evolution progress and XP remaining to the next stage.
3. **Habit list:** Large touch targets, name, icon/color, completion status, and context such as “Due today” or “This week: 1/2.”
4. Small weekly summary / “2 of 3 due today completed.” Do not create a misleading daily denominator for flexible weekly targets.
5. Add-habit action.

**Interaction:** One tap on the completion area. Finished habits stay visible in a separate or visually muted section. Show weekly-target habits every day until the weekly target is met; afterward, show them as achieved, optionally allowing an extra completion on a different day.

### 9.2 Habit details

- Habit name and schedule.
- Prominent current and best streak, with appropriate units (“scheduled completions” or “weeks”).
- Grid of the last 28–35 days for fixed-day schedules, with an understandable status legend.
- Weekly targets show weekly states such as **0/2, 1/2, 2/2** and separately highlight the days on which the habit was actually completed.
- Browse and correct history; edit settings.

### 9.3 Moris evolution

- Larger illustration of the current evolution stage.
- XP progress toward the next stage.
- Overview of unlocked forms (future forms may appear as silhouettes).
- Short playful descriptions; no complex story system.

### 9.4 Settings

- Enable/disable sound and extra animations.
- PWA installation guidance / “Add to Home Screen” if not already installed.
- **Export data** to a JSON file.
- **Import data** from a JSON file (validate format and confirm whether to replace/merge; safer MVP recommendation: replace only after creating a fresh backup).
- Explanation that data is saved locally and not automatically synchronized.
- All copy, controls, confirmations, and error messages in English.

### 9.5 Navigation

Bottom navigation: **Today · Progress · Moris · Settings**. If a simpler flow is faster, progress can live directly inside individual habit detail screens and navigation can be reduced to three tabs. Minimize interactions required to complete a habit.

## 10. Visual and interaction design

**Direction:** Playful, original, slightly ridiculous creature design alongside crisp, readable UI and a clear information hierarchy. Moris must feel neither like a corporate fitness dashboard nor an overstimulating children's game.

### 10.1 Visual attributes

- Warm or neutral background with vivid accents.
- Large, tactile-looking checkboxes; completed states with strong contrast.
- Springy animation and subtle lively microinteractions.
- Recognizable Moris silhouette even at app-icon size.
- Short, playful English microcopy; avoid excessive jokes, prompts, or notifications after every completion.
- Prefer original SVG/2D illustrations. 3D is not required for the MVP.

### 10.2 Accessibility

- Aim for at least 44 × 44 CSS px touch targets wherever the design allows.
- Do not communicate a state through color alone; use checkmarks, labels, outlines, and/or texture.
- Add accessible labels for screen readers.
- Provide visible keyboard focus and accessible dialogs.
- Respect `prefers-reduced-motion`, muted devices, and sound settings.
- Make accessibility text and user-facing assistive instructions English at launch.

## 11. PWA from the first milestone (P0)

### 11.1 Requirement

**Do not ship the first externally testable version as an ordinary website while postponing PWA support.** Installability and offline functionality must be implemented in the first technical increment.

### 11.2 Acceptance requirements

1. Include `manifest.webmanifest` with `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, theme/background colors, **192×192 and 512×512 icons**, plus a suitable maskable icon and `apple-touch-icon`.
2. Serve the production app over **HTTPS** (local development is exempt).
3. A service worker caches the **app shell and essential static assets**, enabling launch after the initial successful load without a connection.
4. Store habits and completion records in **IndexedDB**, not only in memory or `localStorage`.
5. Core functionality works without a backend: create a habit, complete it, edit history, and view Moris while offline.
6. Reconnecting does not require syncing because MVP data lives on one device.
7. App updates must not silently delete local records. Implement versioned database migrations and a safe app-shell update strategy.
8. On supported Android browsers, enable the platform's installation prompt when available. **On iOS, show clear manual “Add to Home Screen” instructions**; do not depend on `beforeinstallprompt`.
9. Installed PWA launches in standalone mode, respects safe-area insets and bottom navigation, and works on small portrait screens.
10. Test on **real iPhone and Android hardware**, not desktop emulation alone.

### 11.3 Data safety and limitations

Without an account, MVP has no cloud backup or automatic migration between devices. Clearing browser data, uninstalling, or browser storage restrictions can cause permanent data loss. **Communicate this plainly** and offer straightforward manual export/import. Long-term reliability for a broader audience will likely require optional accounts and synchronization later.

### 11.4 Performance goals (targets to validate, not guarantees)

- On reopening the installed app, render available local data immediately.
- Target initial completion feedback within approximately 100 ms; never wait for a network request.
- Use small optimized assets and animations that minimize unnecessary layout reflows.
- Target smooth everyday navigation on a midrange smartphone.

## 12. Recommended implementation (non-binding stack)

**Suggested stack for a fast MVP:**

- **Frontend:** React + TypeScript + Vite.
- **UI/styling:** Tailwind CSS or a simple design-token system.
- **Animation:** Motion for React / CSS transitions; Moris as SVG and possibly small sprite animations.
- **PWA:** `vite-plugin-pwa` / Workbox for manifest, precaching, and update handling.
- **Local database:** IndexedDB via Dexie.
- **Date logic:** Standardized local `YYYY-MM-DD` dates with well-tested calendar/time-zone handling; select a date library if needed.
- **Tests:** Vitest for domain logic, Playwright for browser end-to-end tests, and manual device QA.
- **Hosting:** Simple static HTTPS hosting with SPA fallback and appropriate cache headers.

**Architecture rule:** Keep scheduling, progress, streaks, and XP calculations independent of UI components. This preserves the option of adding sync or a native wrapper without rebuilding domain logic.

### 12.1 Proposed domain model

```ts
type Schedule =
  | { type: 'daily' }
  | { type: 'interval'; everyNDays: number; anchorDate: string }
  | { type: 'weekdays'; days: number[] } // 1 = Mon ... 7 = Sun
  | { type: 'weekly_target'; targetCount: number };

type Habit = {
  id: string;
  title: string;
  icon: string;
  color: string;
  createdAt: string; // ISO instant
  startDate: string; // YYYY-MM-DD, local calendar date
  archivedAt?: string;
};

type ScheduleRevision = {
  id: string;
  habitId: string;
  effectiveFrom: string; // YYYY-MM-DD
  schedule: Schedule;
};

type Completion = {
  id: string;
  habitId: string;
  localDate: string; // YYYY-MM-DD
  timeZone: string; // e.g. Europe/Prague, captured at write time
  createdAt: string; // ISO instant
};

type Settings = {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  locale: string; // default: 'en'
};
```

**Data constraints:** Unique `(habitId, localDate)` index for `Completion`. Retain historical `ScheduleRevision` entries. Treat XP, streaks, progress, and Moris's evolution stage as **derived values**, not separately mutable counters.

**Data migration:** Versioned IndexedDB schema and versioned JSON export format (`schemaVersion`). Import must validate the JSON structure and record references, generate a safety backup before replacing existing records, and prevent loss of current data if the file is invalid.

## 13. Acceptance criteria and test scenarios

### A. Habit creation and scheduling

- [ ] I can create a daily “Reading” habit, and it appears on Today.
- [ ] I can create “Gym twice a week” without selecting fixed weekdays.
- [ ] I can create “Run every other day” with predictable due dates from the start/anchor date.
- [ ] I can create “Exercise on Mon + Thu”; Tuesday is not shown as missed.
- [ ] Editing a schedule does not silently change the historical schedule or past obligations.
- [ ] All onboarding prompts, templates, schedule labels, and errors are in English.

### B. Completion

- [ ] One tap records a completion with no additional confirmation.
- [ ] I immediately see the filled checkbox, updated progress, and a rewarding animation.
- [ ] Optional sound plays only when enabled and permitted by the browser.
- [ ] A record survives refresh, app closure, and reopening the installed PWA.
- [ ] Undo restores the state without duplicate completions or XP.
- [ ] Reduced motion or disabled animation does not impair completion.

### C. Time rules and streaks

- [ ] An unfinished daily habit today does not break an existing streak until midnight has passed.
- [ ] An unscheduled day does not break an every-other-day streak.
- [ ] Completing a “twice weekly” habit on Tuesday and Thursday produces `2/2` for that week.
- [ ] A “twice weekly” habit with one completion becomes a failed week only after Sunday ends.
- [ ] Two attempts to complete the same habit on one date count only once.
- [ ] Time-zone or daylight-saving changes do not move historical completion dates.

### D. Moris and progress history

- [ ] Each valid completion adds 10 XP and updates the evolution progress indicator.
- [ ] Crossing a threshold triggers a celebration that can be skipped.
- [ ] Missing a habit never removes previously earned XP.
- [ ] The grid distinguishes `completed`, `missed`, `due`, `not_scheduled`, and `future`.
- [ ] Weekly goals display week-based consistency, not a fabricated daily streak.

### E. PWA and data

- [ ] Users can install or add Moris to their home screens on supported iOS and Android devices.
- [ ] After the first successful load, the installed app can open and run offline.
- [ ] Without internet, I can create a habit and complete it; records remain after a restart.
- [ ] A JSON backup can be exported and restored into a clean installation.
- [ ] Deploying an update does not erase IndexedDB data.
- [ ] The product does not falsely imply it offers cloud sync.
- [ ] Installation guidance, backup warnings, and errors are in English.

## 14. Analytics and product success

For a personal MVP, external analytics are not required. When testing with a broader audience, and **with informed consent where required**, consider tracking:

- **Activation:** Share of new users who create a habit and record their first completion.
- **Time to first check:** Time between first launch and first completion.
- **D7/D30 retention:** Return and meaningful usage after 7/30 days.
- **Habit adherence:** Completed scheduled opportunities divided by closed scheduled opportunities; calculate weekly goals from completed weeks.
- **PWA install adoption:** Share of installations where installation state can be measured reliably.
- **Qualitative delight:** Ask users “How satisfying was marking a habit done?” and “Would you like to come back tomorrow?”

**First validation:** Test with 5–10 people for at least two weeks. Observe whether the one-tap interaction is genuinely faster, weekly targets make sense, and character evolution motivates without creating extra work.

## 15. Development milestones

### Milestone 0 — PWA foundation

- Set up React/TypeScript, basic design system, and HTTPS deployment.
- Add manifest, icons, service worker, and offline app shell.
- Create IndexedDB repository, versioning, and initial persistence tests.
- Verify installation and launch on a physical smartphone.
- Configure English as the only shipped language for the initial release.

**Deliverable:** A simple installable, offline-launchable Moris shell.

### Milestone 1 — Habit tracking core

- Onboarding and habit creation/editing/archiving.
- Four schedule types, domain calculations, and edge-case tests.
- Today screen with completion/undo and immediate local persistence.
- Habit detail view, calendar/grid, and weekly goal overview.

**Deliverable:** A trustworthy habit tracker, without gamification yet.

### Milestone 2 — Delight and Moris

- Distinctive check-off interaction, optional audio, and accessible alternatives.
- Original illustrations of initial evolution stages, Moris reactions, and XP.
- Evolution celebrations and refinement of playful English microcopy and mobile details.

**Deliverable:** The distinctive product experience that gives Moris its identity.

### Milestone 3 — Beta quality

- JSON export/import, validation, database migrations, and data-loss safeguards.
- iOS Safari PWA and Android Chrome PWA tests, including offline/update/time-zone cases.
- Usability improvements informed by dogfooding and a small tester cohort.
- Final review to ensure every visible and accessibility-facing string is in English.

**Deliverable:** First shareable beta.

## 16. Definition of Done (MVP)

The MVP is complete when:

1. Without creating an account, users can set up 1–6 habits and complete them with one tap.
2. Daily, every-other-day, selected-weekday, and X-times-per-week schedules work accurately, including historical progress.
3. Completion feels rewarding and the result is clear even without sounds or animations.
4. Moris reacts visually and unlocks at least three original evolution stages.
5. The app is installable as a PWA on supported iOS/Android devices, launches offline, and persists all core actions locally.
6. Users can create and restore a data backup.
7. All critical scenarios in Section 13 pass and real-device tests have been performed.
8. **Every user-facing part of the MVP is in English.**

## 17. Risks and decisions

| Risk | Mitigation |
|---|---|
| Animations look good but slow down checking off habits | Make all effects non-blocking and update the core state instantly. |
| Weekly goals and streaks misrepresent progress | Distinguish fixed scheduled days from flexible weekly quotas; thoroughly test calculations. |
| Users lose locally stored records | Clear explanation plus JSON export/import; prioritize cloud backup after validation. |
| Character art consumes too much development time | Start with 2D/SVG and 3–5 stages, not a 3D game. |
| Concept resembles an existing competitor too closely | Create an original Moris character, art style, animations, and product voice. |
| Audio/haptics are inconsistent between devices | Treat them as enhancements, never the only completion signal. |
| Evolution falsely implies a scientific linear progression | Present the progression explicitly as fictional metamorphosis. |
| English strings are mixed with another language | Maintain a single English copy source and include localization checks in QA. |

## 18. Ideas after MVP validation

- Optional accounts with a considered sync approach and cloud backups.
- Local or push reminders according to platform capabilities.
- More flexible goals: minutes, quantities, rest days, and multiple sessions in one day.
- Subtle visual customization of Moris based on different habit types.
- Shareable monthly “habit imprint” as a poster or graphic.
- Original accessories, environments, or cosmetic items without pay-to-win mechanics.
- Additional interface languages, once English product copy is stable.

---

## 19. Short brief for a development agent

> Build a mobile-first PWA named **Moris** according to this PRD, with **all user-facing UI and content in English**. Start with Milestone 0: an HTTPS-hosted installable app, offline app shell, IndexedDB, and basic mobile UI. Then implement and test habit scheduling and streak logic. Only after the core tracker works should you add the rewarding completion animation and original 2D character evolution. Do not introduce login, subscriptions, or a backend without an explicit requirement. Prioritize instant one-tap feedback, visibly filling history, and offline reliability. Every milestone must produce a runnable, testable build.

**Note:** The final Moris character designs and brand identity should be original. The stage names and XP thresholds here are adjustable starting assumptions.

## 20. Technical references

- MDN — [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- MDN — [Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- web.dev — [PWA installation](https://web.dev/learn/pwa/installation)
