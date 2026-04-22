import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// SVG-Koordinatensystem der Stangenvorschau (aus FigureRodPreview.tsx)
const VIEW_WIDTH = 28;
const VIEW_HEIGHT = 44;
const ROD_X = VIEW_WIDTH / 2; // 14
const FIGURE_CENTER_Y = 20;
const TOLERANCE = 0.5; // SVG-Einheiten

const screenshotDir = path.resolve(process.cwd(), 'test-results/screenshots');

test.beforeEach(async ({ page }) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('FigureRodPreview – Ullrich P4P alle Lagezustände prüfen', async ({ page }) => {
  // Tischmenü öffnen
  await page.getByLabel('Tischauswahl öffnen').click();

  // Ullrich P4P editieren
  await page.getByText('Ullrich P4P').click();

  // Schritt 1: Tischkonfiguration sichtbar
  await expect(page.getByText(/Tischkonfiguration/i)).toBeVisible();
  await page.getByRole('button', { name: /weiter/i }).click();

  // Schritt 2: Stangenvorschau sichtbar
  await expect(page.getByLabel('Stangenvorschau')).toBeVisible();
  await page.getByRole('button', { name: /weiter/i }).click();

  // Schritt 3: Figurenvorschau
  const canvas = page.getByTestId('figure-rod-preview-canvas');
  const toggle = page.getByTestId('figure-rod-preview-toggle');
  await expect(canvas).toBeVisible();

  // ── Zustand: unten ──────────────────────────────────────────────────────────
  const unten = await extractFigureGeometry(page);
  expect(unten.tiltState).toBe('unten');
  assertFigureGeometry(unten, 'unten');
  await canvas.screenshot({ path: path.join(screenshotDir, 'ullrich--unten.png') });

  // ── Klick → nachVorn ────────────────────────────────────────────────────────
  await toggle.click();
  const nachVorn = await extractFigureGeometry(page);
  expect(nachVorn.tiltState).toBe('nachVorn');
  assertFigureGeometry(nachVorn, 'nachVorn');
  await canvas.screenshot({ path: path.join(screenshotDir, 'ullrich--nachVorn.png') });

  // ── Klick → nachHinten ──────────────────────────────────────────────────────
  await toggle.click();
  const nachHinten = await extractFigureGeometry(page);
  expect(nachHinten.tiltState).toBe('nachHinten');
  assertFigureGeometry(nachHinten, 'nachHinten');
  await canvas.screenshot({ path: path.join(screenshotDir, 'ullrich--nachHinten.png') });

  // ── Mount muss in allen Tilt-Positionen ähnlich groß dargestellt werden ─────
  const mountWidths = [unten.mountRenderedWidthPx, nachVorn.mountRenderedWidthPx, nachHinten.mountRenderedWidthPx];
  const minMountWidth = Math.min(...mountWidths);
  const maxMountWidth = Math.max(...mountWidths);
  const relativeSpread = (maxMountWidth - minMountWidth) / Math.max(maxMountWidth, 1);
  expect(
    relativeSpread,
    `Mount-Rechteck skaliert pro Zustand uneinheitlich (Spread ${(relativeSpread * 100).toFixed(1)}%).\n` +
      `  unten:      ${unten.mountRenderedWidthPx.toFixed(2)}px (viewBox ${unten.innerViewBox})\n` +
      `  nachVorn:   ${nachVorn.mountRenderedWidthPx.toFixed(2)}px (viewBox ${nachVorn.innerViewBox})\n` +
      `  nachHinten: ${nachHinten.mountRenderedWidthPx.toFixed(2)}px (viewBox ${nachHinten.innerViewBox})`,
  ).toBeLessThanOrEqual(0.1);

  // ── Schritt 4: Ergebnisvorschau muss zur Stangenvorschau passen ────────────
  await page.getByRole('button', { name: /weiter/i }).click();
  const resultCanvas = page.getByTestId('result-preview-canvas');
  await expect(resultCanvas).toBeVisible();

  const result = await extractResultPreviewGeometry(page);
  const previewAnchorX = (ROD_X - unten.foX) / Math.max(unten.foWidth, 1e-6);

  // Platzierung: relative Ankerposition auf der Stange muss gleich bleiben.
  expect(
    Math.abs(result.anchorX - previewAnchorX),
    `Ankerposition in Ergebnisvorschau weicht ab: step3=${previewAnchorX.toFixed(3)}, step4=${result.anchorX.toFixed(3)}`,
  ).toBeLessThanOrEqual(0.05);

  // Skalierung: Mount muss im foreignObject denselben relativen Flächenanteil behalten.
  const step3MountShareX = unten.mountRenderedWidthPx / Math.max(unten.foWidthPx, 1e-6);
  const step4MountShareX = result.mountRenderedWidthPx / Math.max(result.foWidthPx, 1e-6);
  expect(
    Math.abs(step4MountShareX - step3MountShareX),
    `Mount-Skalierung weicht zwischen Schritt 3 und 4 ab: step3=${step3MountShareX.toFixed(3)}, step4=${step4MountShareX.toFixed(3)}`,
  ).toBeLessThanOrEqual(0.08);

  // Ergebnisvorschau: gleiche Logik, aber kleinere Stange als im Stangenpreview.
  expect(
    result.rodRenderedWidthPx,
    `Stange in Ergebnisvorschau (${result.rodRenderedWidthPx.toFixed(2)}px) sollte kleiner sein als in Stangenvorschau (${unten.rodRenderedWidthPx.toFixed(2)}px)`,
  ).toBeLessThan(unten.rodRenderedWidthPx);

  // Trotzdem muss das Mount in der Ergebnisvorschau breiter als die Stange bleiben.
  expect(
    result.mountRenderedWidthPx,
    `Ergebnisvorschau: Mount (${result.mountRenderedWidthPx.toFixed(2)}px) ist nicht breiter als Stange (${result.rodRenderedWidthPx.toFixed(2)}px)`,
  ).toBeGreaterThan(result.rodRenderedWidthPx);
});

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

interface FigureGeometry {
  tiltState: string;
  foX: number;
  foY: number;
  foWidth: number;
  foHeight: number;
  foWidthPx: number;
  foHeightPx: number;
  rodRenderedWidthPx: number;
  mountSourceWidth: number;
  mountSourceHeight: number;
  mountRenderedWidthPx: number;
  mountRenderedHeightPx: number;
  innerViewBox: string;
}

/** Liest die SVG-Geometrie des foreignObject direkt aus den Attributen. */
async function extractFigureGeometry(page: import('@playwright/test').Page): Promise<FigureGeometry> {
  return page.evaluate(({ rodX, figureCenterY }) => {
    const svg = document.querySelector('[aria-label="Puppe mit Stange"]') as SVGSVGElement | null;
    const fo = svg?.querySelector('foreignObject');
    const rod = svg?.querySelector('line');

    const svgRect = svg?.getBoundingClientRect();
    const viewBox = svg?.getAttribute('viewBox') || '0 0 28 44';
    const vb = viewBox.split(/\s+/).map((n) => Number(n));
    const vbWidth = Number.isFinite(vb[2]) && vb[2] > 0 ? vb[2] : 28;
    const pxPerUnitX = (svgRect?.width || 0) / vbWidth;
    const rodStrokeUnits = Number(rod?.getAttribute('stroke-width') || '0');
    const rodRenderedWidthPx = rodStrokeUnits * pxPerUnitX;

    const foX = parseFloat(fo?.getAttribute('x') ?? '0');
    const foY = parseFloat(fo?.getAttribute('y') ?? '0');
    const foWidth = parseFloat(fo?.getAttribute('width') ?? '0');
    const foHeight = parseFloat(fo?.getAttribute('height') ?? '0');
    const foRect = fo?.getBoundingClientRect();

    const innerSvg = svg?.querySelector('foreignObject .foosboard-figure-svg-colorized svg') as SVGSVGElement | null;
    const rects = innerSvg ? Array.from(innerSvg.querySelectorAll('rect')) : [];
    const rectInfos = rects.map((rect) => {
      const rendered = (rect as SVGGraphicsElement).getBoundingClientRect();
      const sourceWidth = Number(rect.getAttribute('width') || '0');
      const sourceHeight = Number(rect.getAttribute('height') || '0');
      return {
        sourceWidth,
        sourceHeight,
        renderedWidth: rendered.width,
        renderedHeight: rendered.height,
        sourceArea: sourceWidth * sourceHeight,
      };
    });

    // Das Mount-Rechteck ist in den Ullrich-Assets das größte Rechteck (15x20).
    rectInfos.sort((a, b) => b.sourceArea - a.sourceArea);
    const mount = rectInfos[0] || {
      sourceWidth: 0,
      sourceHeight: 0,
      renderedWidth: 0,
      renderedHeight: 0,
    };

    // Ankerpunkt: Der Punkt, an dem die Stange die Puppe durchsticht.
    // Der Ankerpunkt in x liegt auf rodX → anchor.x = (rodX - foX) / foWidth
    // Der Ankerpunkt in y liegt auf figureCenterY → anchor.y = (figureCenterY - foY) / foHeight
    const anchorX = foWidth > 0 ? foX + foWidth * ((rodX - foX) / foWidth) : 0;
    const anchorY = foHeight > 0 ? foY + foHeight * ((figureCenterY - foY) / foHeight) : 0;

    return {
      tiltState: svg?.getAttribute('data-tilt-state') ?? '',
      foX,
      foY,
      foWidth,
      foHeight,
      foWidthPx: foRect?.width || 0,
      foHeightPx: foRect?.height || 0,
      rodRenderedWidthPx,
      mountSourceWidth: mount.sourceWidth,
      mountSourceHeight: mount.sourceHeight,
      mountRenderedWidthPx: mount.renderedWidth,
      mountRenderedHeightPx: mount.renderedHeight,
      innerViewBox: innerSvg?.getAttribute('viewBox') || '',
    };
  }, { rodX: ROD_X, figureCenterY: FIGURE_CENTER_Y });
}

type ResultPreviewGeometry = {
  foWidthPx: number;
  foHeightPx: number;
  anchorX: number;
  rodRenderedWidthPx: number;
  mountRenderedWidthPx: number;
  mountRenderedHeightPx: number;
};

/** Liest die Geometrie einer Beispiel-Figur aus der Ergebnisvorschau (Schritt 4). */
async function extractResultPreviewGeometry(page: import('@playwright/test').Page): Promise<ResultPreviewGeometry> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="result-preview-canvas"]');
    const overlaySvg = root?.querySelector('svg[aria-label="Preview gerenderter Tisch"]') as SVGSVGElement | null;
    const foreignObjects = overlaySvg ? Array.from(overlaySvg.querySelectorAll('foreignObject')) : [];
    const rodRects = overlaySvg ? Array.from(overlaySvg.querySelectorAll('rect')).filter((rect) => (rect.getAttribute('fill') || '').includes('rodGradient')) : [];
    const rods = overlaySvg ? Array.from(overlaySvg.querySelectorAll('line')) : [];

    const targetFo = foreignObjects[0] as SVGForeignObjectElement | undefined;
    const foRect = targetFo?.getBoundingClientRect();
    const foX = Number(targetFo?.getAttribute('x') || '0');
    const foW = Number(targetFo?.getAttribute('width') || '0');
    const foCenterX = foX + foW / 2;

    const rodRect = rodRects
      .map((rect) => {
        const rectX = Number(rect.getAttribute('x') || '0') + Number(rect.getAttribute('width') || '0') / 2;
        return { rect, rectX, dist: Math.abs(rectX - foCenterX) };
      })
      .sort((a, b) => a.dist - b.dist)[0]?.rect;

    const rodLine = rods
      .map((line) => {
        const lineX = Number(line.getAttribute('x1') || '0');
        return { line, lineX, dist: Math.abs(lineX - foCenterX) };
      })
      .sort((a, b) => a.dist - b.dist)[0]?.line;

    const viewBox = overlaySvg?.getAttribute('viewBox') || '0 0 100 100';
    const vb = viewBox.split(/\s+/).map((n) => Number(n));
    const vbWidth = Number.isFinite(vb[2]) && vb[2] > 0 ? vb[2] : 100;
    const svgRect = overlaySvg?.getBoundingClientRect();
    const pxPerUnitX = (svgRect?.width || 0) / vbWidth;
    const rodStrokeUnits = rodRect
      ? Number(rodRect.getAttribute('width') || '0')
      : Number(rodLine?.getAttribute('stroke-width') || '0');
    const rodRenderedWidthPx = rodStrokeUnits * pxPerUnitX;

    const innerSvg = targetFo?.querySelector('.foosboard-figure-svg-colorized svg') as SVGSVGElement | null;
    const rects = innerSvg ? Array.from(innerSvg.querySelectorAll('rect')) : [];
    const mount = rects
      .map((rect) => {
        const r = (rect as SVGGraphicsElement).getBoundingClientRect();
        const sw = Number(rect.getAttribute('width') || '0');
        const sh = Number(rect.getAttribute('height') || '0');
        return { area: sw * sh, renderedWidth: r.width, renderedHeight: r.height };
      })
      .sort((a, b) => b.area - a.area)[0] || { renderedWidth: 0, renderedHeight: 0 };

    const rodCenterX = rodRect
      ? Number(rodRect.getAttribute('x') || '0') + Number(rodRect.getAttribute('width') || '0') / 2
      : Number(rodLine?.getAttribute('x1') || '0');
    const anchorX = foW > 0 ? (rodCenterX - foX) / foW : 0.5;

    return {
      foWidthPx: foRect?.width || 0,
      foHeightPx: foRect?.height || 0,
      anchorX,
      rodRenderedWidthPx,
      mountRenderedWidthPx: mount.renderedWidth,
      mountRenderedHeightPx: mount.renderedHeight,
    };
  });
}

