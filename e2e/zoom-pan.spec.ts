import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1200 } });

async function waitForBoard(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  const board = page.getByTestId('board-svg');
  await expect(board).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.foosboard-live-field-asset svg').first()).toBeVisible({ timeout: 10_000 });
  return board;
}

async function getViewBox(page: Page) {
  const vb = await page.getByTestId('board-svg').getAttribute('viewBox');
  const parts = (vb ?? '').split(' ').map(Number);
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

async function waitForViewBoxChange(page: Page, previousWidth: number) {
  await page.waitForFunction(
    (prev) => {
      const svg = document.querySelector('[data-testid="board-svg"]');
      const vb = svg?.getAttribute('viewBox')?.split(' ');
      return !!vb && Math.abs(Number(vb[2]) - prev) > 0.1;
    },
    previousWidth,
    { timeout: 5_000 },
  );
}

// Board default dimensions
const DEFAULT_WIDTH = 610;

test.describe('zoom and pan', () => {
  test('mouse wheel zoom in reduces the viewBox width', async ({ page }) => {
    const board = await waitForBoard(page);
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Hover center of board, then scroll up (zoom in)
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -300);
    await waitForViewBoxChange(page, DEFAULT_WIDTH);

    const after = await getViewBox(page);
    expect(after.width).toBeLessThan(DEFAULT_WIDTH);
  });

  test('mouse wheel zoom out increases the viewBox width', async ({ page }) => {
    // First zoom in so we have room to zoom out
    const board = await waitForBoard(page);
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -300); // zoom in first
    await waitForViewBoxChange(page, DEFAULT_WIDTH);
    const afterZoomIn = await getViewBox(page);

    await page.mouse.wheel(0, 600); // zoom out
    await waitForViewBoxChange(page, afterZoomIn.width);
    const after = await getViewBox(page);
    expect(after.width).toBeGreaterThan(afterZoomIn.width);
  });

  test('zoom is clamped at minimum (≥15% of board width)', async ({ page }) => {
    const board = await waitForBoard(page);
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Zoom in aggressively far beyond the minimum
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -500);
    }

    const vb = await getViewBox(page);
    // Min width = boardConfig.width * 0.15 = 610 * 0.15 = 91.5
    expect(vb.width).toBeGreaterThanOrEqual(85);
    expect(vb.width).toBeLessThan(DEFAULT_WIDTH);
  });

  test('zoom is clamped at maximum (≤250% of board width)', async ({ page }) => {
    const board = await waitForBoard(page);
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Zoom out aggressively far beyond the maximum
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 500);
    }

    const vb = await getViewBox(page);
    // Max width = boardConfig.width * 2.5 = 610 * 2.5 = 1525
    expect(vb.width).toBeLessThanOrEqual(1530);
  });

  test('pointer drag on empty board area pans the view', async ({ page }) => {
    const board = await waitForBoard(page);
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Zoom in so there is room to pan
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -800);

    const before = await getViewBox(page);
    expect(before.width).toBeLessThan(DEFAULT_WIDTH * 0.9);

    // Pan by dragging on the board frame area (top-left corner, no interactive elements there)
    const startX = box!.x + 15;
    const startY = box!.y + 15;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 120, startY + 120, { steps: 12 });
    await page.mouse.up();

    const after = await getViewBox(page);
    // viewBox origin must have shifted (total displacement > 1 SVG unit)
    const delta = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(delta).toBeGreaterThan(1);
  });

  test('double-tap on empty board resets viewBox to default', async ({ page }) => {
    const board = await waitForBoard(page);
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Zoom in first
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -600);
    const zoomed = await getViewBox(page);
    expect(zoomed.width).toBeLessThan(DEFAULT_WIDTH * 0.9);

    // Double-tap on empty board area (frame corner)
    const tapX = box!.x + 15;
    const tapY = box!.y + 15;
    await page.mouse.move(tapX, tapY);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(40);
    await page.mouse.down();
    await page.mouse.up();

    const reset = await getViewBox(page);
    // Width should be restored close to the default board width
    expect(Math.abs(reset.width - DEFAULT_WIDTH)).toBeLessThan(5);
  });
});
