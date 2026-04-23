import path from 'node:path';
import { expect, test } from '@playwright/test';

const fieldSvgPath = path.resolve(process.cwd(), 'testdata/foosball_table_p4p_field.svg');
const playerSvgPath = path.resolve(process.cwd(), 'testdata/foosball_table_player.svg');

async function expectContained(locator: Parameters<typeof test>[1] extends never ? never : any) {
  const metrics = await locator.evaluate((element: HTMLElement) => {
    const previewBox = element.getBoundingClientRect();
    const shapes = Array.from(element.querySelectorAll('svg rect, svg circle, svg path, svg ellipse, svg polygon, svg polyline, svg line'));
    const visibleCount = shapes.filter((shape) => {
      const rect = (shape as SVGGraphicsElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > previewBox.left && rect.left < previewBox.right && rect.bottom > previewBox.top && rect.top < previewBox.bottom;
    }).length;

    return {
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      visibleCount,
    };
  });

  expect(metrics.visibleCount).toBeGreaterThan(0);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
}

async function expectLandscapeStartupBoard(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
    const stage = document.querySelector('.foosboard-stage') as HTMLElement | null;
    const boardBox = board?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();

    return {
      portraitFlag: board?.getAttribute('data-portrait-viewport') || 'true',
      boardWidthRatio: boardBox && stageBox ? boardBox.width / stageBox.width : 0,
      boardHeightRatio: boardBox && stageBox ? boardBox.height / stageBox.height : 0,
      topGap: boardBox && stageBox ? boardBox.top - stageBox.top : 0,
      bottomGap: boardBox && stageBox ? stageBox.bottom - boardBox.bottom : 0,
    };
  });

  expect(metrics.portraitFlag).toBe('false');
  expect(metrics.boardWidthRatio).toBeGreaterThan(0.55);
  expect(metrics.boardWidthRatio).toBeLessThan(0.8);
  expect(metrics.boardHeightRatio).toBeGreaterThan(0.6);
  expect(metrics.boardHeightRatio).toBeLessThan(0.86);
  expect(Math.max(metrics.boardWidthRatio, metrics.boardHeightRatio)).toBeGreaterThan(0.72);
  expect(metrics.topGap).toBeGreaterThan(60);
  expect(metrics.bottomGap).toBeGreaterThan(60);
}

