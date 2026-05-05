import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });

async function readTilt(page: import('@playwright/test').Page, rodId: string) {
  return page.evaluate((currentRodId) => {
    const store = window.__foosboardStore?.getState();
    return store?.rods[currentRodId as keyof typeof store.rods]?.tilt ?? '';
  }, rodId);
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

  const figureOpacity = await page.locator(`[data-testid="rod-${rodId}"] foreignObject`).first().evaluate((element) => getComputedStyle(element).opacity);
  expect(figureOpacity).toBe('1');

  await tiltToggle.click();
  await expect(readTilt(page, rodId)).resolves.toBe('hochgestellt');

  const highOpacity = await page.locator(`[data-testid="rod-${rodId}"] foreignObject`).first().evaluate((element) => getComputedStyle(element).opacity);
  expect(highOpacity).toBe('0.5');

  await tiltToggle.click();
  await expect(readTilt(page, rodId)).resolves.toBe('neutral');
});

test('hochgestellt tilt state renders the figure at 0.5 opacity on the live board', async ({ page }) => {
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

  // The foreignObject for the figure should have 0.5 computed opacity
  const opacity = await page
    .locator(`[data-testid="rod-${rodId}"] foreignObject`)
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(parseFloat(opacity)).toBeCloseTo(0.5, 1);
});