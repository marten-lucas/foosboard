# Cross-Browser Compatibility — Evaluation & Refinement Plan

## 1. Evaluation

### Target browsers

| Browser | Engine | Priority | Notes |
|---|---|---|---|
| Chrome / Edge ≥ 108 | Blink | ✅ Primary | Fully supported, CI-tested |
| Firefox ≥ 115 | Gecko | ✅ High | ESR baseline; no known blockers |
| Safari ≥ 16 / iOS Safari ≥ 16 | WebKit | ✅ High | Key mobile target; several issues identified |
| Safari 14–15 / iOS 14–15 | WebKit | ⚠️ Medium | Partial `dvh` / `env()` support |
| Samsung Internet ≥ 19 | Blink | ⚠️ Medium | Chromium-based; generally fine |
| Chrome Android | Blink | ✅ High | Same engine as desktop Chrome |

---

### Issues identified (pre-fix)

#### Critical — breaks iOS Safari

| # | File | Problem | Root cause |
|---|---|---|---|
| C1 | `src/App.tsx` | Ball and rod drags drop pointer mid-gesture on mobile | `setPointerCapture` was never called; iOS Safari requires explicit capture to keep sending `pointermove` events once the finger moves off the originating element |
| C2 | `src/styles.css` | App height collapses when iOS Safari address bar is visible | `height: 100vh` does not account for the dynamic address bar; needs `100dvh` fallback |
| C3 | `src/styles.css` | Content hidden under iPhone notch / home indicator | Missing `env(safe-area-inset-*)` padding and `viewport-fit=cover` |
| C4 | `index.html` | Viewport meta missing `viewport-fit=cover` | Required for edge-to-edge layouts on notched iPhones |

#### High — degraded experience on Safari / mobile

| # | File | Problem | Root cause |
|---|---|---|---|
| H1 | `src/styles.css` | iOS rubber-band scroll competes with board drag | `overscroll-behavior: none` was missing on `body` |
| H2 | `src/styles.css` | iOS long-press shows callout / magnifier on SVG | `-webkit-touch-callout: none` was missing |
| H3 | `src/styles.css` | Text selection activates during drag | `-webkit-user-select: none` missing on SVG |
| H4 | `src/styles.css` | Blue tap-flash on interactive SVG circles | `-webkit-tap-highlight-color: transparent` missing |
| H5 | `vite.config.ts` | `es2020` target excludes Safari 13.x (globalThis, optional chaining) | Build target too high; Safari 13 ships on iOS 13 which is still ~4 % market share |
| H6 | `index.html` | No PWA/home-screen meta tags | App cannot be saved to home screen cleanly on iOS |

#### Medium — minor cosmetic or edge-case issues

| # | File | Problem | Notes |
|---|---|---|---|
| M1 | `src/components/BoardCanvas.tsx` | `foreignObject` inside SVG for the field image | `foreignObject` has quirks in WebKit; field SVG renders as an image blob, so switching to an `<image>` tag with a data-URI would be more portable. **Deferred** — functional for now. |
| M2 | `src/App.tsx` | `createSVGPoint` / `getScreenCTM` used for pointer mapping | Deprecated in SVG2 spec but still present in all major browsers. Fallback path already exists. Low risk. |
| M3 | `src/components/SharedVisualDefs.tsx` | SVG `vectorEffect="non-scaling-stroke"` | Requires SVG 1.1; supported in all modern browsers including iOS Safari ≥ 10. No action needed. |
| M4 | `playwright.config.ts` | Only Chromium tested in CI | Firefox and WebKit regressions go undetected |

---

## 2. Measures implemented (v1.1.6)

### 2.1 `index.html`
- Added `viewport-fit=cover` to the viewport meta tag so the app fills notched displays.
- Added `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` for standalone home-screen mode.
- Added `mobile-web-app-capable` for Android Chrome.

