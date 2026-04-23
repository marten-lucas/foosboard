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

  await expect(figure).toBeVisible();
  await expect(readTilt(page, rodId)).resolves.toBe('neutral');

  await figure.click({ force: true });
  await expect(readTilt(page, rodId)).resolves.toBe('front');

  const box = await figure.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(readTilt(page, rodId)).resolves.toBe('back');

  const figureOpacity = await page.locator(`[data-testid="rod-${rodId}"] foreignObject`).first().evaluate((element) => getComputedStyle(element).opacity);
  expect(figureOpacity).toBe('1');

  await figure.click({ force: true });
  await expect(readTilt(page, rodId)).resolves.toBe('hochgestellt');

  const highOpacity = await page.locator(`[data-testid="rod-${rodId}"] foreignObject`).first().evaluate((element) => getComputedStyle(element).opacity);
  expect(highOpacity).toBe('0.5');

  await figure.click({ force: true });
  await expect(readTilt(page, rodId)).resolves.toBe('neutral');
});