# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

No linter, no test runner. Verify changes by running `npm run build` — a clean build is the only automated check.

Always push after completing each requested change: `git add -A && git commit -m "..." && git push`. Do not ask for confirmation before pushing.

## Architecture

Phaser 3 game with two parallel scenes running simultaneously:

- **GameScene** (`src/game/scenes/GameScene.js`, ~1750 lines) — owns all gameplay state: match flow, turn phases (move → aim → resolve), projectile simulation, bounce physics, explosion/terrain deformation, CPU AI, wind, weather, camera, overlays. Emits events (`hud:update`, `turn:banner`, `overlay:update`, `timer:update`) for UIScene to consume.
- **UIScene** (`src/game/scenes/UIScene.js`, ~800 lines) — pure display layer. Listens to GameScene events and renders HUD, HP bars, turn timer bar, banners, and all overlays (start, turn handoff, help, game-over). No gameplay logic.

The two scenes never call each other directly except `this.scene.get('game')` in UIScene to subscribe to events and read initial state.

### Key systems

| File | Purpose |
|------|---------|
| `src/game/systems/Terrain.js` | Canvas-based terrain: procedural generation (4 presets), pixel collision (`isSolid`), crater deformation (`deformCircle`), surface-Y cache |
| `src/game/systems/WeatherSystem.js` | Rain/fog/storm per match; exposes `gravityModifier()` and `applyStormWind()` |
| `src/game/systems/AudioManager.js` | Web Audio synthesis for gameplay SFX/ambience with a dedicated effects gain stage |
| `src/game/systems/TitleSongManager.js` | HTMLAudio-based title music loop with configurable music level |
| `src/game/systems/BattleSongManager.js` | HTMLAudio-based battle music loop with configurable music level |
| `src/game/systems/audioMixConfig.js` | Shared audio level defaults, clamps and stepping helpers |
| `src/game/systems/ScoreStore.js` | localStorage persistence |
| `src/game/entities/Tank.js` | Phaser Container; owns `ammo` map, `pitch`, `power`, `weaponIndex` |
| `src/game/weapons.js` | `WEAPONS` array — single source of truth for all weapon stats including `ammo` (null = unlimited) and `maxBounces` |

### Overlay system

GameScene holds `this.overlayState` (null or a plain object with `type`, `title`, `body`, etc.). Calling `showOverlay(payload)` / `clearOverlay()` emits `overlay:update` which UIScene renders. Overlay types: `start`, `turn`, `help`, `gameover`.

### Projectile lifecycle

`spawnProjectile(config)` pushes to `this.projectiles[]`. Each frame `updateProjectiles(dt)` steps physics, calls `traceProjectile` (returns `{x, y, type: 'terrain'|'tank'}` or null), handles bouncing (bouncer weapon), triggers `explode()`, and cleans up. When `this.projectiles` empties after resolving, `advanceTurn()` fires after a 650 ms delay.

### CPU AI

`computeCpuShotPlan` brute-forces pitch (18–82°) × power (220–520) for each candidate weapon. `this.cpuLastMiss` stores the previous shot's delta to the target and biases the next search. Bouncer is never in CPU candidates (bounce sim not implemented).

### Ammo

`Tank.initAmmo(WEAPONS)` seeds the map at match start. `GameScene.cycleWeapon(player, dir)` skips weapons with 0 ammo. `fireActiveWeapon()` checks and decrements ammo.

### Turn timer

`TURN_TIME_LIMIT = 25` seconds (constants.js). Counts down only during human turns when no overlay is active. Emits `timer:update` each frame. Expiry auto-advances move→aim or auto-fires in aim phase.

## Conventions

- JavaScript only (no TypeScript).
- Phaser audio disabled globally; gameplay SFX go through `AudioManager` (Web Audio API), while title/battle music use dedicated HTML audio managers.
- Terrain uses `destination-out` composite op to carve craters — always `save()`/`restore()` around it.
- `syncHud()` emits the full HUD state; call it after any state change visible in the HUD.
- `markPredictionDirty()` triggers a prediction redraw next frame — call after pitch/power/weapon/terrain changes.
- Weapon definitions in `weapons.js` drive both gameplay and VFX/SFX — add all per-weapon parameters there.
