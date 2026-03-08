# Crater Command

Ein lokales 2D-Arcade-Artillery-Spiel mit `Phaser 3` und `Vite`: deformierbares Terrain, Wind, vier Waffen mit Munitionslimit, Zugtimer, Wetterbedingungen, vier Terrain-Presets, Highscore, Start-/Help-/Game-Over-Flow und optionaler CPU-Gegner.

## Konzept

Zwei Tanks stehen auf einer prozeduralen Landschaft. Pro Runde bewegt sich der aktive Spieler kurz, richtet das Rohr aus, waehlt Leistung und Waffe und feuert genau einen Schuss. Explosionen verursachen Schaden und tragen Boden ab. Dadurch veraendern sich Sichtlinien, Deckung und Standflaechen permanent.

Das Spiel ist absichtlich klar lesbar gebaut:

- kurze Zuege mit hartem 25-Sekunden-Timer
- eindeutige Phasen
- gut sichtbarer Wind
- vier mechanisch unterschiedliche Waffen, teilweise mit begrenzter Munition
- schnelle Restart-Schleife fuer "one more round"
- zufaellige Terrain-Form und Wetterbedingung je Match

## Spielziel

Bringe den gegnerischen Tank auf `0 HP`, bevor dein eigener zerstoert wird.

Wichtig fuer das Match:

- Wind veraendert jede Flugbahn.
- Krater sind nicht nur Deko, sondern veraendern Schusswinkel und Tankpositionen.
- Direkte Treffer und Treffer nahe am Ziel sind deutlich staerker als Randtreffer.
- Seltene Waffen (Mortar, Split Shot, Bouncer) haben begrenzte Munition — Einsatz will geplant sein.
- Wetterbedingungen (Regen, Nebel, Sturm) veraendern Physik und Wind pro Match.
- Der Highscore zaehlt gewonnene Runden ueber mehrere Matches hinweg.

## Modi

- `Solo vs CPU`: `Amber` gegen den CPU-gesteuerten `Cyan`
- `Local Duel`: zwei Spieler an einer Tastatur

Der Modus kann auf dem Startscreen per Klick auf die Modusflaeche oder per `M` gewechselt werden.

## Rundenablauf

Jeder Zug hat zwei klar getrennte Phasen und einen gemeinsamen 25-Sekunden-Timer:

1. `Move`
   - `Left / Right` bewegt den aktiven Tank
   - Bewegung ist pro Zug begrenzt
   - `Space` beendet die Bewegungsphase vorzeitig
   - laeuft der Timer ab, wechselt das Spiel automatisch in die Aim-Phase
2. `Aim / Fire`
   - Winkel, Leistung und Waffe einstellen
   - `Space` feuert den Schuss
   - laeuft der Timer ab, wird automatisch gefeuert
   - Projektil, Explosion, Schaden und Terrain-Deformation werden voll aufgeloest
   - danach wechselt der Zug

Der Timer gilt nur fuer menschliche Spieler. CPU-Zuege sind zeitunabhaengig.

Zusatz-Flow:

- Start mit Attract-Screen:
  - klickbare Moduswahl
  - Highscore als zwei Spieler-Karten
  - klarer Start-Call-to-Action
- Overlay beim Spielerwechsel
- ausfuehrlicher Help-Screen
- Game-Over-Screen mit Sieger und Rundenstatistiken

## Controls

Desktop (Keyboard + Maus):

- `Left / Right`: Tank bewegen
- `Click` auf Boden: in Move-Phase Ziel setzen
- `Click` auf eigenen Tank: Move-Phase beenden
- `Up / Down` oder Mausbewegung: Rohr ausrichten
- `A / D` oder `J / L` oder Mausrad: Schusskraft aendern
- `Q / E`: Waffe wechseln (ueberspringt leere Waffen automatisch)
- `Click` oder `Space`: feuern
- `Enter`: Overlays bestaetigen
- `H`: Help-Screen oeffnen
- `Esc`: Help-Screen schliessen
- `M`: Modus zwischen `Solo vs CPU` und `Local Duel` wechseln
- `R`: neue Runde auf neuer Karte starten

Mobile (Touch, Landscape):

