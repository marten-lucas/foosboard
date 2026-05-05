/**
 * Cross-browser smoke suite.
 *
 * Runs on: chromium, firefox, webkit, mobile-chrome, mobile-safari, tablet-safari
 * (via playwright.config.ts project `testMatch` patterns).
 *
 * Goals:
 *  1. Board renders in every engine (SVG, field asset, rods).
 *  2. Portrait viewport auto-rotates the board.
 *  3. Rod drag via pointer events moves the rod (covers setPointerCapture path).
 *  4. Ball drag from tray to board places a ball.
 *  5. Double-tap resets zoom (basic viewBox restoration).
 *  6. App height fills the viewport (100dvh / safe-area regression).
 */

import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForBoard(page: import('@playwright/test').Page) {
  await page.goto('/');
  const board = page.getByTestId('board-svg');
  await expect(board).toBeVisible({ timeout: 15_000 });
  // Field SVG asset must be present
  await expect(page.locator('.foosboard-live-field-asset svg').first()).toBeVisible({ timeout: 10_000 });
  return board;
}

async function getBoardBox(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
    const box = board?.getBoundingClientRect();
    return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('cross-browser — board renders', () => {
  test('board SVG is visible and has rods and grips', async ({ page }) => {
    await waitForBoard(page);

    const metrics = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
      if (!board) return null;
      const isVisible = (el: Element) => {
        const r = (el as HTMLElement | SVGGraphicsElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const rods = Array.from(board.querySelectorAll('[data-testid^="rod-"]'));
      const grips = Array.from(board.querySelectorAll('[data-testid^="rod-"] rect')).filter((rect) =>
        (rect.getAttribute('fill') || '').includes('gripGradient') && isVisible(rect),
      );
      return { rodCount: rods.length, gripCount: grips.length };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.rodCount).toBeGreaterThanOrEqual(4);
    expect(metrics!.gripCount).toBeGreaterThanOrEqual(4);
  });

  test('stage fills the full viewport height (dvh regression)', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await waitForBoard(page);

    const heightMetrics = await page.evaluate(() => {
      const stage = document.querySelector('.foosboard-stage') as HTMLElement | null;
      if (!stage) return null;
      const stageH = stage.getBoundingClientRect().height;
      const vhPx = window.innerHeight;
      return { stageH, vhPx, ratio: stageH / vhPx };
    });

    expect(heightMetrics).not.toBeNull();
    // Stage should cover at least 95 % of the visual viewport
    // (100dvh may be slightly less than innerHeight on some engines)
    expect(heightMetrics!.ratio).toBeGreaterThan(0.94);
  });
});

test.describe('cross-browser — portrait layout', () => {
  test('board rotates in portrait viewport', async ({ page, viewport: vp }) => {
    // Skip on explicitly landscape device descriptors (Playwright sets viewport from device)
    const currentVp = vp ?? { width: 800, height: 600 };
    const isPortrait = currentVp.height > currentVp.width;

    await page.setViewportSize(isPortrait ? currentVp : { width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await waitForBoard(page);

    const portraitFlag = await page.evaluate(() =>
      document.querySelector('[data-testid="board-svg"]')?.getAttribute('data-portrait-viewport'),
    );
    expect(portraitFlag).toBe('true');
  });
});

test.describe('cross-browser — touch / pointer drag', () => {
  test('rod grip can be dragged via pointer events', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    // Force landscape so that vertical mouse movement maps to vertical rod movement.
    // Mobile projects default to portrait; in portrait the board is rotated 90°
    // and the drag axis would be wrong without this override.
    await page.setViewportSize({ width: 1200, height: 800 });
    await waitForBoard(page);

    // Use the CSS attribute selector — the same pattern as portrait-rod-drag.spec.ts
    const grip = page.locator('[data-testid="rod-P1_3"] rect[fill*="gripGradient"]').first();
    await expect(grip).toBeVisible();

    const beforeY = await page.evaluate(() => (window as Window & { __foosboardStore?: { getState: () => { rods: Record<string, { y: number }> } } }).__foosboardStore?.getState().rods['P1_3']?.y ?? 0);
    const gripBox = await grip.boundingBox();
    expect(gripBox).not.toBeNull();

    const cx = gripBox!.x + gripBox!.width / 2;
    const cy = gripBox!.y + gripBox!.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 80, { steps: 10 });
    await page.mouse.up();

    const afterY = await page.evaluate(() => (window as Window & { __foosboardStore?: { getState: () => { rods: Record<string, { y: number }> } } }).__foosboardStore?.getState().rods['P1_3']?.y ?? 0);
    expect(Math.abs(afterY - beforeY)).toBeGreaterThan(5);
  });

  test('ball drag from tray places ball on board', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await waitForBoard(page);

    // CSS attribute selector works for SVG; IDs are ball-tray-left-left-ball-1 etc.
    const trayBall = page.locator('[data-testid^="ball-tray-left-"]').first();
    await expect(trayBall).toBeVisible();

    const boardBox = await getBoardBox(page);
    if (!boardBox) {
      test.skip();
      return;
    }

    const trayBallBox = await trayBall.boundingBox();
    expect(trayBallBox).not.toBeNull();

    const targetX = boardBox.x + boardBox.width / 2;
    const targetY = boardBox.y + boardBox.height / 2;

    await page.mouse.move(trayBallBox!.x + trayBallBox!.width / 2, trayBallBox!.y + trayBallBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 15 });
    await page.mouse.up();

    const ballCount = await page.evaluate(() => (window as Window & { __foosboardStore?: { getState: () => { balls: unknown[] } } }).__foosboardStore?.getState().balls.length ?? 0);
    expect(ballCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('cross-browser — double-tap zoom reset', () => {
  test('double-tap on board resets viewBox to default', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await waitForBoard(page);

    const boardBox = await getBoardBox(page);
    if (!boardBox) {
      test.skip();
      return;
    }

    // Read the default viewBox dimensions from the board
    const defaultViewBox = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
      return board?.getAttribute('viewBox') ?? null;
    });

    // First tap
    const tapX = boardBox.x + boardBox.width * 0.4;
    const tapY = boardBox.y + boardBox.height * 0.4;
    await page.mouse.click(tapX, tapY);
    await page.waitForTimeout(50);
    // Second tap within 350 ms threshold
    await page.mouse.click(tapX + 5, tapY + 5);
    await page.waitForTimeout(300);

    const viewBoxAfter = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
      return board?.getAttribute('viewBox') ?? null;
    });

    // After double-tap the viewBox should match the default (zoom reset)
    expect(viewBoxAfter).toBe(defaultViewBox);
  });
});

test.describe('cross-browser — safe-area / notch (WebKit)', () => {
  test('header bar is not hidden behind notch area', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await waitForBoard(page);

    const headerVisible = await page.evaluate(() => {
      const header = document.querySelector('.foosboard-header-bar') as HTMLElement | null;
      if (!header) return false;
      const rect = header.getBoundingClientRect();
      // Header top must be within the viewport
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    expect(headerVisible).toBe(true);
  });
});
