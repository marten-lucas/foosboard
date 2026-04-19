import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('renders the modern tactics board with legacy dimensions', async ({ page }) => {
  await expect(page.getByText('Foosboard')).toBeVisible();
  await expect(page.getByText('Vorlage 610 x 470')).toBeVisible();
  await expect(page.getByTestId('board-svg')).toHaveAttribute('viewBox', '0 0 610 470');
});

test('supports tactical interactions for lines and toggles', async ({ page }) => {
  await page.getByText('Schuss', { exact: true }).click();
  await page.getByTestId('board-svg').click({ position: { x: 470, y: 170 } });
  await expect(page.getByText('Schuss 1')).toBeVisible();

  await page.getByText('Pass', { exact: true }).click();
  await page.getByTestId('board-svg').click({ position: { x: 330, y: 250 } });
  await expect(page.getByText('Pass 2')).toBeVisible();

  await page.getByRole('button', { name: 'Hilfslinien an' }).click();
  await expect(page.getByRole('button', { name: 'Hilfslinien aus' })).toBeVisible();

  await page.getByRole('button', { name: '3 Zielpunkte' }).click();
  await expect(page.getByRole('button', { name: '5 Zielpunkte' })).toBeVisible();
});

test('saves, reloads and shares snapshots', async ({ page }) => {
  const ballBadge = page.getByText(/Ball \d+ \/ \d+/).first();
  const initialText = await ballBadge.textContent();

  await page.getByTestId('board-svg').click({ position: { x: 420, y: 220 } });
  await expect(ballBadge).not.toHaveText(initialText || '');

  await page.getByLabel('Snapshot-Name').fill('Regression Szene');
  await page.getByText('Speichern').click();
  await expect(page.getByText('Regression Szene')).toBeVisible();

  await page.getByText('Teilen').click();
  await expect(page).toHaveURL(/scene=/);

  await page.getByText('Reset').click();
  await page.getByLabel('Laden').first().click();
  await expect(page.getByText('Regression Szene')).toBeVisible();
});