### 2.2 `src/styles.css`
- Replaced bare `100vh` with a `100vh` / `100dvh` cascade so the stage uses the correct height when the iOS browser chrome collapses.
- Added `env(safe-area-inset-*)` padding to `.foosboard-stage` and `calc(…+ env(…))` offsets to `.foosboard-header-bar`.
- Added `overscroll-behavior: none` to `body` to prevent rubber-band interference.
- Added `-webkit-touch-callout: none` to `body` to suppress the iOS long-press menu.
- Added `-webkit-user-select: none` / `user-select: none` to `.foosboard-board-svg`.
- Added `-webkit-tap-highlight-color: transparent` to `.foosboard-board-svg`.
- Applied `dvh` units to the portrait-mode sizing as well.

### 2.3 `src/App.tsx` — `setPointerCapture`
- `startRodDrag`: calls `element.setPointerCapture(event.pointerId)` before setting up `dragRef`. This ensures `pointermove` / `pointerup` events keep arriving at the window listener even when the touch leaves the grip element on iOS Safari.
- `startBallDrag`: same fix applied to the ball-drag entry point.
- Both calls are wrapped in `try/catch` so they degrade gracefully if a non-capturable target is involved (e.g., a detached element).

### 2.4 `vite.config.ts`
- Lowered `build.target` from `es2020` to `es2019` for broader Safari 13.x / iOS 13 compatibility (removes reliance on `Promise.allSettled`, `globalThis`, `BigInt` output syntax, etc.).

### 2.5 Playwright test suite — `playwright.config.ts`
- Added **Firefox** (Gecko) project.
- Added **WebKit** (Safari/iOS simulation) project.
- Added **Mobile Chrome** device emulation (Pixel 5).
- Added **Mobile Safari** device emulation (iPhone 13).
- Added **Tablet Safari** device emulation (iPad Pro 11 in landscape).
- Desktop browsers keep `1600 × 1200`; mobile devices use Playwright's built-in device descriptors.

### 2.6 `e2e/cross-browser.spec.ts`
New spec that runs on all projects and validates:
- App renders board SVG without errors.
- Portrait viewport auto-rotates the board.
- Touch-style rod drag (via `page.mouse` in Playwright WebKit) moves the rod.
- Ball drag from tray to board places the ball without dropping the pointer.
- Pinch zoom double-tap reset restores the original viewBox.

---

## 3. Refinement plan (future work)

### Phase 1 — Ship with v1.1.6 (done above)

| Task | Status |
|---|---|
| `viewport-fit=cover` + PWA meta | ✅ Done |
| `dvh` + safe-area CSS | ✅ Done |
| `setPointerCapture` on drags | ✅ Done |
| Build target `es2019` | ✅ Done |
| Multi-browser Playwright projects | ✅ Done |
| Cross-browser smoke spec | ✅ Done |

### Phase 2 — v1.2

| Task | Priority | Effort |
|---|---|---|
| Replace `foreignObject` field with `<image xlink:href="data:...">` for maximum WebKit compat | Medium | Medium |
| Add a `<link rel="apple-touch-icon">` and web-app manifest (`manifest.webmanifest`) | Low | Low |
| Add CSS `touch-action: pan-y` fallback on scrollable configurator panels for Android Chrome scroll | Low | Low |
| Validate with BrowserStack / Sauce Labs on real iPhone Safari | High | Low |
| Add `@supports (height: 100dvh)` CSS feature detection guard | Low | Low |

### Phase 3 — v1.3 (research)

| Task | Notes |
|---|---|
| Safari 13 / iOS 13 Pointer Events — confirm `setPointerCapture` scope | iOS 13.4 ships Pointer Events, but capture semantics may differ slightly from spec |
| WebGL / OffscreenCanvas for heavy figure rendering | Only relevant if figure count grows significantly |
| CSS `@layer` and cascade layers | Mantine 7 uses modern CSS; verify no layer order conflicts in Safari |
