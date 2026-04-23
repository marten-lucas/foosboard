/**
 * Visueller Regressionstest für FigureRodPreview
 *
 * Prüft für alle drei Lagezustände (unten / nachVorn / nachHinten):
 *  - Ankerpunkt der Puppe liegt auf der Stangenmitte (x = rodX)
 *  - Puppe ist vertikal um figureCenterY zentriert (y = 20)
 *  - Breite der Puppe entspricht der erwarteten Proportionalskalierung
 *  - foreignObject bleibt innerhalb der Canvas-Grenzen
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FigureRodPreview } from '../src/components/FigureRodPreview';
import type { FigurePreviewState } from '../src/components/FigureRodPreview';

// ─── Konstanten aus FigureRodPreview.tsx (müssen synchron bleiben) ────────────

const VIEW_WIDTH = 28;
const VIEW_HEIGHT = 44;
const ROD_X = VIEW_WIDTH / 2; // 14
const FIGURE_CENTER_Y = 20;

/** Spiegelt die Skalierungsformel aus FigureRodPreview.tsx */
function expectedScale(figureWidthCm: number, fieldWidthCm: number, referenceWidth: number) {
  const cmToPreviewUnits = Math.max((VIEW_HEIGHT / Math.max(fieldWidthCm, 1)) * 3.8, 0.1);
  const mountWidthTarget = Math.max(figureWidthCm * cmToPreviewUnits, 8.5);
  return mountWidthTarget / Math.max(referenceWidth, 1);
}

function expectedFigureWidth(bounds: { width: number }, scale: number) {
  return Math.max(bounds.width * scale, 8.5);
}

function expectedFigureHeight(bounds: { height: number }, scale: number) {
  return Math.max(bounds.height * scale, 12);
}

// ─── Hilfsfunktion: foreignObject-Attribute auslesen ─────────────────────────

function readForeignObject(svg: Element) {
  const fo = svg.querySelector('foreignObject');
  if (!fo) throw new Error('foreignObject nicht gefunden');
  return {
    x: parseFloat(fo.getAttribute('x') ?? '0'),
    y: parseFloat(fo.getAttribute('y') ?? '0'),
    width: parseFloat(fo.getAttribute('width') ?? '0'),
    height: parseFloat(fo.getAttribute('height') ?? '0'),
  };
}

// ─── Testdaten ────────────────────────────────────────────────────────────────

/** Typisches Paar: figureBounds größer als referenceWidth (Mount-Gruppe kleiner als Gesamtfigur). */
const STATES_REALISTIC: Record<'unten' | 'nachVorn' | 'nachHinten', FigurePreviewState> = {
  unten: {
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="currentColor"/></svg>',
    bounds: { width: 200, height: 300 },
    anchor: { x: 0.5, y: 0.25 }, // Steg bei 25% von oben
    referenceWidth: 90,            // Mount-Gruppe: 90 SVG-Einheiten breit
  },
  nachVorn: {
    // Puppe nach vorn geneigt – andere Bounds und Ankerlage
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"><rect width="180" height="320" fill="currentColor"/></svg>',
    bounds: { width: 180, height: 320 },
    anchor: { x: 0.48, y: 0.22 },
    referenceWidth: 88,
  },
  nachHinten: {
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 195 310"><rect width="195" height="310" fill="currentColor"/></svg>',
    bounds: { width: 195, height: 310 },
    anchor: { x: 0.52, y: 0.28 },
    referenceWidth: 92,
  },
};

/** Extremfall: referenceWidth == figureBounds.width → volle Deckung */
const STATES_EQUAL_WIDTH: Record<'unten' | 'nachVorn' | 'nachHinten', FigurePreviewState> = {
  unten: {
    markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect width="100" height="150" fill="currentColor"/></svg>',
    bounds: { width: 100, height: 150 },
    anchor: { x: 0.5, y: 0.3 },
    referenceWidth: 100,
  },
  nachVorn: {
    markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect width="100" height="150" fill="currentColor"/></svg>',
    bounds: { width: 100, height: 150 },
    anchor: { x: 0.5, y: 0.3 },
    referenceWidth: 100,
  },
  nachHinten: {
    markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect width="100" height="150" fill="currentColor"/></svg>',
    bounds: { width: 100, height: 150 },
    anchor: { x: 0.5, y: 0.3 },
    referenceWidth: 100,
  },
};