async function expectJsonStartupBoard(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
    const fieldAsset = document.querySelector('.foosboard-live-field-asset svg') as SVGSVGElement | null;

    if (!board) {
      return null;
    }

    const boardBox = board.getBoundingClientRect();
    const isVisible = (element: Element) => {
      const rect = (element as HTMLElement | SVGGraphicsElement).getBoundingClientRect();
      return (rect.width > 0 || rect.height > 0) && rect.right > boardBox.left && rect.left < boardBox.right && rect.bottom > boardBox.top && rect.top < boardBox.bottom;
    };

    const rects = Array.from(board.querySelectorAll('rect'));
    const goalCount = rects.filter((rect) => {
      const width = Number(rect.getAttribute('width') || 0);
      const height = Number(rect.getAttribute('height') || 0);
      return width > 0 && width <= 10 && height >= 80 && isVisible(rect);
    }).length;

    // Stangen werden als <rect> mit url(#rodGradient) gerendert (seit Lichteffekt-Refactor).
    const rodCount = Array.from(board.querySelectorAll('[data-testid^="rod-"] rect')).filter((rect) => (rect.getAttribute('fill') || '').includes('rodGradient') && isVisible(rect)).length;

    const gripCount = Array.from(board.querySelectorAll('[data-testid^="rod-"] rect')).filter((rect) => {
      const fill = (rect.getAttribute('fill') || '').toLowerCase();
      const width = Number(rect.getAttribute('width') || 0);
      const height = Number(rect.getAttribute('height') || 0);
      return fill.includes('gripgradient') && width >= 10 && height >= 20 && isVisible(rect);
    }).length;

    const transparentFieldBlockingZones = Array.from(board.querySelectorAll('[data-testid^="rod-"] rect')).filter((rect) => {
      if ((rect.getAttribute('fill') || '').toLowerCase() !== 'transparent') {
        return false;
      }

      if (!fieldAsset) {
        return isVisible(rect);
      }

      const rectBox = rect.getBoundingClientRect();
      const fieldBox = fieldAsset.getBoundingClientRect();
      return rectBox.right > fieldBox.left && rectBox.left < fieldBox.right && rectBox.bottom > fieldBox.top && rectBox.top < fieldBox.bottom;
    }).length;

    const figures = Array.from(board.querySelectorAll('foreignObject')).filter(isVisible);
    const figureCount = figures.length;
    const maxFigureWidth = Math.max(...figures.map((figure) => Number(figure.getAttribute('width') || 0)), 0);
    const ballVisible = Boolean(document.querySelector('[data-testid="ball-token"]') && isVisible(document.querySelector('[data-testid="ball-token"]') as Element));

    return {
      hasFieldAsset: Boolean(fieldAsset && isVisible(fieldAsset)),
      goalCount,
      rodCount,
      gripCount,
      transparentFieldBlockingZones,
      figureCount,
      maxFigureWidth,
      ballVisible,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.hasFieldAsset).toBeTruthy();
  expect(metrics?.goalCount).toBeGreaterThanOrEqual(2);
  expect(metrics?.rodCount).toBeGreaterThanOrEqual(8);
  expect(metrics?.gripCount).toBeGreaterThanOrEqual(8);
  expect(metrics?.transparentFieldBlockingZones).toBe(0);
  expect(metrics?.figureCount).toBeGreaterThanOrEqual(22);
  expect(metrics?.maxFigureWidth).toBeGreaterThanOrEqual(15);
  expect(metrics?.ballVisible).toBeFalsy();
}

async function expectPortraitStartupBoard(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="board-svg"]') as SVGSVGElement | null;
    const stage = document.querySelector('.foosboard-stage') as HTMLElement | null;
    const boardBox = board?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();

    return {
      portraitFlag: board?.getAttribute('data-portrait-viewport') || 'false',
      topGap: boardBox && stageBox ? boardBox.top - stageBox.top : 0,
      bottomGap: boardBox && stageBox ? stageBox.bottom - boardBox.bottom : 0,
    };
  });

  expect(metrics.portraitFlag).toBe('true');
  expect(metrics.topGap).toBeGreaterThan(40);
  expect(metrics.bottomGap).toBeGreaterThan(40);
}

