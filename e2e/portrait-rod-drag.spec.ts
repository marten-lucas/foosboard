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

test('portrait rod drag follows touch pointer gesture', async ({ page }, testInfo) => {
  const supportsTouch = Boolean((testInfo.project.use as { hasTouch?: boolean }).hasTouch);
  test.skip(!supportsTouch, 'Requires a touch-capable project');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const grip = page.locator('[data-testid="rod-P2_2"] [data-testid="rod-P2_2-drag-hitarea"]').first();
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'true');
  await expect(grip).toBeVisible();

  const beforeY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  const gripBox = await grip.boundingBox();
  expect(gripBox).not.toBeNull();

  const startX = gripBox!.x + gripBox!.width / 2;
  const startY = gripBox!.y + gripBox!.height / 2;
  const pointerId = 777;

  await grip.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });

  await page.evaluate(({ moveX, moveY, pid }) => {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
        clientX: moveX,
        clientY: moveY,
        bubbles: true,
      }),
    );
  }, { moveX: startX - 90, moveY: startY, pid: pointerId });

  await page.evaluate(({ endX, endY, pid }) => {
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
        clientX: endX,
        clientY: endY,
        bubbles: true,
      }),
    );
  }, { endX: startX - 90, endY: startY, pid: pointerId });

  const afterY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  expect(Math.abs(afterY - beforeY)).toBeGreaterThan(20);
});

test('portrait startup keeps figure bounds aligned with rods', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'true');

  const metrics = await page.evaluate(() => {
    const rodIds = ['P2_1', 'P2_2', 'P2_5', 'P2_3'];
    const rows = rodIds.map((rodId) => {
      const rod = document.querySelector(`[data-testid="rod-${rodId}"]`) as SVGGElement | null;
      const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;

      if (!rod || !figure) {
        return { rodId, aligned: false, missing: true };
      }

      const rodBox = rod.getBoundingClientRect();
      const figureBox = figure.getBoundingClientRect();
      const rodIsHorizontal = rodBox.width > rodBox.height;
      const rodCenterOnCrossAxis = rodIsHorizontal ? rodBox.top + rodBox.height / 2 : rodBox.left + rodBox.width / 2;
      const figureCrossAxisStart = rodIsHorizontal ? figureBox.top : figureBox.left;
      const figureCrossAxisEnd = rodIsHorizontal ? figureBox.bottom : figureBox.right;
      const aligned = rodCenterOnCrossAxis >= figureCrossAxisStart - 4 && rodCenterOnCrossAxis <= figureCrossAxisEnd + 4;

      return {
        rodId,
        aligned,
        missing: false,
        rodCenterOnCrossAxis,
        figureCrossAxisStart,
        figureCrossAxisEnd,
      };
    });

    return {
      rows,
      alignedCount: rows.filter((row) => row.aligned).length,
      missingCount: rows.filter((row) => row.missing).length,
    };
  });

  expect(metrics.missingCount).toBe(0);
  expect(metrics.alignedCount).toBeGreaterThanOrEqual(4);
});

test('portrait board pan reacts predictably to horizontal drag', async ({ page }, testInfo) => {
  const supportsTouch = Boolean((testInfo.project.use as { hasTouch?: boolean }).hasTouch);
  test.skip(!supportsTouch, 'Requires a touch-capable project');

  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const board = page.getByTestId('board-svg');
  await expect(board).toHaveAttribute('data-portrait-viewport', 'true');

  const before = await board.getAttribute('viewBox');
  const boardBox = await board.boundingBox();
  expect(before).not.toBeNull();
  expect(boardBox).not.toBeNull();

  const startX = boardBox!.x + boardBox!.width * 0.3;
  const startY = boardBox!.y + boardBox!.height * 0.5;
  const pointerId = 778;

  await board.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });

  await page.evaluate(({ moveX, moveY, pid }) => {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
        clientX: moveX,
        clientY: moveY,
        bubbles: true,
      }),
    );
  }, { moveX: startX - 70, moveY: startY, pid: pointerId });

  await page.evaluate(({ endX, endY, pid }) => {
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
        clientX: endX,
        clientY: endY,
        bubbles: true,
      }),
    );
  }, { endX: startX - 70, endY: startY, pid: pointerId });

  const after = await board.getAttribute('viewBox');
  expect(after).not.toBeNull();
  expect(after).not.toBe(before);

  const [beforeX, beforeY] = (before || '0 0 0 0').split(' ').map(Number);
  const [afterX, afterY] = (after || '0 0 0 0').split(' ').map(Number);
  expect(Math.abs(afterY - beforeY)).toBeGreaterThan(5);
  expect(Math.abs(afterY - beforeY)).toBeGreaterThanOrEqual(Math.abs(afterX - beforeX));
});

test('landscape startup keeps figure bounds aligned with rods', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'false');

  const metrics = await page.evaluate(() => {
    const rodIds = ['P2_1', 'P2_2', 'P2_5', 'P2_3'];
    const rows = rodIds.map((rodId) => {
      const rod = document.querySelector(`[data-testid="rod-${rodId}"]`) as SVGGElement | null;
      const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;

      if (!rod || !figure) {
        return { rodId, aligned: false, missing: true };
      }

      const rodBox = rod.getBoundingClientRect();
      const figureBox = figure.getBoundingClientRect();
      const rodIsHorizontal = rodBox.width > rodBox.height;
      const rodCenterOnCrossAxis = rodIsHorizontal ? rodBox.top + rodBox.height / 2 : rodBox.left + rodBox.width / 2;
      const figureCrossAxisStart = rodIsHorizontal ? figureBox.top : figureBox.left;
      const figureCrossAxisEnd = rodIsHorizontal ? figureBox.bottom : figureBox.right;
      const aligned = rodCenterOnCrossAxis >= figureCrossAxisStart - 4 && rodCenterOnCrossAxis <= figureCrossAxisEnd + 4;

      return { rodId, aligned, missing: false };
    });

    return {
      rows,
      alignedCount: rows.filter((row) => row.aligned).length,
      missingCount: rows.filter((row) => row.missing).length,
    };
  });

  expect(metrics.missingCount).toBe(0);
  expect(metrics.alignedCount).toBeGreaterThanOrEqual(4);
});

test('landscape rod drag follows vertical touch pointer gesture', async ({ page }, testInfo) => {
  const supportsTouch = Boolean((testInfo.project.use as { hasTouch?: boolean }).hasTouch);
  test.skip(!supportsTouch, 'Requires a touch-capable project');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const grip = page.locator('[data-testid="rod-P2_2"] [data-testid="rod-P2_2-drag-hitarea"]').first();
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'false');
  await expect(grip).toBeVisible();

  const beforeY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  const gripBox = await grip.boundingBox();
  expect(gripBox).not.toBeNull();

  const startX = gripBox!.x + gripBox!.width / 2;
  const startY = gripBox!.y + gripBox!.height / 2;
  const pointerId = 779;

  await grip.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });

  await page.evaluate(({ moveX, moveY, pid }) => {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
        clientX: moveX,
        clientY: moveY,
        bubbles: true,
      }),
    );
  }, { moveX: startX, moveY: startY + 90, pid: pointerId });

  await page.evaluate(({ endX, endY, pid }) => {
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
        clientX: endX,
        clientY: endY,
        bubbles: true,
      }),
    );
  }, { endX: startX, endY: startY + 90, pid: pointerId });

  const afterY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  expect(Math.abs(afterY - beforeY)).toBeGreaterThan(20);
});