- `Tap` auf Boden: in Move-Phase Ziel setzen
- `Tap` auf eigenen Tank: Move-Phase beenden
- `Drag` in Aim-Phase: Winkel + Power gleichzeitig
- `Touch loslassen`: feuern
- `Weapon`-Button unten rechts: Waffe wechseln
- `Help`-Button unten rechts: Hilfe oeffnen/schliessen
- Beim ersten Touch versucht das Spiel `Fullscreen` + `Landscape-Lock` (Browser-abhaengig).

## Waffen

- `Basic Shell` — unbegrenzte Munition
  - Standardschuss mit ausgewogenem Schaden und Radius
- `Heavy Mortar` — 5 Schuss pro Match
  - langsamer, schwerer, groessere Explosion und groesserer Krater
  - weniger windanfaellig als die Basic Shell
- `Split Shot` — 3 Schuss pro Match
  - teilt sich in der Luft in drei Teilbomben und deckt breitere Flaechen ab
- `Bouncer` — 3 Schuss pro Match
  - prallt bis zu dreimal am Terrain ab, bevor er explodiert
  - Abprallwinkel folgt der lokalen Hangneiung
  - die Flugbahn-Vorschau markiert den ersten Aufprallpunkt mit einem Ring

Die Waffen unterscheiden sich nicht nur mechanisch, sondern auch visuell ueber Muzzle-Flash, Trail, Explosion und Schadenstext. Die verbleibende Munition steht im HUD neben dem Waffennamen.

## Terrain-Presets

Pro Match wird zufaellig eines von vier Terrain-Profilen gewaehlt:

- `Standard` — wellige Huegel, der klassische Modus
- `Valley` — tiefes Mittetal, Tanks starten auf hohen Graten links und rechts
- `Fortress` — breite flache Plattformen mit steilen Klippen dazwischen
- `Chaos` — viele enge Huegel, kein freier Schussweg garantiert

Krater legen sichtbare Bodenschichten frei (Erde, Lehm, Stein, Fels).

## Wetter

Zu Beginn jedes Matches wird zufaellig eine Wetterbedingung gewaehlt:

- `Kein Wetter` (haeufigstes Ergebnis) — normales Spiel
- `Regen` — sichtbare Regentropfen, Schwerkraft auf alle Projektile +12 %
- `Nebel` — halbtransparentes Overlay reduziert die Sichtweite
- `Sturm` — Wind wird nach jedem Schuss komplett neu gewuerfelt

Die aktive Bedingung steht im HUD-Centertext.

## Wind

Wind ist bewusst mehrfach visualisiert, damit er im Spielfluss sofort lesbar ist:

- HUD-Pfeil / Ribbon mit Richtung und Staerke
- Klartext im HUD (`LEFT`, `RIGHT`, `CALM`, Staerkelabel, Wirkungstext)
- Windsack in der Spielwelt
- Fahnen an den Tanks
- kleine Ambient-Partikel, die in Windrichtung driften
- farbige Flugbahn-Vorschau in der Aim-Phase

## Zugtimer

- 25 Sekunden pro Zug (Move + Aim kombiniert)
- Fortschrittsbalken im HUD-Zentrum
- Balken faerbt sich orange bei ≤ 10 s, rot und blinkend bei ≤ 5 s
- Ablauf in Move-Phase: automatischer Wechsel in Aim
- Ablauf in Aim-Phase: automatisches Feuern der aktiven Waffe
- CPU-Zuege sind vom Timer ausgenommen

## Audio

Das Spiel verwendet ein kleines generiertes Web-Audio-System statt externer Sounddateien:

- dezentes Windbett auf Basis von gefiltertem Rauschen
- Waffen-Schuesse (je Waffe eigenes Profil)
- Bouncer-Aufprall-Sound
- Explosionen
- Trefferfeedback
- Titelsong (als externe OGG-Datei, dezent abgemischt)

Die Lautstaerke ist auf ein ausgewogenes Verhaeltnis zwischen Hintergrundmusik und aktiven Spielsounds optimiert.

Wichtiger Browser-Hinweis:

- Web Audio wird erst nach echter Benutzerinteraktion freigeschaltet.
- Das Spiel nutzt einen vorgeschalteten **Boot-Screen**, um diese Interaktion (Audio-Unlock + Fullscreen) technisch sauber abzuhandeln, bevor das eigentliche Match startet.

## Boot-Screen & Einstellungen