test('smoke: app loads and table previews stay stable', async ({ page }) => {
  await page.setViewportSize({ width: 596, height: 632 });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'foosboard.tableLayout',
      JSON.stringify({
        name: 'legacy-save',
        manufacturer: 'old-app',
        field: { lengthCm: 120, widthCm: 68, goalWidthCm: 20.5 },
      }),
    );
  });

  await page.goto('/');

  await expect(page.getByTestId('board-svg')).toBeVisible();
  await expect(page.getByText('Foosboard')).toHaveCount(1);
  await expect(page.locator('.foosboard-live-field-asset svg').first()).toBeVisible();
  await expectJsonStartupBoard(page);
  await expectPortraitStartupBoard(page);

  const staleLayoutAfterLoad = await page.evaluate(() => window.localStorage.getItem('foosboard.tableLayout'));
  expect(staleLayoutAfterLoad).toContain('legacy-save');

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByTestId('board-svg')).toHaveAttribute('data-portrait-viewport', 'false');
  await page.waitForTimeout(350);
  await expectLandscapeStartupBoard(page);

  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Tische konfigurieren').click();

  await expect(page.getByText('Tischkonfiguration')).toBeVisible();

  await page.locator('[data-testid="field-upload"] input[type="file"]').setInputFiles(fieldSvgPath);
  await expect(page.getByText(/Hinweis: Das hochgeladene Spielfeld-SVG/i)).toHaveCount(0);

  const fieldCanvas = page.getByTestId('field-preview-canvas');
  await expect(fieldCanvas).toBeVisible();
  await expect(fieldCanvas.locator('svg').first()).toBeVisible();
  await expectContained(fieldCanvas);

  const fieldFooterLayout = await page.evaluate(() => {
    const preview = document.querySelector('[data-testid="field-preview-canvas"]') as HTMLElement | null;
    const footer = document.querySelector('.foosboard-config-footer') as HTMLElement | null;
    return {
      previewBottom: preview?.getBoundingClientRect().bottom ?? 0,
      footerTop: footer?.getBoundingClientRect().top ?? 0,
    };
  });
  expect(fieldFooterLayout.previewBottom).toBeLessThanOrEqual(fieldFooterLayout.footerTop);

  await page.getByRole('button', { name: /weiter/i }).click();

  const rodCanvas = page.getByTestId('rod-preview-canvas');
  await expect(rodCanvas).toBeVisible();
  await expectContained(rodCanvas);
  await expect(page.getByTestId('figure-rod-preview-canvas')).toHaveCount(0);

  const rodFooterLayout = await page.evaluate(() => {
    const preview = document.querySelector('[data-testid="rod-preview-canvas"]') as HTMLElement | null;
    const footer = document.querySelector('.foosboard-config-footer') as HTMLElement | null;
    return {
      previewBottom: preview?.getBoundingClientRect().bottom ?? 0,
      footerTop: footer?.getBoundingClientRect().top ?? 0,
    };
  });
  expect(rodFooterLayout.previewBottom).toBeLessThanOrEqual(rodFooterLayout.footerTop);

  await page.getByRole('button', { name: /weiter/i }).click();

  const figureRodCanvas = page.getByTestId('figure-rod-preview-canvas');
  await expect(figureRodCanvas).toBeVisible();
  await expectContained(figureRodCanvas);
  await expect(page.getByText('Puppe mit Stange')).toHaveCount(0);

  const figureRodBallCount = await figureRodCanvas.evaluate((element) =>
    Array.from(element.querySelectorAll('circle')).filter((circle) => {
      const fill = (circle.getAttribute('fill') || '').toLowerCase();
      return ['#f5f5f5', '#fdfcf8', 'rgb(245, 245, 245)', 'rgb(253, 252, 248)'].includes(fill);
    }).length,
  );
  expect(figureRodBallCount).toBeGreaterThan(0);

  await page.locator('[data-testid="figure-upload"] input[type="file"]').setInputFiles(playerSvgPath);

  for (const previewId of ['figure-preview-bottom', 'figure-preview-forward', 'figure-preview-backward']) {
    const preview = page.getByTestId(previewId);
    await expect(preview).toBeVisible();
    await expect(preview.locator('svg').first()).toBeVisible();
    await expectContained(preview);
  }

  const figurePreviewHeights = await page.evaluate(() => {
    const compactPreview = document.querySelector('[data-testid="figure-rod-preview-card"]') as HTMLElement | null;
    const bottomPreview = document.querySelector('[data-testid="figure-preview-bottom"]') as HTMLElement | null;

    return {
      compactHeight: compactPreview?.getBoundingClientRect().height ?? 0,
      bottomHeight: bottomPreview?.getBoundingClientRect().height ?? 0,
    };
  });

  // Beide Elemente müssen gerendert und sichtbar sein
  expect(figurePreviewHeights.compactHeight).toBeGreaterThanOrEqual(100);
  expect(figurePreviewHeights.bottomHeight).toBeGreaterThanOrEqual(100);

  await page.getByRole('button', { name: /weiter/i }).click();

  const resultCanvas = page.getByTestId('result-preview-canvas');
  await expect(resultCanvas).toBeVisible();
  await expectContained(resultCanvas);
  await expect(page.getByTestId('save-table-config')).toBeVisible();
  await expect(page.getByTestId('download-json')).toBeVisible();
});
