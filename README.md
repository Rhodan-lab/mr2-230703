# MARBELLA RUN 2

An original, offline Canvas 2D coastal crime game. All visuals are drawn by the
game, all sound is synthesized by Web Audio, and the runtime has no dependencies.

Rico Vela returns to a city being bought out from under its people. Marisol Duarte
knows its streets, Sterling Vane owns its debt, and Captain Reyes controls its port.
Fourteen story missions cross three acts, from a borrowed coupe to a five-star
harbor escape.

## Play locally

Run `node serve.ts --port 8089` with Node 22, then open the local server in a desktop
browser. Enter starts or continues. Press H for the complete controls.

| Input | Action |
| --- | --- |
| WASD / arrows | Walk, drive, or pilot a boat |
| Shift | Sprint |
| Space | Handbrake drift |
| E | Enter or exit a vehicle |
| Mouse / click | Aim / fire |
| Q | Fire using the current aim |
| 1–5 | Fists, pistol, SMG, rifle, shotgun |
| F | Reload |
| M / Enter | Start or retry story / advance dialog |
| J | Begin a nearby side job |
| B | Buy or visit nearby property; store a car at the garage |
| U | Browse and retrieve owned vehicles at Vela Customs |
| L | Use a nearby medical, food, repair, paint or supply service |
| G / Shift+G | Deposit / withdraw at a bank |
| R / V | Change radio / mute audio |
| C | Horn |
| N | Cycle weather in free roam |
| Tab | City atlas and property portfolio |
| K | Save |
| H / Esc | Help / pause |

## Systems

- A seeded 12 by 14 block city with seven districts and 592 buildings for the
  default seed. Rooftops have solar arrays, helipads, tanks, skylights, terraces,
  gardens, antennas, billboards and mechanical equipment. A tower under
  construction and a dock crane are drawn as articulated structures.
- Nine driveable vehicle types, including a leaning motorcycle and a speedboat.
  Vehicle-specific acceleration, lateral grip, inertia, collision impulses,
  damage, smoke, fire, explosion, skid marks and persistent garage storage.
- Lane traffic, staggered signals, pedestrians that stroll, flee, carry umbrellas,
  react to horns and gunfire, and populate beaches and market sidewalks.
- Five wanted levels, police pursuit routing, ramming and shooting, a moving
  helicopter with rotor animation and a searching light, rope deployment,
  arrests, hospital respawns and line-of-sight escape.
- Fists and four firearms, substepped bullets, tracers, impact effects, dropped
  cash and ammunition, armor and health pickups.
- Fourteen missions with dialog portraits, vehicle theft, timed deliveries,
  checkpoint racing, heat survival, evasion, target destruction, convoy ambushes
  and rooftop meetings.
- Boardwalk Circuit, Dockside Rampage, five-fare taxi shifts with tips, and
  narrated boat tours. Neighborhood vehicle-return opportunities appear in
  free roam.
- Six income properties, cash and bank balances, safe respawn locations, repair
  and paint services, resupply, medical care and food.
- Twenty-eight hidden stashes, district and landmark discovery rewards,
  achievements, six working stunt ramps, airborne vehicles and landing bonuses.
- Day, golden hour, dawn and night; rain, puddles, wet roads, thunder and lightning;
  ocean waves, foam, wakes, birds, buoys, fountains and moving palms.
- Velocity-lead camera, speed-dependent zoom, shake, minimap and A-star street
  navigation, full pause/help/atlas/garage menus, procedural title artwork.
- Three original synthesized radio stations, news captions, pitched engines,
  two-tone sirens, rotor thump, weather, weapon and UI sounds.

## Local validation and assembly

`node tools/validate.mjs` runs behavioral simulation checks. With the local game
server and a headless Chrome debugging port at 9239,
`node tools/browser-smoke.mjs` exercises real keyboard input, menus, saving, dialog
and audio. `node tools/capture.mjs` drives each screenshot scene with real keys
and captures four 1280 by 720 JPEGs from Chrome.

`MAKEFUN_OUTPUT_DIR=out node main.ts` audits the game tree and the exact four
screenshots, copies them, verifies the copy and writes the official dossier.
The build has no timestamps or random output. The vendored dossier library is
unchanged. No makefun CLI command or push is part of this repository workflow.

The JSON validation reports record local checks. They are not an official bounty
grade, ranking or win-rate claim.
