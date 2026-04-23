import { expect, test } from '@playwright/test';

const ROD_IDS = ['P2_1', 'P2_2', 'P2_5', 'P2_3', 'P1_3', 'P1_5', 'P1_2', 'P1_1'] as const;

const VIEWPORT_CASES = [
  { name: 'phone portrait', width: 390, height: 844, portrait: true, minPrimaryUsage: 0.75, minSecondaryUsage: 0.3 },
  { name: 'phone landscape', width: 844, height: 390, portrait: false, minPrimaryUsage: 0.9, minSecondaryUsage: 0.45 },
  { name: 'tablet portrait', width: 768, height: 1024, portrait: true, minPrimaryUsage: 0.8, minSecondaryUsage: 0.55 },
  { name: 'tablet landscape', width: 1024, height: 768, portrait: false, minPrimaryUsage: 0.72, minSecondaryUsage: 0.65 },
] as const;

async function moveRodToExtreme(page: import('@playwright/test').Page, rodId: string, targetY: number) {
  await page.evaluate(({ currentRodId, currentTargetY }) => {
    const store = (window as Window & { __foosboardStore?: { getState: () => { moveRod: (rodId: string, y: number) => void } } }).__foosboardStore;
    if (!store) {
      throw new Error('Missing foosboard test store');
    }

    store.getState().moveRod(currentRodId, currentTargetY);
  }, { currentRodId: rodId, currentTargetY: targetY });
}

async function readBoardMetrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
    const stage = document.querySelector('.foosboard-stage') as HTMLElement | null;
    const field = document.querySelector('.foosboard-live-field-asset') as HTMLElement | null;
    const boardBox = board?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();
    const fieldBox = field?.getBoundingClientRect();

    return {
      portraitFlag: board?.getAttribute('data-portrait-viewport') || 'false',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      boardBox: boardBox
        ? { top: boardBox.top, right: boardBox.right, bottom: boardBox.bottom, left: boardBox.left, width: boardBox.width, height: boardBox.height }
        : null,
      stageBox: stageBox
        ? { top: stageBox.top, right: stageBox.right, bottom: stageBox.bottom, left: stageBox.left, width: stageBox.width, height: stageBox.height }
        : null,
      fieldBox: fieldBox
        ? { top: fieldBox.top, right: fieldBox.right, bottom: fieldBox.bottom, left: fieldBox.left, width: fieldBox.width, height: fieldBox.height }
        : null,
    };
  });
}

for (const viewportCase of VIEWPORT_CASES) {
  test(`responsive board stays usable in ${viewportCase.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewportCase.width, height: viewportCase.height });
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto('/');

    const board = page.getByTestId('board-svg');
    await expect(board).toBeVisible();
    await expect(page.locator('.foosboard-live-field-asset svg').first()).toBeVisible();

    const metrics = await readBoardMetrics(page);
    expect(metrics.boardBox).not.toBeNull();
    expect(metrics.stageBox).not.toBeNull();
    expect(metrics.fieldBox).not.toBeNull();
    expect(metrics.portraitFlag).toBe(viewportCase.portrait ? 'true' : 'false');

    const boardBox = metrics.boardBox!;
    const stageBox = metrics.stageBox!;
    const fieldBox = metrics.fieldBox!;

    expect(boardBox.top - stageBox.top).toBeGreaterThan(8);
    expect(stageBox.bottom - boardBox.bottom).toBeGreaterThan(8);
    expect(boardBox.left - stageBox.left).toBeGreaterThanOrEqual(0);
    expect(stageBox.right - boardBox.right).toBeGreaterThanOrEqual(0);

    const widthUsage = boardBox.width / stageBox.width;
    const heightUsage = boardBox.height / stageBox.height;
    expect(Math.max(widthUsage, heightUsage), `${viewportCase.name}: board verschenkt zu viel Platz`).toBeGreaterThan(viewportCase.minPrimaryUsage);
    expect(Math.min(widthUsage, heightUsage), `${viewportCase.name}: board nutzt die Nebenachse zu wenig`).toBeGreaterThan(viewportCase.minSecondaryUsage);

    for (const rodId of ROD_IDS) {
      const grip = page.locator(`[data-testid="rod-${rodId}"] rect[fill*="gripGradient"]`).first();
      const body = page.locator(`[data-testid="rod-${rodId}"] rect[fill*="rodGradient"]`).first();

      await expect(grip).toBeVisible();
      await expect(body).toBeVisible();

      for (const targetY of [-9999, 9999]) {
        await moveRodToExtreme(page, rodId, targetY);

        const gripBox = await grip.boundingBox();
        const bodyBox = await body.boundingBox();
        expect(gripBox, `${viewportCase.name}/${rodId}: grip box missing`).not.toBeNull();
        expect(bodyBox, `${viewportCase.name}/${rodId}: rod box missing`).not.toBeNull();

        expect(gripBox!.height, `${viewportCase.name}/${rodId}: grip invisible at extreme`).toBeGreaterThan(0);
        expect(gripBox!.y, `${viewportCase.name}/${rodId}: grip above viewport`).toBeGreaterThanOrEqual(0);
        expect(gripBox!.y + gripBox!.height, `${viewportCase.name}/${rodId}: grip below viewport`).toBeLessThanOrEqual(metrics.viewport.height);
        expect(bodyBox!.y, `${viewportCase.name}/${rodId}: rod above viewport`).toBeGreaterThanOrEqual(0);
        expect(bodyBox!.y + bodyBox!.height, `${viewportCase.name}/${rodId}: rod below viewport`).toBeLessThanOrEqual(metrics.viewport.height);

        if (viewportCase.portrait) {
          expect(bodyBox!.x, `${viewportCase.name}/${rodId}: rod left of viewport`).toBeGreaterThanOrEqual(0);
          expect(bodyBox!.x + bodyBox!.width, `${viewportCase.name}/${rodId}: rod right of viewport`).toBeLessThanOrEqual(metrics.viewport.width);
          expect(bodyBox!.x, `${viewportCase.name}/${rodId}: rod no longer overhangs field on the left`).toBeLessThan(fieldBox.left);
          expect(bodyBox!.x + bodyBox!.width, `${viewportCase.name}/${rodId}: rod no longer overhangs field on the right`).toBeGreaterThan(fieldBox.right);
        } else {
          expect(bodyBox!.y, `${viewportCase.name}/${rodId}: rod no longer overhangs field at top`).toBeLessThan(fieldBox.top);
          expect(bodyBox!.y + bodyBox!.height, `${viewportCase.name}/${rodId}: rod no longer overhangs field at bottom`).toBeGreaterThan(fieldBox.bottom);
        }
      }
    }
  });
}