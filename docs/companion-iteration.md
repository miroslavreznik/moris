# Personal Moris and daily delight

Implemented from the founder's feedback after more than a week of actual use,
November 4, 2026. Moris keeps its existing visual direction and remains a PWA.

## One Moris, yours

The name is always Moris. Choose one of five colors (Tangerine, Moss, Lilac,
Lagoon, Rose) and one detail (Freckles, Little tuft, Crooked antenna). Three
starting combinations are shown side by side with real rendered previews.
The selected color and single detail follow every evolution, including the
Cosmic and Infinite forms. Previewing a combination does not save it until
Save my Moris is selected. Choices remain freely editable in Moris or Settings.

New users can choose their Moris before starting their habits. Existing users
keep the familiar Tangerine appearance with Freckles until they choose otherwise.
There are no names, collectible currencies, purchases, unlock requirements, or
new character species in this iteration.

## Reactions

- A short greeting on opening an onboarded app, then gentle breathing and an
  occasional blink. Returning after at least a minute in the background also
  gets a greeting, without rewarding quick app switching. The stable tap target
  and page layout do not move.
- Tap Moris to say hello. It changes neither XP nor habit history.
- Ordinary completions cycle through a hop, a wiggle and a spin, with a visible
  +10 XP reaction. Rapid completions restart the reaction rather than queueing
  increasingly long animations.
- Finishing the last fixed-day goal gets a larger double hop. Flexible weekly
  goals remain separate from that fixed-day denominator.
- Evolution uses a short old-form/new-form transformation with a halo and small
  decorative sparks. Skip animation, Continue, Close and Escape remain usable
  immediately. The appearance survives the transformation.
- Both the system's reduced-motion preference and Extra animations off disable
  creature, eye, XP and transformation movement. Static progress remains visible.
- No sad, disappointed or punitive reaction is added for unfinished days.

## Progression

One unique habit/date completion still earns 10 XP. The cumulative evolution
thresholds are **0, 30, 100, 250, 700, 1200, 2000 XP**. The first three evolutions
therefore need 3, 10 and 25 completions; later milestones are unchanged.

Existing earned XP and completion history are never scaled or recreated. Lower
early thresholds can unlock a new form for an existing user on their next visit;
the highest eligible form is celebrated once, using the existing celebration
history. Undo still recalculates derived XP, and redo does not replay a remembered
evolution. There are no XP rewards for opening the app or personalizing Moris.

## Compatibility

IndexedDB stays at schema version 1. The optional appearance fields extend the
existing settings record without deleting or recreating any table. Backups stay
at schemaVersion 1. New backups retain both choices; older backups default to
Tangerine/Freckles. Invalid imported appearance values are rejected before any
records are changed. Habit names, schedules, dates, zones and completion history
are unchanged by appearance edits.

The existing opt-in browser push service, evening review and daily Site schedule
are retained. No second schedule or new push keys are created by this iteration.
Real Android/iOS delivery still needs a test notification after the owner grants
notification permission on the device; automated browser push transport is
simulated in the reminder regression suite.

## Verification

Unit coverage checks the new exact XP boundaries, preserved later milestones,
old settings records, valid appearance backup round trips, legacy defaults and
invalid imports. The companion browser suite checks comparison and selection in
onboarding, greetings without XP, completion reaction variety, the first unlock
at 3 wins, skipped transformation, all seven personalized forms, reload, 320 px
layout, export/restore into another installation, offline launch and both motion
preferences. Original browser, evolution and reminder suites remain regression
checks. A further update smoke check verifies an existing config/history remains
intact across service-worker updates.
