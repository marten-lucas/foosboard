# Foosboard v1.1.7

## Highlights

- **Erweiterte Testabdeckung**: Lückenlose E2E-Testabdeckung für alle interaktiven Features der Anwendung.

## Neue Test-Suiten

- **`e2e/zoom-pan.spec.ts`** — 6 Tests für Mausrad-Zoom (rein/raus), Zoom-Grenzen (min/max), Pointer-Drag-Pan und Doppeltipp-Reset. Beinhaltet `waitForViewBoxChange`-Hilfsfunktion für zuverlässige Firefox-Synchronisation.
- **`e2e/snapshot-ui.spec.ts`** — 7 Tests für das Snapshot-System: Speichern, mehrere Snapshots, Input-Clearing nach dem Speichern, Store-Zustand, Schuss-Label-Sichtbarkeit, Löschen-Button und Snapshot-mit-Schuss-Szene.
- **`e2e/shot-drawer.spec.ts`** — 10 Tests für den Schuss-Drawer: Style-Auswahl (Gerade/Bande-oben/Bande-unten), Kollisions-Toggle, Tor-Modus (3 vs. 5 Positionen), Schuss-Liste und Löschen.

## Erweiterte bestehende Tests

- **`e2e/board-figure-tilt.spec.ts`**: Neuer Test prüft, dass der `hochgestellt`-Tilt-Zustand die Spielerfigur mit 0,5 Opazität rendert.
- **`e2e/foosboard.spec.ts`**: Neuer Test prüft den Share-Link-Roundtrip — Szene enkodieren, Link öffnen, Ball-Anzahl wiederherstellen.

## Bugfixes

- **Firefox Zoom-Pan-Timing**: `waitForViewBoxChange` verhindert Races zwischen Wheel-Event-Dispatch und React-Re-render in Firefox.
- **Bank-Shot-Assertion**: Korrektur der SVG-Path-Prüfung — Bank-Schüsse rendern als zwei `L`-Segmente (Polyline via Bande), nicht als Bezier-Kurven.
- **Snapshot-UI-Lokalisierung**: Tests nutzen jetzt den tatsächlich gerendertes DOM (offscreen Steuerungs-Section) statt fehlende Sidebar-Komponenten.

## Verified

- `npm run test:unit` passed (37/37)
- `npm run build` passed
- `npx playwright test` passed (188/188) — Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet Safari
