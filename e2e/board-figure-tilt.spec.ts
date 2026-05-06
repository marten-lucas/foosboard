import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });

async function readTilt(page: import('@playwright/test').Page, rodId: string) {
  return page.evaluate((currentRodId) => {
    const store = window.__foosboardStore?.getState();
    return store?.rods[currentRodId as keyof typeof store.rods]?.tilt ?? '';
  }, rodId);
}

async function readFigureColorAlpha(page: import('@playwright/test').Page, rodId: string) {
  return page
    .locator(`[data-testid="rod-${rodId}"] .foosboard-figure-svg-colorized`)
    .first()
    .evaluate((element) => {
      const color = getComputedStyle(element).color;
      const match = color.match(/rgba?\(([^)]+)\)/i);
      if (!match) {
        return 1;
      }
      const parts = match[1].split(',').map((part) => part.trim());
      if (parts.length < 4) {
        return 1;
      }
      const alpha = Number.parseFloat(parts[3]);
      return Number.isFinite(alpha) ? alpha : 1;
    });
}

test('clicking and tapping a board figure cycles the rod tilt', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  const figure = page.locator(`[data-testid="rod-${rodId}"] foreignObject`).first();
  // The tilt-toggle rect overlays each figure; target it directly to avoid cross-browser z-order issues
  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);

  await expect(figure).toBeVisible();
  await expect(readTilt(page, rodId)).resolves.toBe('neutral');

  await tiltToggle.click();
  await expect(readTilt(page, rodId)).resolves.toBe('front');

  const box = await tiltToggle.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(readTilt(page, rodId)).resolves.toBe('back');

  const figureAlpha = await readFigureColorAlpha(page, rodId);
  expect(figureAlpha).toBeCloseTo(1, 2);

  await tiltToggle.click();
  await expect(readTilt(page, rodId)).resolves.toBe('hochgestellt');

  const highAlpha = await readFigureColorAlpha(page, rodId);
  expect(highAlpha).toBeCloseTo(0.5, 1);

  await tiltToggle.click();
  await expect(readTilt(page, rodId)).resolves.toBe('neutral');
});

test('hochgestellt tilt state renders the figure color at 0.5 alpha on the live board', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(tiltToggle).toBeVisible();

  // Cycle: neutral → front → back → hochgestellt
  await tiltToggle.click(); // → front
  await tiltToggle.click(); // → back
  await tiltToggle.click(); // → hochgestellt

  await expect(readTilt(page, rodId)).resolves.toBe('hochgestellt');

  const alpha = await readFigureColorAlpha(page, rodId);
  expect(alpha).toBeCloseTo(0.5, 1);

});

test('hochgestellt figure height matches forward-tilt figure height, not backward-tilt', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(tiltToggle).toBeVisible();

  const getFigureHeight = () =>
    page
      .locator(`[data-testid="rod-${rodId}"] foreignObject`)
      .first()
      .getAttribute('height')
      .then((h) => parseFloat(h ?? '0'));

  // Measure forward-tilt (nachVorn) height
  await tiltToggle.click(); // → front
  const nachVornHeight = await getFigureHeight();

  // Measure backward-tilt (nachHinten) height
  await tiltToggle.click(); // → back
  const nachHintenHeight = await getFigureHeight();

  // Cycle to hochgestellt
  await tiltToggle.click(); // → hochgestellt
  const hochgestelltHeight = await getFigureHeight();

  // hochgestellt must use the forward-tilt figure (same height as nachVorn)
  expect(hochgestelltHeight).toBeCloseTo(nachVornHeight, 0);
  // And must NOT match nachHinten (which is significantly larger)
  if (Math.abs(nachHintenHeight - nachVornHeight) > 2) {
    expect(Math.abs(hochgestelltHeight - nachHintenHeight)).toBeGreaterThan(2);
  }
});