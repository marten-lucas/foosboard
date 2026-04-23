import { expect, test } from '@playwright/test';

test('portrait rod drag follows horizontal pointer movement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const grip = page.locator('[data-testid="rod-P2_2"] rect[fill*="gripGradient"]').first();
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'true');
  await expect(grip).toBeVisible();

  const beforeY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  const gripBox = await grip.boundingBox();
  expect(gripBox).not.toBeNull();

  const startX = gripBox!.x + gripBox!.width / 2;
  const startY = gripBox!.y + gripBox!.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 80, startY, { steps: 10 });
  await page.mouse.up();

  const afterY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  expect(Math.abs(afterY - beforeY)).toBeGreaterThan(20);
});