# Release Notes v1.1.13

## Bug Fixes

### Landscape tilt re-enabled
In v1.1.12 tilt overlays were suppressed in mobile landscape to prevent them from blocking rod drag. This meant tapping a figure did nothing. The fix now keeps tilt overlays in mobile landscape but makes them dual-purpose:
- **Short tap** → cycles the rod's tilt state (neutral → forward → back → hochgestellt)
- **Drag** → rod moves normally (pointer events forwarded to the rod drag handler)

### Portrait figure rendering improvement (iOS Safari)
Added `translateZ(0)` and `will-change: transform` to the CSS transform on the portrait-mode SVG. This forces GPU compositing and corrects a known iOS/WebKit bug where `foreignObject` elements inside a CSS-rotated SVG can render at the wrong size or position.

## Tests Added
- `landscape mobile: tapping figure tilt overlay cycles rod tilt` — verifies tilt cycling in landscape touch
- `landscape mobile: dragging figure tilt overlay area moves rod` — verifies rod drag through figure area in landscape
- `portrait figure stays aligned with rod after tilt change` — verifies figure alignment is preserved when tilt state changes in portrait
