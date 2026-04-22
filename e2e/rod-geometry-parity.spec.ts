/**
 * Playwright-Test: Stangen-Geometrie-Parität
 *
 * Prüft, dass das Verhältnis (Stangenlänge / Spielfeldbreite) in der
 * Konfigurator-Vorschau (Schritt 2) und auf der Live-Taktiktafel übereinstimmt.
 *
 * Erwartetes Verhältnis: rodLengthCm / fieldWidthCm = 128,5 / 68 ≈ 1,889
 *
 * Die Konfigurator-Vorschau nutzt cm direkt als Koordinateneinheiten und
 * zeigt deshalb das korrekte maßstäbliche Verhältnis.
 * Die Live-Tafel begrenzt den Stangen-Überstand intern (liveMaxRodExtension),
 * was bei stark abweichenden Verhältnissen eine Diskrepanz erzeugt.
 * Dieser Test macht die Abweichung sichtbar und schlägt fehl, sobald
 * sie eine Schwelle von 5 % übersteigt.
 */

import { expect, test } from '@playwright/test';

/**
 * Liest field-height und rod-extension aus den data-Attributen eines SVG-Elements
 * und berechnet das Verhältnis (fieldHeight + rodExtension) / fieldHeight.
 * Gibt zusätzlich die physikalisch erwartete Quote zurück (rodLengthCm / fieldWidthCm).
 */
async function extractRodRatio(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<{ rodExtension: number; fieldHeight: number; ratio: number }> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const fieldHeight = Number(el?.getAttribute('data-field-height') || '0');
    const rodExtension = Number(el?.getAttribute('data-rod-extension') || '0');
    return {
      fieldHeight,
      rodExtension,
      ratio: fieldHeight > 0 ? (fieldHeight + rodExtension) / fieldHeight : 0,
    };
  }, selector);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('Stangenlänge/Feldbreite-Verhältnis ist in Konfigurator-Vorschau und Tafel gleich (±5 %)', async ({ page }) => {
  // ── Live-Tafel: Ratio aus board-svg data-Attributen ─────────────────────────
  const boardSvg = await extractRodRatio(page, '[data-testid="board-svg"]');

  expect(boardSvg.fieldHeight, 'board-svg: data-field-height muss gesetzt und > 0 sein').toBeGreaterThan(0);
  expect(boardSvg.rodExtension, 'board-svg: data-rod-extension muss gesetzt sein').toBeGreaterThanOrEqual(0);

  // ── Konfigurator öffnen, Schritt 2 ──────────────────────────────────────────
  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Ullrich P4P').click();
  await expect(page.getByText(/Tischkonfiguration/i)).toBeVisible();

  // Schritt 1 → Schritt 2 (Stangen/Reihen-Vorschau)
  await page.getByRole('button', { name: /weiter/i }).click();
  const rodPreviewSvg = page.locator('[data-testid="rod-preview-canvas"] svg[data-field-height]');
  await expect(rodPreviewSvg).toBeVisible();

  const previewData = await extractRodRatio(
    page,
    '[data-testid="rod-preview-canvas"] svg[data-field-height]',
  );

  expect(previewData.fieldHeight, 'Konfigurator: data-field-height muss > 0 sein').toBeGreaterThan(0);
  expect(previewData.rodExtension, 'Konfigurator: data-rod-extension muss > 0 sein').toBeGreaterThan(0);

  // ── Erwartetes physikalisches Verhältnis ────────────────────────────────────
  // Ullrich P4P: rodLength=128,5 cm, fieldWidth=68 cm
  // Beide Ansichten müssen gegenüber diesem Zielwert innerhalb 5 % liegen.
  const expectedRodLengthCm = 128.5;
  const expectedFieldWidthCm = 68;
  const expectedRatio = (expectedFieldWidthCm + (expectedRodLengthCm - expectedFieldWidthCm) / 2) / expectedFieldWidthCm;
  // = (68 + 30.25) / 68 ≈ 1.4449

  // ── Konfigurator-Vorschau vs. physikalischer Zielwert (±3 %) ────────────────
  const previewDeviation = Math.abs(previewData.ratio - expectedRatio) / expectedRatio;
  expect(
    previewDeviation,
    `Konfigurator-Vorschau: Stangen-Verhältnis ${previewData.ratio.toFixed(4)} weicht um ` +
      `${(previewDeviation * 100).toFixed(1)} % vom Zielwert ${expectedRatio.toFixed(4)} ab.\n` +
      `  fieldHeight=${previewData.fieldHeight}, rodExtension=${previewData.rodExtension}`,
  ).toBeLessThanOrEqual(0.03);

  // ── Live-Tafel vs. physikalischer Zielwert (±5 %) ───────────────────────────
  // Toleranz etwas größer, da der Board-SVG intern ggf. das rod-extension begrenzt.
  const boardDeviation = Math.abs(boardSvg.ratio - expectedRatio) / expectedRatio;
  expect(
    boardDeviation,
    `Live-Tafel: Stangen-Verhältnis ${boardSvg.ratio.toFixed(4)} weicht um ` +
      `${(boardDeviation * 100).toFixed(1)} % vom Zielwert ${expectedRatio.toFixed(4)} ab.\n` +
      `  fieldHeight=${boardSvg.fieldHeight}, rodExtension=${boardSvg.rodExtension}\n` +
      `  Ursache: liveMaxRodExtension begrenzt den Überstand auf ~${boardSvg.rodExtension.toFixed(1)} Board-Einheiten ` +
      `statt ~${((expectedRodLengthCm - expectedFieldWidthCm) / 2 / expectedFieldWidthCm * boardSvg.fieldHeight).toFixed(1)} Board-Einheiten.`,
  ).toBeLessThanOrEqual(0.05);

  // ── Direkter Vergleich der beiden Verhältnisse (±5 %) ───────────────────────
  const parityDeviation = Math.abs(previewData.ratio - boardSvg.ratio) / Math.max(previewData.ratio, 1e-6);
  expect(
    parityDeviation,
    `Stangen-Verhältnis weicht zwischen Konfigurator-Vorschau (${previewData.ratio.toFixed(4)}) ` +
      `und Live-Tafel (${boardSvg.ratio.toFixed(4)}) um ${(parityDeviation * 100).toFixed(1)} % ab.\n` +
      `  Konfigurator: fieldHeight=${previewData.fieldHeight} cm, rodExtension=${previewData.rodExtension} cm\n` +
      `  Live-Tafel:   fieldHeight=${boardSvg.fieldHeight} Board-Einheiten, rodExtension=${boardSvg.rodExtension.toFixed(1)} Board-Einheiten`,
  ).toBeLessThanOrEqual(0.05);
});
