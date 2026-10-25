# Moris visual directions

Status: Sunday Club is the working visual direction for the implemented local MVP. The founder preferred its clean, understandable style and asked to retain Oddly Good's readable progress visualization, with a separate view of how each goal is going. Round-one feedback was that the initial concepts were too similar; six concepts remain preserved across the two rounds.

Source of product requirements: `Moris_PRD_MVP_PWA_EN.md` (version 1.0, October 25, 2026).

## Field Notes

A warm, slightly editorial habit journal. Cream paper, olive green, serif display type, quiet dividing lines, and a botanical, hand-drawn-looking Moris. Habits form a simple vertical checklist with large completion targets. The companion occupies a compact horizontal strip.

- Palette: paper `#FAF8F1`, ink `#293126`, olive `#526C43`, light green `#E9EDDF`.
- Type: DM Serif Display for headlines; DM Sans for controls and content.
- Completion: olive filled check, immediate progress, a small creature bounce.
- Character: asymmetrical green blob, outlined eyes, little sprout; fins appear at the first evolution.
- Best fit: a calm daily ritual with some oddness around the edges.

## Oddly Good

A bold, playful identity with lime green, ink outlines, chunky controls, expressive typography, and a pink creature. The reward strip uses an offset shadow and reversed character/text layout. Individual habits are tactile outlined blocks. Weekly goals are separated with lighter dashed framing.

- Palette: paper `#F4F3ED`, ink `#25281F`, lime `#D3F576`, creature pink `#F4A6DC`.
- Type: Bricolage Grotesque for display and interface text.
- Completion: dark filled check with lime tick; immediate XP and creature wobble.
- Character: a lopsided pink creature with a crooked antenna and uneven eyes.
- Best fit: the PRD's playful, slightly ridiculous personality. Initial suggestion; not selected by the founder.

## Soft Orbit

A softer, spacious companion app. Lavender surfaces, rounded white cards, a purple creature, and circular completion controls. Daily habits use a two-column card layout followed by a full-width row. Flexible weekly goals stay in their own section.

- Palette: lavender background `#F4F1FA`, ink `#382F4E`, purple `#7960A5`, tint `#E8DFF5`.
- Type: DM Sans, with restrained display sizing.
- Completion: purple filled circle and tinted finished card; a gentle character response.
- Character: a soft purple bean with small eyes and subtle cheek patches.
- Best fit: a reassuring, companion-led experience.

## Preview boundaries

The concepts use sample data. They demonstrate Today, completion/undo, a weekly goal, XP/evolution feedback, adding a daily habit, and secondary navigation. Their sample history is illustrative. These are design prototypes, not the IndexedDB-backed PWA, and are not evidence that MVP acceptance criteria pass.

The editable inline preview is stored in this chat's durable visualization directory as `moris-directions.html`. No existing application was present in the project folder at the start of this work.

## Second round: distinct compositions and interaction metaphors

The second editable preview is `moris-explorations.html` in the same durable visualization directory. The previous concepts are preserved for comparison.

### Night Lab

A dark personal evolution laboratory. A translucent organism sits in a compact observation window with concentric microscope markings. A monospaced observation log replaces conventional rounded habit cards; completing a habit records an observation. A segmented energy readout sits below the specimen. Flexible weekly fieldwork has its own quota row.

- Palette: near-black green `#131B1C`, illuminated chartreuse `#D9F58B`, muted technical gray.
- Type: Space Grotesk and IBM Plex Mono.
- Original character: translucent amoeba, tiny nucleus face, membrane lobes, new appendage at the first milestone.

### Pocket Arcade

A physical terracotta handheld with an inset monochrome LCD screen. Daily habits become three raised keycaps with indicator lamps; pressing a key visibly depresses it. Flexible weekly movement has a separate wide hardware-style key. The specimen is a small original pixel creature with bent antennae and broad feet.

- Palette: terracotta `#DF684C`, cream keycaps `#F9EDCF`, LCD green `#C5CDAE`, dark brown.
- Type: Space Grotesk, IBM Plex Mono, and Silkscreen within the LCD.
- This is an interaction/visual metaphor, not a separate game; completing a real-world habit remains one tap.

### Sunday Club

A cobalt typographic poster with an orange cut-paper cyclops. Oversized condensed type, square edges, dotted paper texture, and ticket-shaped habit controls create a zine aesthetic. Completion stamps an admission ticket; the weekly target is a separate orange strip. The club name is a brand metaphor, not a proposal for social functionality.

- Palette: paper `#F2EFE4`, cobalt `#1839D5`, orange `#EB6B36`.
- Type: Barlow Condensed with IBM Plex Mono for ticket details.
- Original character: spiky cut-paper silhouette, one large eye, tiny smile, new appendages at a milestone.

## Implementation after the visual choice

1. React + TypeScript + Vite foundation, PWA manifest/icons/service worker, versioned IndexedDB repository, offline shell, and safe update handling.
2. Independent scheduling and progress domain: calendar-date arithmetic, schedule revisions, four schedules, unique daily completions, deterministic streaks, weekly partial-start handling, and XP. Verify these with domain tests.
3. English onboarding, habit creation/editing/archiving, Today, history corrections, progress, and completion undo.
4. At least three original vector character forms, non-blocking completion effects, optional sound, reduced motion, and milestone celebrations.
5. Versioned validated JSON export/import, safety backup, browser/offline/update tests, accessibility and responsive review.

No accounts, subscriptions, backend, external analytics, or cloud synchronization are required for this MVP.

The PRD supplies enough information to begin implementation after the design choice. An HTTPS deployment destination and physical iPhone/Android installation/offline checks will be needed before declaring the complete MVP done; desktop emulation alone does not satisfy the PRD.

## Implemented interpretation of the latest feedback

- Keep Sunday Club's cream paper, cobalt type and rules, orange original character, condensed headlines, and ticket-shaped completion controls.
- Today includes a last-seven-days strip for every relevant habit. Its name or history strip opens that specific goal's Progress view; the completion target remains one tap.
- Progress starts with a separate overview for each habit. Fixed schedules show a two-week grid, current streak, and total completions. Weekly targets show the actual quota for the current week.
- Each goal has its own 35-day calendar with completed, missed, due, neutral, and future states, plus current/best streaks and schedule revision history.
- Flexible goals additionally show up to 12 weekly quota rows with the actual completion dates. Unchosen weekdays are neutral, rather than fabricated daily misses.
- Users can make clearly labeled retrospective corrections. XP and streaks recalculate from records.
- The actual app replaces design-only behavior with IndexedDB persistence, safe backups, offline caching, and real domain calculations. `/?demo=1` uses a separate demonstration database; the normal app starts with onboarding.
