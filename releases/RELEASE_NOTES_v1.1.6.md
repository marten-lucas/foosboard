# Foosboard v1.1.6

## Highlights

- **Cross-Browser-Kompatibilität**: Vollständige Unterstützung für iOS Safari, Firefox und mobile Browser.
  - `setPointerCapture` wird jetzt in beiden Drag-Einstiegspunkten (Ball und Stange) aufgerufen – verhindert abgebrochene Touch-Drags auf iOS Safari.
  - Viewport-Höhe korrigiert: `100dvh` statt `100vh` verhindert Layout-Sprünge beim Einblenden der Adressleiste auf iOS.
  - Safe-Area-Unterstützung: Header-Bar und Stage berücksichtigen Notch/Home-Indicator via `env(safe-area-inset-*)`.
  - `viewport-fit=cover` im Meta-Tag ergänzt.
  - PWA-Meta-Tags für Apple Mobile Web App ergänzt.
  - `overscroll-behavior: none` und `-webkit-touch-callout: none` global gesetzt.
  - Build-Target auf `es2019` gesenkt für breitere Browser-Kompatibilität.
- **Tilt-Toggle-Zuverlässigkeit**: Tilt-Hitflächen (transparente Rects über den Spielerfiguren) haben jetzt `data-testid` und reagieren auf `onClick` statt nur `onPointerDown` – funktioniert damit auch in Firefox mit Touch-Emulation.

## Testing

- Playwright-Konfiguration um 5 neue Browser-Projekte erweitert: Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 13), Tablet Safari (iPad Pro 11).
- Neue Test-Suite `e2e/cross-browser.spec.ts` mit 7 Tests für Board-Rendering, Portrait-Layout, Touch-Drag, Doppeltipp-Zoom und Safe-Area.
- Bestehende Tests für Tilt-Toggle, SVG-Verhältnis und Responsive-Board auf Cross-Browser-Toleranzen angepasst.

## Verified

- `npm run test:unit` passed (37/37)
- `npm run build` passed
- `npx playwright test` passed (113/113) — Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet Safari
