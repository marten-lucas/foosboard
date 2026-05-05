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

/** Drag a ball from the tray to the board center and return the placed ball hitbox. */
async function placeBall(page: Page) {
  const trayBall = page.getByTestId('ball-tray-left').locator('circle').first();
  const trayBox = await trayBall.boundingBox();
  const boardBox = await page.getByTestId('board-svg').boundingBox();
  if (!trayBox || !boardBox) throw new Error('Could not get tray or board bounding box');

  const cx = boardBox.x + boardBox.width / 2;
  const cy = boardBox.y + boardBox.height / 2;

  await page.mouse.move(trayBox.x + trayBox.width / 2, trayBox.y + trayBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cx, cy);
  await page.mouse.up();

  return page.locator('[data-testid^="ball-hitbox-"]').first();
}

/** Place a ball and open the shot drawer by clicking the placed ball. */
async function openShotDrawer(page: Page) {
  const ball = await placeBall(page);
  await expect(ball).toBeVisible();

  const box = await ball.boundingBox();
  if (!box) throw new Error('Placed ball hitbox not found');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  const drawer = page.getByTestId('shot-drawer');
  await expect(drawer).toBeVisible();
  return drawer;
}

/** Create a shot by clicking a target in the drawer (assumes drawer is already open). */
async function createShotInDrawer(drawer: ReturnType<typeof test.extend> extends never ? never : ReturnType<Page['getByTestId']>) {
  await (drawer as ReturnType<Page['getByTestId']>).getByRole('button', { name: 'Mitte' }).first().click();
  await expect((drawer as ReturnType<Page['getByTestId']>).getByRole('button', { name: /Schuss 1/ })).toBeVisible();
}

