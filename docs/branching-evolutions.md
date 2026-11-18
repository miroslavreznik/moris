# Four Moris lines — local playtest

The four fixed lines are shared by the normal app and the development playtest.
Public app: <https://miroslavreznik.github.io/moris/>.

## Open the test

```powershell
npm run lab
```

Open <http://127.0.0.1:5173/?evolutionLab=1>.

1. Pick **Test this line** on one of the four cards.
2. Use **Test stage** or **Next milestone** to inspect its seven forms.
3. Select **Stage 6 · 2000 XP** for the holographic finale. The foil moves on
   its own and follows pointer/touch movement over Moris.
4. **Replay transformation** shows the transition from the previous stage.
5. Expand **Compare all 28 forms** to compare the four complete lines.
6. **Reset test** clears only the fictional lab data. Leave the line unselected
   and advance to stage 1 to test the real four-card selection flow.

The lab allows switching lines for comparison. The normal app saves one
permanent line selection; later XP milestones advance automatically.

The development-only lab uses the separate `moris-evolution-lab-v1` IndexedDB
database and disables reminder registration, sync and push subscription work.
Normal local records and public app records are separate. Opening
`?evolutionLab=1` on a production build does not enable the lab. On a phone on
the same Wi-Fi, use the development server's printed Network URL and append
`?evolutionLab=1`; the computer must remain running and reachable.

## The four authored lines

The approved early **Moris / Proměny** concept is the art reference. There is
no combinatorial rendering or per-milestone direction mixing.

| Line | Seven forms, from 0 to 2000 XP |
| --- | --- |
| Original Moris — “Dnes” | Original spiky Moris, fins, legs, furry ridge, superhero, cosmic ring, infinite Moris |
| Odd Zoology | Droplet Moris, Tidal Moris, Tripod Moris, Crawler Moris, Sailfin Moris, Manta Moris, Infinity Moris |
| Paper Life | Pyramid Moris, Concertina Moris, Paper Strider Moris, Wingfold Moris, Kite Moris, Ribbon Moris, Grand Rosette Moris |
| Botanic Creature | Seed Moris, Sprout Moris, Bud Moris, Blossom Moris, Chalice Moris, Canopy Bloom Moris, Grand Bloom Moris |

The normal app offers four previews at the first unlocked milestone. The
selected line then follows the unchanged XP thresholds: 30, 100, 250, 700,
1200 and 2000. A selection made after several unlocked milestones goes to the
current earned stage. The original eye and smile geometry, chosen color and
personal quirk remain shared. All 28 forms are authored SVG art, including real
openings in the infinity, ribbon and rosette bodies. Every stage has its own
name, shown in the lab cards, comparison gallery, whole-line preview and journey.

Every final form has a moving masked rainbow interference band and a soft
specular glint, resembling holographic card foil. The effect follows only the
painted silhouette, leaves the face legible and reacts to pointer movement.
System reduced-motion preference keeps a static iridescent finish.

## Refinement of the middle and final forms

Odd Zoology stage 4 keeps the crawler's long body, curled tail and six limb
positions; connected fin membranes bridge those legs into the stage 5 manta.
Paper Life stage 4 has one coherent kite body, and its final ribbon unfolds
into a deliberate sixfold rosette. Botanic follows a closed bud into the
existing eight-petal flower, then develops its cupped corolla into the hanging
bloom and a layered grand blossom. The former separated tree stages are gone.

## Existing data and backups

Habits, completions and XP are not rewritten. Earlier installations without a
line keep their original Moris until they choose. Previous prototype v5 mixed
histories migrate to the earliest chosen line, retaining the old records as
historical metadata. The fixed renderer ignores mixed history.

Backups export **version 6**, including `evolutionLine`. Versions 1–5 remain
importable. Undoing XP preserves the selected line and already celebrated
milestones. A new milestone's celebration marker is saved before its scene is
shown. Async selection/celebration callbacks are invalidated by undo, reset,
restore or closing the chooser to avoid obsolete scenes after delayed writes.
A saved scene waits for an open editor to close, so evolution cannot interrupt
a habit draft or stack a second dialog.

## Normal local PWA

```powershell
npm run build
npm run preview
```

Open <http://127.0.0.1:4173/>. This production-style preview has offline support;
its reminder backend is temporary and uses local test keys.

## Checks

```powershell
npm test
npm run build
npm run test:branching
npm run test:companion
npm run test:evolution
```

The historical `test:branching` script name now tests four fixed lines, all 28
authored forms, final-only foil, reduced motion, one-time selection, automatic
progress, compatibility and lab isolation. It defaults to port 5173. Set
`MORIS_PRODUCTION_TEST_URL=http://127.0.0.1:4173` to include the production guard.
The companion and evolution suites use the production preview on port 4173.

Art modules: `MorisCore.tsx`, `MorisZoologyFixed.tsx`, `MorisOrigamiFixed.tsx`,
`MorisBotanicFixed.tsx`. `Moris.tsx` shares the face and masked final foil;
`moris-foil.css` owns its animation and reduced-motion behavior.

The release upgrade check uses two Pages builds on one isolated browser origin:

```powershell
$env:MORIS_PREVIOUS_DIST = 'path/to/previous/pages/dist'
$env:MORIS_NEXT_DIST = 'path/to/candidate/pages/dist'
npm run test:pwa-upgrade
```

It verifies the real Save & update prompt, exact preservation of all five
IndexedDB stores, voluntary legacy-line adoption, version 6 export and offline
reopen. It uses fictional records in a new browser context and intercepts all
reminder traffic; it does not touch the live installation or send notifications.
