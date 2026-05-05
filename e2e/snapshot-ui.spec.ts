/**
 * Snapshot / position-panel E2E coverage.
 *
 * The live snapshot UI is the offscreen control section (aria-label="Foosboard Steuerung")
 * containing hidden-but-accessible inputs and buttons. Snapshot names are reflected into the
 * DOM as plain text nodes in that section. Shot lines are listed with delete buttons
 * (aria-label="Linie löschen"). Tests use these accessible controls.
 */
import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1200 } });

async function waitForBoard(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  const board = page.getByTestId('board-svg');
  await expect(board).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.foosboard-live-field-asset svg').first()).toBeVisible({ timeout: 10_000 });
  return board;
}

async function saveSnapshot(page: Page, name: string) {
  await page.getByLabel('Snapshot-Name').fill(name, { force: true });
  await page.getByText('Speichern').dispatchEvent('click');
}

test.describe('snapshot / position panel UI', () => {
  test('saving a named snapshot makes the name appear in the snapshot list', async ({ page }) => {
    await waitForBoard(page);

    await saveSnapshot(page, 'Erster Testangriff');

    // The snapshot name is rendered in the hidden control section DOM
    await expect(page.getByText('Erster Testangriff')).toBeVisible({ timeout: 5_000 });
  });

  test('saving two snapshots makes both names appear', async ({ page }) => {
    await waitForBoard(page);

    await saveSnapshot(page, 'Alpha');
    await saveSnapshot(page, 'Beta');

    await expect(page.getByText('Alpha')).toBeVisible();
    await expect(page.getByText('Beta')).toBeVisible();
  });

  test('snapshot name input is cleared after saving', async ({ page }) => {
    await waitForBoard(page);

    await page.getByLabel('Snapshot-Name').fill('ClearTest', { force: true });
    await page.getByText('Speichern').dispatchEvent('click');

    // After save the input value should be cleared back to empty
    const inputValue = await page.getByLabel('Snapshot-Name').inputValue();
    expect(inputValue).toBe('');
  });

  test('snapshot state is accessible through the store after save', async ({ page }) => {
    await waitForBoard(page);

    await saveSnapshot(page, 'Store Check');

    const snapshotCount = await page.evaluate(() => {
      return window.__foosboardStore?.getState().snapshots.length ?? 0;
    });
    expect(snapshotCount).toBeGreaterThan(0);

    const snapshotName = await page.evaluate(() => {
      const snaps = window.__foosboardStore?.getState().snapshots;
      return snaps?.[snaps.length - 1]?.name ?? '';
    });
    expect(snapshotName).toBe('Store Check');
  });
});

test.describe('shot list UI', () => {
  async function placeBallAndCreateShot(page: Page) {
    const trayBall = page.getByTestId('ball-tray-left').locator('circle').first();
    const trayBox = await trayBall.boundingBox();
    const boardBox = await page.getByTestId('board-svg').boundingBox();
    if (!trayBox || !boardBox) throw new Error('Cannot get geometry');

    await page.mouse.move(trayBox.x + trayBox.width / 2, trayBox.y + trayBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2);
    await page.mouse.up();

    const ballHitbox = page.locator('[data-testid^="ball-hitbox-"]').first();
    await expect(ballHitbox).toBeVisible();
    const ballBox = await ballHitbox.boundingBox();
    if (!ballBox) throw new Error('Ball hitbox not found');

    await page.mouse.move(ballBox.x + ballBox.width / 2, ballBox.y + ballBox.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    const drawer = page.getByTestId('shot-drawer');
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Mitte' }).first().click();
    await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();
  }

  test('created shot line label appears in the offscreen UI list', async ({ page }) => {
    await waitForBoard(page);
    await placeBallAndCreateShot(page);

    // Verify via store that the shot was created with the right label
    const label = await page.evaluate(() => window.__foosboardStore?.getState().shots[0]?.label);
    expect(label).toBe('Schuss 1');

    // The label also appears in the offscreen control section DOM
    const offscreen = page.getByLabel('Foosboard Steuerung');
    await expect(offscreen.getByText('Schuss 1')).toHaveCount(1);
  });

  test('Linie löschen button removes the shot from the board and the list', async ({ page }) => {
    await waitForBoard(page);
    await placeBallAndCreateShot(page);

    // Shot exists in store
    const shotsBefore = await page.evaluate(() => window.__foosboardStore?.getState().shots.length ?? -1);
    expect(shotsBefore).toBe(1);

    await page.getByLabel('Foosboard Steuerung').getByRole('button', { name: 'Linie löschen' }).dispatchEvent('click');

    const shotCount = await page.evaluate(() => window.__foosboardStore?.getState().shots.length ?? -1);
    expect(shotCount).toBe(0);
  });

  test('saving a snapshot preserves the shot inside the snapshot scene', async ({ page }) => {
    await waitForBoard(page);
    await placeBallAndCreateShot(page);

    await saveSnapshot(page, 'Mit Schuss');

    const snapshotShotCount = await page.evaluate(() => {
      const snaps = window.__foosboardStore?.getState().snapshots;
      return snaps?.[snaps.length - 1]?.scene?.shots?.length ?? 0;
    });
    expect(snapshotShotCount).toBe(1);
  });
});


