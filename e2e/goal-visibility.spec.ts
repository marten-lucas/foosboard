import { expect, test } from '@playwright/test';

test('goal visuals stay visible in board and previews', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const boardGoalCount = await page.locator('[data-testid="board-svg"]').evaluate((element) => {
    const rootBox = (element as HTMLElement | SVGGraphicsElement).getBoundingClientRect();
    return Array.from(element.querySelectorAll('[data-goal-pocket="true"]')).filter((goal) => {
      const rect = (goal as SVGGraphicsElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > rootBox.left && rect.left < rootBox.right && rect.bottom > rootBox.top && rect.top < rootBox.bottom;
    }).length;
  });
  expect(boardGoalCount).toBeGreaterThanOrEqual(2);

  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Tische konfigurieren').click();
  await expect(page.getByText('Tischkonfiguration')).toBeVisible();

  const fieldPreviewGoalCount = await page.locator('[data-testid="field-preview-canvas"]').evaluate((element) => {
    const rootBox = (element as HTMLElement | SVGGraphicsElement).getBoundingClientRect();
    return Array.from(element.querySelectorAll('[data-goal-pocket="true"]')).filter((goal) => {
      const rect = (goal as SVGGraphicsElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > rootBox.left && rect.left < rootBox.right && rect.bottom > rootBox.top && rect.top < rootBox.bottom;
    }).length;
  });
  expect(fieldPreviewGoalCount).toBeGreaterThanOrEqual(2);

  await page.getByRole('button', { name: /weiter/i }).click();

  const rodPreviewGoalCount = await page.locator('[data-testid="rod-preview-canvas"]').evaluate((element) => {
    const rootBox = (element as HTMLElement | SVGGraphicsElement).getBoundingClientRect();
    return Array.from(element.querySelectorAll('[data-goal-pocket="true"]')).filter((goal) => {
      const rect = (goal as SVGGraphicsElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > rootBox.left && rect.left < rootBox.right && rect.bottom > rootBox.top && rect.top < rootBox.bottom;
    }).length;
  });
  expect(rodPreviewGoalCount).toBeGreaterThanOrEqual(2);
});