test.describe('shot drawer — style buttons', () => {
  test('clicking Bande unten marks it as active (aria-pressed)', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    const bandeUntenBtn = drawer.getByRole('button', { name: 'Bande unten' });
    await expect(bandeUntenBtn).toBeVisible();

    // Default is "Gerader Schuss" (straight)
    await expect(drawer.getByRole('button', { name: 'Gerader Schuss' })).toHaveAttribute('aria-pressed', 'true');
    await expect(bandeUntenBtn).toHaveAttribute('aria-pressed', 'false');

    await bandeUntenBtn.click();
    await expect(bandeUntenBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer.getByRole('button', { name: 'Gerader Schuss' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking Bande oben marks it as active', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    const bandeObenBtn = drawer.getByRole('button', { name: 'Bande oben' });
    await bandeObenBtn.click();
    await expect(bandeObenBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('style selection persists to a created shot (stored as bank-top)', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    // Select bank-top style before creating the shot
    await drawer.getByRole('button', { name: 'Bande oben' }).click();

    // Create the shot by clicking a target button
    await drawer.getByRole('button', { name: 'Mitte' }).first().click();
    await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();

    // Verify via store that the shot was saved with the bank-top style
    const shotStyle = await page.evaluate(() => {
      const state = window.__foosboardStore?.getState();
      return state?.shots[0]?.shotStyle ?? null;
    });
    expect(shotStyle).toBe('bank-top');

    // A shot element must exist on the board
    expect(await page.locator('[data-testid^="shot-"]').count()).toBeGreaterThan(0);
  });
});

test.describe('shot drawer — collision toggle', () => {
  test('Kollision An / Aus buttons toggle aria-pressed state', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    const anBtn = drawer.getByRole('button', { name: 'An', exact: true });
    const ausBtn = drawer.getByRole('button', { name: 'Aus', exact: true });

    // Default: collision is off
    await expect(anBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(ausBtn).toHaveAttribute('aria-pressed', 'true');

    // Enable collision
    await anBtn.click();
    await expect(anBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(ausBtn).toHaveAttribute('aria-pressed', 'false');

    // Disable again
    await ausBtn.click();
    await expect(ausBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(anBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('collision setting is applied to created shot', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    // Enable collision before creating the shot
    await drawer.getByRole('button', { name: 'An', exact: true }).click();

    // Create shot
    await drawer.getByRole('button', { name: 'Mitte' }).first().click();
    await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();

    // Verify via store that collisionEnabled is true
    const collisionEnabled = await page.evaluate(() => {
      const state = window.__foosboardStore?.getState();
      const shots = state?.shots ?? [];
      return shots[0]?.collisionEnabled ?? null;
    });
    expect(collisionEnabled).toBe(true);
  });
});

test.describe('shot drawer — goal mode (3 vs 5 positions)', () => {
  test('switching to 5 Torpositionen shows 5 target buttons', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    // Default is 3-position mode
    await expect(drawer.getByRole('tab', { name: '3 Torpositionen' })).toHaveAttribute('aria-selected', 'true');
    const threeButtons = drawer.locator('.foosboard-shot-menu__button--target');
    expect(await threeButtons.count()).toBe(3);

    // Switch to 5-position mode
    await drawer.getByRole('tab', { name: '5 Torpositionen' }).click();
    await expect(drawer.getByRole('tab', { name: '5 Torpositionen' })).toHaveAttribute('aria-selected', 'true');

    const fiveButtons = drawer.locator('.foosboard-shot-menu__button--target');
    expect(await fiveButtons.count()).toBe(5);
  });

  test('can create a shot with a 5-position target', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    await drawer.getByRole('tab', { name: '5 Torpositionen' }).click();
    await drawer.getByRole('button', { name: 'Mitte rechts' }).click();

    await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();

    // Check store: shot was created with targetMode 5
    const targetMode = await page.evaluate(() => {
      const state = window.__foosboardStore?.getState();
      return state?.shots[0]?.targetMode ?? null;
    });
    expect(targetMode).toBe(5);
  });

  test('switching mode on existing shot updates targetMode in store', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    // Create a 3-position shot
    await drawer.getByRole('button', { name: 'Mitte' }).first().click();
    const shotBtn = drawer.getByRole('button', { name: /Schuss 1/ });
    await expect(shotBtn).toBeVisible();
    await shotBtn.click(); // select it

    // Switch to 5-position mode — updates the selected shot's targetMode
    await drawer.getByRole('tab', { name: '5 Torpositionen' }).click();
    await drawer.getByRole('button', { name: 'Mitte rechts' }).click();

    const targetMode = await page.evaluate(() => {
      const state = window.__foosboardStore?.getState();
      return state?.shots[0]?.targetMode ?? null;
    });
    expect(targetMode).toBe(5);
  });
});

test.describe('shot drawer — shot list and delete', () => {
  test('creating multiple shots lists them in the drawer', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    await drawer.getByRole('button', { name: 'Links' }).click();
    await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();

    await drawer.getByRole('button', { name: 'Neuer Schuss' }).click();
    await drawer.getByRole('button', { name: 'Rechts' }).click();
    await expect(drawer.getByRole('button', { name: /Schuss 2/ })).toBeVisible();
  });

  test('Schuss löschen removes the selected shot from board and drawer', async ({ page }) => {
    await waitForBoard(page);
    const drawer = await openShotDrawer(page);

    // Create shot
    await drawer.getByRole('button', { name: 'Mitte' }).first().click();
    const shotBtn = drawer.getByRole('button', { name: /Schuss 1/ });
    await expect(shotBtn).toBeVisible();

    // Select it
    await shotBtn.click();

    // Delete it
    await drawer.getByRole('button', { name: 'Ausgewählten Schuss löschen' }).click();

    // Shot is gone from drawer
    await expect(shotBtn).not.toBeVisible();

    // Shot is gone from board store
    const shotCount = await page.evaluate(() => window.__foosboardStore?.getState().shots.length ?? -1);
    expect(shotCount).toBe(0);
  });
});