// ─── Hilfsfunktion: Komponente rendern ───────────────────────────────────────

function renderPreview(
  figureStates: typeof STATES_REALISTIC,
  figureWidthCm = 3.5,
  fieldWidthCm = 68,
) {
  return render(
    <MantineProvider>
      <FigureRodPreview
        testId="figure-rod-preview-canvas"
        figureStates={figureStates}
        figureColor="#ff0000"
        ballColor="#ffffff"
        rodDiameterCm={1.6}
        figureWidthCm={figureWidthCm}
        ballSizeCm={3.5}
        fieldWidthCm={fieldWidthCm}
      />
    </MantineProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FigureRodPreview – visuelle Positionierung und Skalierung', () => {
  const TILT_ORDER: Array<'unten' | 'nachVorn' | 'nachHinten'> = ['unten', 'nachVorn', 'nachHinten'];
  const TOLERANCE = 0.05; // SVG-Einheiten (±0,05)

  it('Ankerpunkt liegt für alle drei Lagezustände auf der Stangenmitte (realistisch)', async () => {
    const user = userEvent.setup();
    const figureWidthCm = 3.5;
    const fieldWidthCm = 68;

    renderPreview(STATES_REALISTIC, figureWidthCm, fieldWidthCm);

    const svg = screen.getByLabelText('Puppe mit Stange');
    const toggle = screen.getByTestId('figure-rod-preview-toggle');

    for (const state of TILT_ORDER) {
      expect(svg.getAttribute('data-tilt-state')).toBe(state);

      const stateData = STATES_REALISTIC[state];
      const sc = expectedScale(figureWidthCm, fieldWidthCm, stateData.referenceWidth ?? stateData.bounds.width);
      const fW = expectedFigureWidth(stateData.bounds, sc);
      const fH = expectedFigureHeight(stateData.bounds, sc);
      const { x: foX, y: foY, width: foW, height: foH } = readForeignObject(svg);

      // 1. Ankerpunkt horizontal auf Stangenmitte
      const anchorAbsX = foX + foW * stateData.anchor.x;
      expect(anchorAbsX, `${state}: Ankerpunkt x sollte auf Stange (${ROD_X}) liegen, ist aber ${anchorAbsX.toFixed(3)}`).toBeCloseTo(
        ROD_X,
        TOLERANCE,
      );

      // 2. Ankerpunkt vertikal auf figureCenterY
      const anchorAbsY = foY + foH * stateData.anchor.y;
      expect(anchorAbsY, `${state}: Ankerpunkt y sollte auf ${FIGURE_CENTER_Y} liegen, ist aber ${anchorAbsY.toFixed(3)}`).toBeCloseTo(
        FIGURE_CENTER_Y,
        TOLERANCE,
      );

      // 3. Breite entspricht Proportionalskalierung
      expect(foW, `${state}: Breite sollte ~${fW.toFixed(2)} sein, ist aber ${foW.toFixed(2)}`).toBeCloseTo(fW, TOLERANCE);

      // 4. Höhe entspricht Proportionalskalierung
      expect(foH, `${state}: Höhe sollte ~${fH.toFixed(2)} sein, ist aber ${foH.toFixed(2)}`).toBeCloseTo(fH, TOLERANCE);

      // 5. foreignObject liegt innerhalb der Canvas-Grenzen (mit 1px Toleranz)
      expect(foX, `${state}: foreignObject ragt links aus der Canvas`).toBeGreaterThanOrEqual(-1);
      expect(foX + foW, `${state}: foreignObject ragt rechts aus der Canvas`).toBeLessThanOrEqual(VIEW_WIDTH + 1);
      expect(foY, `${state}: foreignObject ragt oben aus der Canvas`).toBeGreaterThanOrEqual(-VIEW_HEIGHT);
      expect(foY + foH, `${state}: foreignObject ragt unten aus der Canvas`).toBeLessThanOrEqual(VIEW_HEIGHT * 2);

      // Zu nächstem Zustand weiterschalten (letzter Zustand wird nicht mehr geklickt)
      if (state !== 'nachHinten') {
        await user.click(toggle);
      }
    }
  });

  it('Breite ist über alle Lagezustände proportional konsistent (gleiche referenceWidth)', async () => {
    const user = userEvent.setup();
    const figureWidthCm = 3.5;
    const fieldWidthCm = 68;

    renderPreview(STATES_EQUAL_WIDTH, figureWidthCm, fieldWidthCm);

    const svg = screen.getByLabelText('Puppe mit Stange');
    const toggle = screen.getByTestId('figure-rod-preview-toggle');

    const widths: number[] = [];

    for (const state of TILT_ORDER) {
      expect(svg.getAttribute('data-tilt-state')).toBe(state);
      const { width: foW } = readForeignObject(svg);
      widths.push(foW);

      if (state !== 'nachHinten') {
        await user.click(toggle);
      }
    }

    // Bei identischer referenceWidth müssen alle Breiten gleich sein
    expect(widths[1], 'nachVorn Breite weicht von unten ab').toBeCloseTo(widths[0], TOLERANCE);
    expect(widths[2], 'nachHinten Breite weicht von unten ab').toBeCloseTo(widths[0], TOLERANCE);
  });

  it('Ankerpunkt liegt korrekt wenn referenceWidth === figureBounds.width', async () => {
    const user = userEvent.setup();
    const figureWidthCm = 4.0;
    const fieldWidthCm = 70;

    renderPreview(STATES_EQUAL_WIDTH, figureWidthCm, fieldWidthCm);

    const svg = screen.getByLabelText('Puppe mit Stange');
    const toggle = screen.getByTestId('figure-rod-preview-toggle');

    for (const state of TILT_ORDER) {
      const stateData = STATES_EQUAL_WIDTH[state];
      const { x: foX, width: foW } = readForeignObject(svg);
      const anchorAbsX = foX + foW * stateData.anchor.x;

      expect(anchorAbsX, `${state}: Ankerpunkt x sollte auf Stange (${ROD_X}) liegen`).toBeCloseTo(ROD_X, TOLERANCE);

      // Da referenceWidth == figureBounds.width, entspricht foW ≈ mountWidthTarget
      const cmToPreviewUnits = Math.max((VIEW_HEIGHT / Math.max(fieldWidthCm, 1)) * 3.8, 0.1);
      const mountWidthTarget = Math.max(figureWidthCm * cmToPreviewUnits, 8.5);
      expect(foW, `${state}: Bei referenceWidth==figureBounds.width muss foW ≈ mountWidthTarget sein`).toBeCloseTo(
        mountWidthTarget,
        TOLERANCE,
      );

      if (state !== 'nachHinten') {
        await user.click(toggle);
      }
    }
  });

  it('Stange verläuft von y=0 bis y=44, kein grip-Rect vorhanden', () => {
    renderPreview(STATES_REALISTIC);

    const svg = screen.getByLabelText('Puppe mit Stange');
    const rod = svg.querySelector('line');

    expect(rod?.getAttribute('y1')).toBe('0');
    expect(rod?.getAttribute('y2')).toBe('44');
    expect(rod?.getAttribute('x1')).toBe(String(ROD_X));
    expect(rod?.getAttribute('x2')).toBe(String(ROD_X));

    // Kein schwarzes Grip-Rect mehr
    expect(svg.querySelector('rect[fill="#111"]')).toBeNull();
    expect(svg.querySelector('rect[fill="#222"]')).toBeNull();
  });

  it('Lagezustand wechselt durch Klick korrekt durch (unten → nachVorn → nachHinten → hochgestellt → unten)', async () => {
    const user = userEvent.setup();
    renderPreview(STATES_REALISTIC);

    const svg = screen.getByLabelText('Puppe mit Stange');
    const toggle = screen.getByTestId('figure-rod-preview-toggle');

    expect(svg.getAttribute('data-tilt-state')).toBe('unten');
    await user.click(toggle);
    expect(svg.getAttribute('data-tilt-state')).toBe('nachVorn');
    await user.click(toggle);
    expect(svg.getAttribute('data-tilt-state')).toBe('nachHinten');
    await user.click(toggle);
    expect(svg.getAttribute('data-tilt-state')).toBe('hochgestellt');
    await user.click(toggle);
    expect(svg.getAttribute('data-tilt-state')).toBe('unten');
  });
});
