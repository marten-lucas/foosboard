import { expect, test } from '@playwright/test';

const ROD_IDS = ['P2_1', 'P2_2', 'P2_5', 'P2_3', 'P1_3', 'P1_5', 'P1_2', 'P1_1'] as const;

async function getBoardBoxes(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const field = document.querySelector('.foosboard-live-field-asset') as HTMLElement | null;
    const frame = document.querySelector('[data-testid="board-svg"] rect[fill="none"][stroke="#111"]') as SVGRectElement | null;

    const fieldBox = field?.getBoundingClientRect();
    const frameBox = frame?.getBoundingClientRect();

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      fieldBox: fieldBox
        ? { x: fieldBox.x, y: fieldBox.y, width: fieldBox.width, height: fieldBox.height }
        : null,
      frameBox: frameBox
        ? { x: frameBox.x, y: frameBox.y, width: frameBox.width, height: frameBox.height }
        : null,
    };
  });
}

async function moveRodToExtreme(page: import('@playwright/test').Page, rodId: string, targetY: number) {
  await page.evaluate(({ currentRodId, currentTargetY }) => {
    const store = (window as Window & { __foosboardStore?: { getState: () => { moveRod: (rodId: string, y: number) => void } } }).__foosboardStore;
    if (!store) {
      throw new Error('Missing foosboard test store');
    }

    store.getState().moveRod(currentRodId, currentTargetY);
  }, { currentRodId: rodId, currentTargetY: targetY });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByTestId('board-svg')).toBeVisible();
});

test('rod ends stay outside the table at both travel limits', async ({ page }) => {
  const { fieldBox, frameBox, viewport } = await getBoardBoxes(page);

  expect(fieldBox).not.toBeNull();
  expect(frameBox).not.toBeNull();
  expect(viewport).not.toBeNull();

  for (const rodId of ROD_IDS) {
    const grip = page.locator(`[data-testid="rod-${rodId}"] rect[fill*="gripGradient"]`);
    const body = page.locator(`[data-testid="rod-${rodId}"] rect[fill*="rodGradient"]`);

    await expect(grip).toBeVisible();
    await expect(body).toBeVisible();

    await moveRodToExtreme(page, rodId, -9999);

    const topGripBox = await grip.boundingBox();
    const topBodyBox = await body.boundingBox();
    expect(topGripBox).not.toBeNull();
    expect(topBodyBox).not.toBeNull();

    expect(topGripBox!.height, `${rodId}: grip ist bei oberem Anschlag nicht sichtbar`).toBeGreaterThan(0);
    expect(topGripBox!.y, `${rodId}: grip ragt bei oberem Anschlag aus dem Viewport`).toBeGreaterThanOrEqual(0);
    expect(topBodyBox!.y, `${rodId}: Stangenanfang ist bei oberem Anschlag noch im Feld`).toBeLessThan(fieldBox!.y);
    expect(topBodyBox!.y + topBodyBox!.height, `${rodId}: Stangenende ist bei oberem Anschlag noch im Feld`).toBeGreaterThan(fieldBox!.y + fieldBox!.height);
    expect(topBodyBox!.y, `${rodId}: Stange ragt bei oberem Anschlag aus dem Viewport`).toBeGreaterThanOrEqual(0);
    expect(topBodyBox!.y + topBodyBox!.height, `${rodId}: Stange ragt bei oberem Anschlag unten aus dem Viewport`).toBeLessThanOrEqual(viewport!.height);

    await moveRodToExtreme(page, rodId, 9999);

    const bottomGripBox = await grip.boundingBox();
    const bottomBodyBox = await body.boundingBox();
    expect(bottomGripBox).not.toBeNull();
    expect(bottomBodyBox).not.toBeNull();

    expect(bottomGripBox!.height, `${rodId}: grip ist bei unterem Anschlag nicht sichtbar`).toBeGreaterThan(0);
    expect(bottomBodyBox!.y, `${rodId}: Stangenanfang ist bei unterem Anschlag noch im Feld`).toBeLessThan(fieldBox!.y);
    expect(bottomBodyBox!.y + bottomBodyBox!.height, `${rodId}: Stangenende ist bei unterem Anschlag noch im Feld`).toBeGreaterThan(fieldBox!.y + fieldBox!.height);
    expect(bottomGripBox!.y + bottomGripBox!.height, `${rodId}: grip ragt bei unterem Anschlag aus dem Viewport`).toBeLessThanOrEqual(viewport!.height);
    expect(bottomBodyBox!.y, `${rodId}: Stange ragt bei unterem Anschlag oben aus dem Viewport`).toBeGreaterThanOrEqual(0);
    expect(bottomBodyBox!.y + bottomBodyBox!.height, `${rodId}: Stange ragt bei unterem Anschlag aus dem Viewport`).toBeLessThanOrEqual(viewport!.height);
  }
});