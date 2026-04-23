import { expect, test } from '@playwright/test';

async function readRodAndBall(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const store = window.__foosboardStore?.getState();
    return {
      rodY: store?.rods.P2_2.y ?? 0,
      ballX: store?.ball.x ?? 0,
      ballY: store?.ball.y ?? 0,
    };
  });
}

test('landscape click on exposed rod segment nudges the rod without moving the ball', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const topNudge = page.getByTestId('rod-P2_2-nudge-top');
  await expect(topNudge).toBeVisible();

  const before = await readRodAndBall(page);
  await topNudge.click();
  const after = await readRodAndBall(page);

  expect(after.rodY).toBeLessThan(before.rodY);
  expect(before.rodY - after.rodY).toBeGreaterThan(2);
  expect(after.ballX).toBe(before.ballX);
  expect(after.ballY).toBe(before.ballY);
});

test('portrait click on exposed rod segment nudges the rod without moving the ball', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'true');
  const bottomNudge = page.getByTestId('rod-P2_2-nudge-bottom');
  await expect(bottomNudge).toBeVisible();

  const before = await readRodAndBall(page);
  await bottomNudge.click();
  const after = await readRodAndBall(page);

  expect(after.rodY).toBeGreaterThan(before.rodY);
  expect(after.rodY - before.rodY).toBeGreaterThan(2);
  expect(after.ballX).toBe(before.ballX);
  expect(after.ballY).toBe(before.ballY);
});