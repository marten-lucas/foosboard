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

// ── Landscape tilt ─────────────────────────────────────────────────────────────

test('landscape mobile: tapping figure tilt overlay cycles rod tilt', async ({ page }, testInfo) => {
  const supportsTouch = Boolean((testInfo.project.use as { hasTouch?: boolean }).hasTouch);
  test.skip(!supportsTouch, 'Requires a touch-capable project');

  // iPhone SE landscape: 667×375 — keeps viewport width ≤ 768px so isMobileViewport fires
  await page.setViewportSize({ width: 667, height: 375 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'false');

  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(tiltToggle).toBeVisible();

  const tiltBefore = await page.evaluate((id) => {
    const store = (window as Record<string, unknown>).__foosboardStore as { getState: () => { rods: Record<string, { tilt: string }> } } | undefined;
    return store?.getState().rods[id]?.tilt ?? '';
  }, rodId);
  expect(tiltBefore).toBe('neutral');

  const box = await tiltToggle.boundingBox();
  expect(box).not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  const pointerId = 780;

  // Dispatch a touch tap: pointerdown then pointerup on the same element (no movement)
  // pointerup must go to the element so the native tap-detection listener fires, then it
  // bubbles to window to also end the rod-drag state.
  await tiltToggle.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: cx,
    clientY: cy,
    bubbles: true,
  });
  await tiltToggle.dispatchEvent('pointerup', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: cx,
    clientY: cy,
    bubbles: true,
  });

  const tiltAfter = await page.evaluate((id) => {
    const store = (window as Record<string, unknown>).__foosboardStore as { getState: () => { rods: Record<string, { tilt: string }> } } | undefined;
    return store?.getState().rods[id]?.tilt ?? '';
  }, rodId);
  expect(tiltAfter).toBe('front');
});

test('landscape mobile: dragging figure tilt overlay area moves rod', async ({ page }, testInfo) => {
  const supportsTouch = Boolean((testInfo.project.use as { hasTouch?: boolean }).hasTouch);
  test.skip(!supportsTouch, 'Requires a touch-capable project');

  // iPhone SE landscape: 667×375 — keeps viewport width ≤ 768px so isMobileViewport fires
  await page.setViewportSize({ width: 667, height: 375 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'false');

  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(tiltToggle).toBeVisible();

  const beforeY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);

  const box = await tiltToggle.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  const pointerId = 781;

  await tiltToggle.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });

  // Move significantly — should move rod, not cycle tilt
  await page.evaluate(({ moveX, moveY, pid }) => {
    window.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: pid,
      pointerType: 'touch',
      isPrimary: true,
      clientX: moveX,
      clientY: moveY,
      bubbles: true,
    }));
  }, { moveX: startX, moveY: startY + 80, pid: pointerId });

  await page.evaluate(({ endX, endY, pid }) => {
    window.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: pid,
      pointerType: 'touch',
      isPrimary: true,
      clientX: endX,
      clientY: endY,
      bubbles: true,
    }));
  }, { endX: startX, endY: startY + 80, pid: pointerId });

  const afterY = await page.evaluate(() => window.__foosboardStore?.getState().rods.P2_2.y ?? 0);
  expect(Math.abs(afterY - beforeY)).toBeGreaterThan(20);
});

// ── Portrait figure alignment after tilt ───────────────────────────────────────

test('portrait figure stays aligned with rod after tilt change', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'true');

  const rodId = 'P2_2';
  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(tiltToggle).toBeVisible();

  // Cycle tilt to 'front'
  await tiltToggle.click();

  // After tilt change, figure must remain aligned with the rod
  const metrics = await page.evaluate((currentRodId) => {
    const rod = document.querySelector(`[data-testid="rod-${currentRodId}"]`) as SVGGElement | null;
    const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;
    if (!rod || !figure) return { aligned: false, missing: true, figureSize: 0 };

    const rodBox = rod.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    const rodIsHorizontal = rodBox.width > rodBox.height;
    const rodCenter = rodIsHorizontal ? rodBox.top + rodBox.height / 2 : rodBox.left + rodBox.width / 2;
    const figureStart = rodIsHorizontal ? figureBox.top : figureBox.left;
    const figureEnd = rodIsHorizontal ? figureBox.bottom : figureBox.right;
    const aligned = rodCenter >= figureStart - 6 && rodCenter <= figureEnd + 6;
    return {
      aligned,
      missing: false,
      figureSize: rodIsHorizontal ? figureBox.height : figureBox.width,
    };
  }, rodId);

  expect(metrics.missing).toBe(false);
  expect(metrics.aligned).toBe(true);
  // Figure must be a reasonable visual size (not collapsed to near-zero)
  expect(metrics.figureSize).toBeGreaterThan(8);
});