Beim ersten Laden erscheint ein eigenstaendiger Boot-Screen:
- **Technische Initialisierung**: Schaltet Audio-Kontext frei und fordert (optional) Fullscreen an.
- **Einstellungen**: Fullscreen und Sound können vorab konfiguriert werden.
- **Persistenz**: Gewaehlte Einstellungen werden im `localStorage` gespeichert und beim nächsten Start automatisch geladen.
- **Transition**: Ein weicher Fade-Out leitet zum eigentlichen Spiel-Startscreen über.

## Run

```bash
npm install
npm run lint
npm run dev
```

Dev-Server:

- `vite` startet lokal und zeigt im Browser uebliche `[vite] connected`-Logs
- vereinzelte `requestAnimationFrame`-Warnings im Dev-Modus sind moeglich und nicht automatisch ein Gameplay-Fehler

## Build

```bash
npm run build
```

Optional zum Testen des Produktions-Builds:

```bash
npm run preview
```

## Features

- prozedurales, deformierbares Terrain mit vier Preset-Typen
- sichtbare, organische Krater-Deformation mit gezackten Rändern, Vertiefungen und Bodenschichten
- waffenspezifische Impact-Decals (Scorch/Staub) auf dem Terrain
- Tanks passen sich dem Terrain an und koennen an steilen Raendern rutschen
- vier unterschiedliche Waffen, drei davon mit begrenzter Munition
- Bouncer-Waffe mit physikalisch korrekter Terrain-Reflektion
- Ammo-System: Cycling ueberspringt leere Waffen automatisch
- 25-Sekunden-Zugtimer mit Auto-Feuer bei Ablauf
- Wetterbedingungen: Regen, Nebel, Sturm
- Wind als echter Gameplay-Faktor
- Flugbahn-Vorschau in der Aim-Phase (Bouncer: Aufprallpunkt-Indikator)
- Startscreen mit klickbarer Moduswahl, Score-Karten und CTA
- Help-Screen, Turn-Handoff und Game-Over-Flow
- CPU-Gegner mit ballistischer Zielsuche, Fehlerkorrektur und situativer Waffenwahl
- Rundenstatistiken und persistenter Highscore via `localStorage`
- animierte HP-Bars, Schadenstexte und Trefferfeedback
- arcade-lastige Trefferinszenierung: Screen-Flash, Shockwave, Impact-Shards, Hit-Callouts (`DIRECT HIT`)
- kurzer Hit-Stop bei starken Treffern fuer mehr Impact
- Kamera-Fokus bei Schuss und Einschlag
- responsive HUD-Anpassungen fuer kleinere Viewports + Landscape-Guard auf Touch-Geraeten
- generiertes Audio ohne externe Assets
- Phase-1-Arcade-Foundation: Event-Bus, konfigurierbare Feature-Flags, getrennte Scoring-/Mutator-Systeme als Erweiterungsschicht
- Phase-2-Arcade-Scoring: Combo-Multiplikator, Skillshots (`DIRECT HIT`, `BANK SHOT`, `LONG SHOT`, `LAST SECOND`) und Live-Score im HUD
- Phase-3-Mutatoren: turn-basierte Modifikatoren (`Low Gravity`, `Wind Pulse`) plus `Sudden Death` Damage-Scaling ab spaeter Runde
- Phase-4-Inszenierung: KO-Finisher-Callout, staerkere Combo-Ansagen und optional `Reduced Motion`-Modus (`V`)
- Phase-5-QA-Layer: lokale Round-Telemetrie (Hit-Rate, Direct-Hit-Share, durchschnittliche Rundenlaenge) fuer Balance-Tuning

## Architektur

- `src/main.js`
  - Phaser-Konfiguration, Scale-Setup, Szenenregistrierung
  - Phaser-eigenes Audio ist deaktiviert; Audio laeuft ueber den eigenen `AudioManager`
- `src/game/scenes/BootScene.js`
  - Technischer Einstiegspunkt und Standalone-Screen.
  - Handelt Audio-Unlock, Fullscreen-Anfragen und initiale Benutzereinstellungen (Sound/Fullscreen) ab.
  - Persistiert Einstellungen via `LaunchPreferencesStore` im `localStorage`.
  - Startet Game/UI erst nach Benutzer-Interaktion ("START") mit Fade-Transition und entfernt sich danach selbst aus dem Speicher.
