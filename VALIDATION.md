# Final local validation

MARBELLA RUN 2 was assembled and checked locally. No makefun CLI, remote grading
command, push, dependency installation, external asset download or image generator
was used.

## Build and gate-equivalent checks

- Ran `MAKEFUN_OUTPUT_DIR=out node main.ts` twice.
- Preserved the first output in `out-first/`; `diff -r out-first out` produced no
  differences. The audit also compared every file byte for byte.
- Rebuilt the dossier using the unchanged official `buildDossier` API and verified
  byte equality with `out/dossier.json`.
- Game tree: **42 entries, 238,014 bytes**.
- `game/index.html`: **768 bytes**.
- Game JavaScript: **40 modules, 6,604 lines**.
- Every module was imported in its own Node ES-module process, with no errors.
- All static module references resolve to regular files inside the game tree.
- `grep -rE 'https?://' game/` produced no matches. No game source contains a
  fetch, XHR, WebSocket, EventSource or Worker network-loading call.
- Dossier: **1,072,400 bytes**, below the required 1,572,864-byte cap.
- Dossier SHA-256:
  `3ac1c6c996cd1aa4db1cf7bbd337490f05e28926d30f1021befec30bc075162e`.
- Local game_files, references, screenshots, dossier_matches and js_parses checks
  all **PASS**. These are local checks, not an official bounty grade.
- Protected vendor file, LICENSE and owner metadata have no differences from the
  supplied starter commit.

## Screenshots

Exactly four JPEGs were captured from the game in headless Chrome, after real
keyboard driving or walking. All four were separately checked with Pillow at
1280 × 720. No screenshot pixels were painted or composited outside the game.

| File | Bytes | Live scene |
| --- | ---: | --- |
| 1-chase.jpg | 198,810 | Rain at night, five-star pursuit, helicopter and searchlight, cruisers, burning wreck, tracers, neon, mission HUD, GPS and speedometer |
| 2-goldenhour.jpg | 154,508 | Golden Palma Row drive, ocean foam, palms, beach crowds, umbrellas, traffic, shadows and property marker |
| 3-city.jpg | 202,769 | Rico on foot beside a fare taxi, dense downtown traffic, pedestrians, property marker, construction crane and varied roofs |
| 4-boat.jpg | 121,377 | Driven Marlin, foam wake, dock containers and crane, moored and ambient boats, birds, buoys and delivery objective |

## Behavior and browser checks

`tools/validate.mjs` passed **17** checks covering seeded generation, road and
water collision, vehicle physics, entry and exit, NPC heat attribution, all
fourteen mission paths, mission failure and retry, substituted delivery vehicle
rejection, property income, saving and garage persistence, five taxi fares,
services, helicopter deployment, arrest and hospital recovery, A-star routes,
escaping aerial pursuit, stunt jumps, and long finite-state simulations.

`tools/browser-smoke.mjs` exercised title and help, real vehicle entry and driving,
pause/save/resume, city atlas, story dialog, radio switching and a running Web Audio
context. It recorded **zero JavaScript exceptions** and **42 local requests**.

`tools/capture.mjs` recorded zero exceptions across the four capture scenarios.
Each scenario also reported finite entity positions.

Machine-readable reports are `validation-gameplay.json`,
`validation-browser.json`, `validation-capture.json` and `validation-output.json`.