test('iphone hoch tilt keeps figure aligned and scaled in portrait', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-se-safari' && testInfo.project.name !== 'mobile-safari', 'iPhone WebKit only');

  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'true');
  await expect(tiltToggle).toBeVisible();

  await tiltToggle.click(); // front

  const front = await page.evaluate((currentRodId) => {
    const rod = document.querySelector(`[data-testid="rod-${currentRodId}"]`) as SVGGElement | null;
    const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;
    if (!rod || !figure) {
      return null;
    }
    const rodBox = rod.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    return {
      rodCenter: rodBox.top + rodBox.height / 2,
      figureTop: figureBox.top,
      figureBottom: figureBox.bottom,
      figureHeight: figureBox.height,
    };
  }, rodId);
  expect(front).not.toBeNull();

  await tiltToggle.click(); // back
  await tiltToggle.click(); // hochgestellt

  const highTilt = await page.evaluate((currentRodId) => {
    const rod = document.querySelector(`[data-testid="rod-${currentRodId}"]`) as SVGGElement | null;
    const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;
    const store = (window as Record<string, unknown>).__foosboardStore as { getState: () => { rods: Record<string, { tilt: string }> } } | undefined;
    if (!rod || !figure) {
      return null;
    }
    const rodBox = rod.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    return {
      tilt: store?.getState().rods[currentRodId]?.tilt ?? '',
      rodCenter: rodBox.top + rodBox.height / 2,
      figureTop: figureBox.top,
      figureBottom: figureBox.bottom,
      figureHeight: figureBox.height,
    };
  }, rodId);
  expect(highTilt).not.toBeNull();
  expect(highTilt?.tilt).toBe('hochgestellt');

  const frontAligned = (front?.rodCenter ?? 0) >= (front?.figureTop ?? 0) - 8 && (front?.rodCenter ?? 0) <= (front?.figureBottom ?? 0) + 8;
  expect(frontAligned).toBe(true);
  const highAligned = (highTilt?.rodCenter ?? 0) >= (highTilt?.figureTop ?? 0) - 8 && (highTilt?.rodCenter ?? 0) <= (highTilt?.figureBottom ?? 0) + 8;
  expect(highAligned).toBe(true);
  expect(highTilt?.figureHeight ?? 0).toBeGreaterThan((front?.figureHeight ?? 0) * 0.9);
  expect(highTilt?.figureHeight ?? 0).toBeLessThan((front?.figureHeight ?? 0) * 1.1);
});

test('iphone hoch tilt keeps figure aligned and scaled in landscape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-se-safari' && testInfo.project.name !== 'mobile-safari', 'iPhone WebKit only');

  await page.setViewportSize({ width: 667, height: 375 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const rodId = 'P2_2';
  const tiltToggle = page.locator(`[data-testid="rod-${rodId}-tilt-0"]`);
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'false');
  await expect(tiltToggle).toBeVisible();

  await tiltToggle.click(); // front

  const front = await page.evaluate((currentRodId) => {
    const rod = document.querySelector(`[data-testid="rod-${currentRodId}"]`) as SVGGElement | null;
    const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;
    if (!rod || !figure) {
      return null;
    }
    const rodBox = rod.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    return {
      rodCenter: rodBox.left + rodBox.width / 2,
      figureStart: figureBox.left,
      figureEnd: figureBox.right,
      figureSize: figureBox.width,
    };
  }, rodId);
  expect(front).not.toBeNull();

  await tiltToggle.click(); // back
  await tiltToggle.click(); // hochgestellt

  const highTilt = await page.evaluate((currentRodId) => {
    const rod = document.querySelector(`[data-testid="rod-${currentRodId}"]`) as SVGGElement | null;
    const figure = rod?.querySelector('foreignObject') as SVGForeignObjectElement | null;
    const store = (window as Record<string, unknown>).__foosboardStore as { getState: () => { rods: Record<string, { tilt: string }> } } | undefined;
    if (!rod || !figure) {
      return null;
    }
    const rodBox = rod.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    return {
      tilt: store?.getState().rods[currentRodId]?.tilt ?? '',
      rodCenter: rodBox.left + rodBox.width / 2,
      figureStart: figureBox.left,
      figureEnd: figureBox.right,
      figureSize: figureBox.width,
    };
  }, rodId);
  expect(highTilt).not.toBeNull();
  expect(highTilt?.tilt).toBe('hochgestellt');

  const frontAligned = (front?.rodCenter ?? 0) >= (front?.figureStart ?? 0) - 8 && (front?.rodCenter ?? 0) <= (front?.figureEnd ?? 0) + 8;
  expect(frontAligned).toBe(true);
  const highAligned = (highTilt?.rodCenter ?? 0) >= (highTilt?.figureStart ?? 0) - 8 && (highTilt?.rodCenter ?? 0) <= (highTilt?.figureEnd ?? 0) + 8;
  expect(highAligned).toBe(true);
  expect(highTilt?.figureSize ?? 0).toBeGreaterThan((front?.figureSize ?? 0) * 0.9);
  expect(highTilt?.figureSize ?? 0).toBeLessThan((front?.figureSize ?? 0) * 1.1);
});