- `src/game/scenes/GameScene.js`
  - Kern des Spiels: Match-Flow, Keyboard/Maus/Touch-Input, Projektilsimulation, Bounce-Physik, Explosionen, CPU-Zuege, Kamera, Windanzeige, Zugtimer, Overlays, Stats und Modusumschaltung
  - `create()` ist als Spine in Setup-Schritte geteilt (`setupCoreSystems`, `setupRuntimeState`, `createFxLayers`, `setupInputHandlers`, `setupSceneLifecycle`)
  - emittiert zusaetzlich Arcade-Events (Shot/Bounce/Damage/Turn/Round) fuer entkoppelte Folge-Features
  - enthaelt Finisher-Inszenierung und Reduced-Motion-Schalter fuer Accessibility
- `src/game/scenes/UIScene.js`
  - HUD, HP-Bars, Zugtimer-Balken, Controls-Hinweise, Overlay-Layout, mobile Buttons, Portrait/Landscape-Guard und responsive Anpassungen
  - Help-Overlay als eigener Dialog mit 2-Spalten-Layout, hartem Clip und Scrollbar innerhalb des Dialograhmens
  - kompakter Turn-/Spielerwechsel-Dialog mit separatem, kollisionsfreiem Textlayout
- `src/game/config/sceneContracts.js`
  - zentrale Scene-Keys (`boot/game/ui`) und Game->UI Event-Namen (`hud:update`, `overlay:update`, ...)
- `src/game/arcade/arcadeConfig.js`
  - zentrale Feature-Flags, Scoring-/Mutator-Parameter und Accessibility-Defaults
- `src/game/arcade/events.js`
  - Event-Namen fuer die Arcade-Schicht
- `src/game/systems/ArcadeEventBus.js`
  - kleiner pub/sub Event-Bus fuer Gameplay-Events
- `src/game/systems/ArcadeScoringSystem.js`
  - konsumiert Arcade-Events und fuehrt Round-Metriken getrennt vom Core-Loop
  - berechnet Combo-Multiplikator, Skillshot-Boni und HUD-Feed
- `src/game/systems/MutatorSystem.js`
  - waehlt und verwaltet aktive Turn-Mutatoren
  - beeinflusst Wind, Schwerkraft und Damage-Multiplikatoren
- `src/game/systems/TelemetrySystem.js`
  - sammelt Match-Metriken aus Arcade-Events
  - speichert Rolling-History lokal in `localStorage` und liefert Tuning-Summary
- `src/game/systems/Terrain.js`
  - Terrain-Generierung mit vier Presets, Pixelkollision, unregelmaessige Krater-Deformation, Impact-Decals, Bodenschicht-Gradient, Oberflaechenberechnung
- `src/game/systems/WeatherSystem.js`
  - Wetterbedingungen: Regen-Partikel, Nebel-Overlay, Sturm-Windwuerfelung, Schwerkraft-Modifikator
- `src/game/entities/Tank.js`
  - Tankdarstellung, Rohr, Animation, Federung, Fahne, Terrain-Ausrichtung, Ammo-Tracking
- `src/game/weapons.js`
  - Waffenprofile fuer Mechanik, Munitionslimits und VFX/SFX-Identity
- `src/game/systems/AudioManager.js`
  - Web-Audio-Synthese, dezente Wind-Ambience, Bouncer-Sound und Audio-Unlock nach User-Geste
- `src/game/systems/ScoreStore.js`
  - persistente Highscores in `localStorage`
- `src/game/systems/InputController.js`
  - kapselt Keyboard/Pointer/Wheel-Input inkl. sauberem `bind()`/`destroy()`
- `src/game/systems/OverlayStateSystem.js`
  - kapselt Overlay-State-Machine und Overlay-Textaufbau (Start/Turn/Help/GameOver)
- `src/game/systems/VisualFxPool.js`
  - pooled kurzlebige VFX-Objekte (Callouts, Damage-Text, Debris, Impact-Shards) gegen GC-Spikes
- `src/game/ui/MobileControls.js`
  - entkoppelt mobile HUD-Buttons (Weapon/Help) von der UIScene
- `src/game/ui/OrientationGuard.js`
  - kapselt Portrait/Landscape-Guard inkl. Pause/Resume-Logik

## Technische Hinweise