/** Prüft geometrische Invarianten für einen Lagezustand. */
function assertFigureGeometry(g: FigureGeometry, label: string) {
  // 1. Figur hat sichtbare Größe
  expect(g.foWidth, `${label}: foWidth muss > 5 SVG-Einheiten sein`).toBeGreaterThan(5);
  expect(g.foHeight, `${label}: foHeight muss > 8 SVG-Einheiten sein`).toBeGreaterThan(8);

  // 2. Ankerpunkt in x liegt auf der Stangenmitte (rodX = 14)
  const computedAnchorX = g.foX + g.foWidth * ((ROD_X - g.foX) / g.foWidth);
  expect(
    Math.abs(computedAnchorX - ROD_X),
    `${label}: Ankerpunkt x muss auf Stange (${ROD_X}) liegen, foreignObject.x=${g.foX.toFixed(3)}, width=${g.foWidth.toFixed(3)}`,
  ).toBeLessThanOrEqual(TOLERANCE);

  // 3. foreignObject bleibt innerhalb der Canvas-Grenzen (mit Puffer für gekippte Puppen)
  expect(g.foX, `${label}: foreignObject ragt links aus der Canvas`).toBeGreaterThanOrEqual(-VIEW_WIDTH);
  expect(g.foX + g.foWidth, `${label}: foreignObject ragt rechts aus der Canvas`).toBeLessThanOrEqual(VIEW_WIDTH * 2);
  expect(g.foY, `${label}: foreignObject ragt oben aus der Canvas`).toBeGreaterThanOrEqual(-VIEW_HEIGHT);
  expect(g.foY + g.foHeight, `${label}: foreignObject ragt unten aus der Canvas`).toBeLessThanOrEqual(VIEW_HEIGHT * 2);

  // 4. Mount-Rechteck muss breiter dargestellt werden als die Stange.
  expect(g.mountSourceWidth, `${label}: konnte kein Mount-Rechteck in der SVG erkennen`).toBeGreaterThan(0);
  expect(g.mountRenderedWidthPx, `${label}: Mount-Rechteck wird mit 0px Breite gerendert`).toBeGreaterThan(0);
  expect(g.rodRenderedWidthPx, `${label}: Stangenbreite konnte nicht bestimmt werden`).toBeGreaterThan(0);
  expect(
    g.mountRenderedWidthPx,
    `${label}: Mount-Rechteck (${g.mountRenderedWidthPx.toFixed(2)}px) ist nicht breiter als Stange (${g.rodRenderedWidthPx.toFixed(2)}px). viewBox=${g.innerViewBox}`,
  ).toBeGreaterThan(g.rodRenderedWidthPx);
}
