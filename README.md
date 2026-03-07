# Artillery

Ein lokales 2D-Artillery-Spiel mit `Phaser 3` und `Vite`: deformierbares Terrain, Wind, drei Waffen, Highscore, Start-/Help-/Game-Over-Flow und optionaler CPU-Gegner.

## Konzept

Zwei Tanks stehen auf einer prozeduralen Landschaft. Pro Runde bewegt sich der aktive Spieler kurz, richtet das Rohr aus, waehlt Leistung und Waffe und feuert genau einen Schuss. Explosionen verursachen Schaden und tragen Boden ab. Dadurch veraendern sich Sichtlinien, Deckung und Standflaechen permanent.

Das Spiel ist absichtlich klar lesbar gebaut:

- kurze Zuege
- eindeutige Phasen
- gut sichtbarer Wind
- wenige, aber mechanisch unterschiedliche Waffen
- schnelle Restart-Schleife fuer "one more round"

## Spielziel

Bringe den gegnerischen Tank auf `0 HP`, bevor dein eigener zerstoert wird.

Wichtig fuer das Match:

- Wind veraendert jede Flugbahn.
- Krater sind nicht nur Deko, sondern veraendern Schusswinkel und Tankpositionen.
- Direkte Treffer und Treffer nahe am Ziel sind deutlich staerker als Randtreffer.
- Der Highscore zaehlt gewonnene Runden ueber mehrere Matches hinweg.

## Modi

- `Solo vs CPU`: `Amber` gegen den CPU-gesteuerten `Cyan`
- `Local Duel`: zwei Spieler an einer Tastatur

Der Modus kann auf dem Startscreen und nach einer Runde mit `M` gewechselt werden.

## Rundenablauf

Jeder Zug hat zwei klar getrennte Phasen:

1. `Move`
   - `Left / Right` bewegt den aktiven Tank
   - Bewegung ist pro Zug begrenzt
   - `Space` beendet die Bewegungsphase vorzeitig
2. `Aim / Fire`
   - Winkel, Leistung und Waffe einstellen
   - `Space` feuert den Schuss
   - Projektil, Explosion, Schaden und Terrain-Deformation werden voll aufgeloest
   - danach wechselt der Zug

Zusatz-Flow:

- Start mit Attract-Screen
- Overlay beim Spielerwechsel
- ausfuehrlicher Help-Screen
- Game-Over-Screen mit Sieger und Rundenstatistiken

## Controls

- `Left / Right`: Tank bewegen
- `Up / Down`: Rohr anheben / senken
- `A / D` oder `J / L`: Schusskraft reduzieren / erhoehen
- `Q / E`: Waffe wechseln
- `Space`: in `Move` auf `Aim` wechseln, in `Aim` feuern
- `Enter`: Startscreen, Turn-Handoff und Game-Over bestaetigen
- `H`: Help-Screen oeffnen
- `Esc`: Help-Screen schliessen
- `M`: Modus zwischen `Solo vs CPU` und `Local Duel` wechseln
- `R`: neue Runde auf neuer Karte starten

## Waffen

- `Basic Shell`
  - Standardschuss mit ausgewogenem Schaden und Radius
- `Heavy Mortar`
  - langsamer, schwerer, groessere Explosion und groesserer Krater
- `Split Shot`
  - teilt sich in der Luft in mehrere Teilbomben und deckt breitere Flaechen ab

Die Waffen unterscheiden sich nicht nur mechanisch, sondern auch visuell ueber Muzzle-Flash, Trail, Explosion und Schadenstext.

## Wind

Wind ist bewusst mehrfach visualisiert, damit er im Spielfluss sofort lesbar ist:

- HUD-Pfeil / Ribbon mit Richtung und Staerke
- Klartext im HUD (`LEFT`, `RIGHT`, `CALM`, Staerkelabel, Wirkungstext)
- Windsack in der Spielwelt
- Fahnen an den Tanks
- kleine Ambient-Partikel, die in Windrichtung driften
- farbige Flugbahn-Vorschau in der Aim-Phase

## Audio

Das Spiel verwendet ein kleines generiertes Web-Audio-System statt externer Sounddateien:

- Windbett
- Waffen-Schuesse
- Explosionen
- Trefferfeedback

Wichtiger Browser-Hinweis:

- Web Audio wird erst nach echter Benutzerinteraktion freigeschaltet.
- Nach dem Laden einmal klicken, tippen oder eine Taste druecken.
- Wenn Audio im Dev-Tab nicht sofort startet, Seite einmal hart neu laden und erneut interagieren.

## Run

```bash
npm install
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

- prozedurales, deformierbares Terrain
- sichtbare Krater-Deformation mit Bodenabtrag
- Tanks passen sich dem Terrain an und koennen an steilen Raendern rutschen
- drei unterschiedliche Waffen
- Wind als echter Gameplay-Faktor
- Flugbahn-Vorschau in der Aim-Phase
- Startscreen, Help-Screen, Turn-Handoff und Game-Over-Flow
- CPU-Gegner mit einfacher ballistischer Zielsuche
- Rundenstatistiken und persistenter Highscore via `localStorage`
- animierte HP-Bars, Schadenstexte und Trefferfeedback
- Kamera-Fokus bei Schuss und Einschlag
- responsive HUD-Anpassungen fuer kleinere Viewports
- generiertes Audio ohne externe Assets

## Architektur

- `src/main.js`
  - Phaser-Konfiguration, Scale-Setup, Szenenregistrierung
  - Phaser-eigenes Audio ist deaktiviert; Audio laeuft ueber den eigenen `AudioManager`
- `src/game/scenes/BootScene.js`
  - Bootstrapping und kleine Runtime-Assets wie die Partikel-Textur
- `src/game/scenes/GameScene.js`
  - Kern des Spiels: Match-Flow, Input, Projektilsimulation, Explosionen, CPU-Zuege, Kamera, Windanzeige, Overlays, Stats
- `src/game/scenes/UIScene.js`
  - HUD, HP-Bars, Controls-Hinweise, Overlay-Layout, responsive Anpassungen
- `src/game/systems/Terrain.js`
  - Terrain-Generierung, Pixelkollision, Krater-Deformation, Oberflaechenberechnung, Material-Look
- `src/game/entities/Tank.js`
  - Tankdarstellung, Rohr, Animation, Federung, Fahne, Terrain-Ausrichtung
- `src/game/weapons.js`
  - Waffenprofile fuer Mechanik und VFX/SFX-Identity
- `src/game/systems/AudioManager.js`
  - Web-Audio-Synthese und Audio-Unlock nach User-Geste
- `src/game/systems/ScoreStore.js`
  - persistente Highscores in `localStorage`

## Technische Hinweise

- Das Projekt ist local-first und hat kein Backend.
- Terrain und Krater basieren auf einem Canvas-/Pixelmodell. Dadurch bleiben Rendern und Kollisionen konsistent.
- Die Flugbahn-Vorschau wird nicht in jedem Frame voll neu berechnet, sondern nur bei relevanten Aenderungen.
- Ambient- und Stabilitaets-Updates laufen getaktet, um Dev-Mode-Overhead zu begrenzen.

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

- Die CPU ist solide spielbar, aber kein starker Taktik-Gegner mit Mehrzug-Planung.
- Das Spiel ist desktop-first. Kleine Viewports werden abgefedert, es gibt aber keine vollwertige Touch-Steuerung.
- Audio ist bewusst synthetisch und leichtgewichtig statt samplebasiert.