- Das Projekt ist local-first und hat kein Backend.
- Terrain und Krater basieren auf einem Canvas-/Pixelmodell. Dadurch bleiben Rendern und Kollisionen konsistent.
- Terrain-Presets teilen denselben Canvas-Workflow; nur `buildSurface()` ist je Preset verschieden.
- Bounce-Physik nutzt die lokale Hangneigung aus `surfaceY` fuer die Normalenreflektion.
- Die Flugbahn-Vorschau wird nicht in jedem Frame voll neu berechnet, sondern nur bei relevanten Aenderungen.
- Ambient- und Stabilitaets-Updates laufen getaktet, um Dev-Mode-Overhead zu begrenzen.
- Wetter-Updates fuer Regen laufen ebenfalls getaktet (30 Hz), Fog und Storm haben keinen laufenden Update-Overhead.

## Phasenstatus

- `Phase 1` abgeschlossen: Arcade-Foundation (Events, Config, Scoring-/Mutator-Systeme, Lint-Workflow)
- `Phase 2` abgeschlossen: Skillshots + Combo-Meta + HUD-Scoring
- `Phase 3` abgeschlossen: Turn-Mutatoren + Sudden-Death-Skalierung
- `Phase 4` abgeschlossen: Finisher-Inszenierung + Reduced Motion
- `Phase 5` abgeschlossen: lokale Telemetrie + QA-Overlay-Daten
- `Phase 6+` offen: Crates/Events, weitere Meta-Progression

## Refactor-Status (Skill-Plan)

- `Refactor Phase 1` abgeschlossen (Architektur-Spine):
  - gemeinsame Scene-/Event-Kontrakte in `sceneContracts.js`
  - `GameScene.create()` in klar getrennte Setup-Methoden zerlegt
  - `BootScene` startet Ziel-Scenes per Kontrakt und stoppt sich danach
- `Refactor Phase 2` abgeschlossen (Gameplay-Module):
  - Input aus `GameScene` in `InputController` extrahiert
  - Overlay-Flow in `OverlayStateSystem` extrahiert
  - `GameScene` delegiert Overlay-Methoden und bleibt Orchestrator
- `Refactor Phase 3` abgeschlossen (UI-Entkopplung):
  - Touch-Buttons aus `UIScene` in `MobileControls` extrahiert
  - Orientation-Handling in `OrientationGuard` extrahiert
  - `UIScene` hat nun zentrale UI-Cleanup-Hooks (`shutdown`/`destroy`)
- `Refactor Phase 4` abgeschlossen (Performance):
  - `VisualFxPool` eingefuehrt fuer haeufige, kurzlebige VFX-Objekte
  - `GameScene` nutzt Pooling fuer Damage-Text, Impact-Callouts, Debris und Impact-Shards
  - reduziert create/destroy-Spitzen in Explosion-lastigen Spielsituationen
- `Refactor Phase 5` abgeschlossen (Overlay-Dialoge):
  - Help-Dialog von Grund auf mit eigener Geometrie neu aufgebaut
  - Scrollbereich, Masken und Scrollbar sind fest an den Dialog-Content gebunden
  - Turn-Dialog kompakter gemacht und Text-Ueberlagerungen im Spielerwechsel beseitigt

## Troubleshooting

- Kein Audio:
  - einmal in die Seite klicken oder eine Taste druecken
  - dann erneut schiessen
- `The AudioContext was not allowed to start`:
  - meist fehlende User-Geste oder ein noch offener alter Dev-Tab
- `requestAnimationFrame handler took ... ms`:
  - Dev-Mode-Performance-Hinweis, kein automatischer Fehler
  - fuer realistischere Performance `npm run build` und `npm run preview` nutzen
- Falscher Stand im Browser:
  - Tab hart neu laden, damit das aktuelle Vite-Bundle verwendet wird

## Bekannte Tradeoffs

- Die CPU nutzt eine brute-force Schusssuche mit Fehlerkorrektur; sie plant keine Mehrzug-Strategien.
- Der Bouncer wird von der CPU nicht eingesetzt, da die Bounce-Simulation im Planner nicht implementiert ist.
- Das Spiel laeuft auf Touch-Geraeten am besten in Landscape. Fullscreen/Orientation-Lock ist browserabhaengig und kann nicht auf jedem Geraet erzwungen werden.
- Audio ist bewusst synthetisch und leichtgewichtig statt samplebasiert.
- Der Zugtimer gilt nicht fuer CPU-Zuege und wird bei offenen Overlays pausiert.
