import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const fieldSvgPath = path.resolve(process.cwd(), 'testdata/foosball_table_p4p_field.svg');
const playerSvgPath = path.resolve(process.cwd(), 'testdata/foosball_table_player.svg');
const startupTargetPath = path.resolve(process.cwd(), 'testdata/AppStart_Target.png');

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

async function expectStartupBoardMatchesReference(page: import('@playwright/test').Page) {
  const expectedBuffer = fs.readFileSync(startupTargetPath);
  const actualBuffer = await page.screenshot({ fullPage: false, animations: 'disabled' });

  const comparison = await page.evaluate(async ({ actualBase64, expectedBase64 }) => {
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 32)}`));
        image.src = src;
      });

    const getImageData = (image: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Missing canvas context');
      }

      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height).data;
    };

    const findFieldBounds = (data: Uint8ClampedArray, width: number, height: number) => {
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          if (a > 200 && g > 160 && r < 100 && b < 100) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(maxX - minX + 1, 1),
        height: Math.max(maxY - minY + 1, 1),
      };
    };

    const [actualImage, expectedImage] = await Promise.all([
      loadImage(`data:image/png;base64,${actualBase64}`),
      loadImage(`data:image/png;base64,${expectedBase64}`),
    ]);

    const actualData = getImageData(actualImage);
    const expectedData = getImageData(expectedImage);
    const actualBounds = findFieldBounds(actualData, actualImage.width, actualImage.height);
    const expectedBounds = findFieldBounds(expectedData, expectedImage.width, expectedImage.height);
    const cropWidth = Math.min(actualBounds.width, expectedBounds.width);
    const cropHeight = Math.min(actualBounds.height, expectedBounds.height);
    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Missing comparison context');
    }

    context.drawImage(actualImage, actualBounds.minX, actualBounds.minY, actualBounds.width, actualBounds.height, 0, 0, cropWidth, cropHeight);
    const croppedActual = context.getImageData(0, 0, cropWidth, cropHeight).data;
    context.clearRect(0, 0, cropWidth, cropHeight);
    context.drawImage(expectedImage, expectedBounds.minX, expectedBounds.minY, expectedBounds.width, expectedBounds.height, 0, 0, cropWidth, cropHeight);
    const croppedExpected = context.getImageData(0, 0, cropWidth, cropHeight).data;

    let differentPixels = 0;
    for (let index = 0; index < croppedActual.length; index += 4) {
      const delta =
        Math.abs(croppedActual[index] - croppedExpected[index]) +
        Math.abs(croppedActual[index + 1] - croppedExpected[index + 1]) +
        Math.abs(croppedActual[index + 2] - croppedExpected[index + 2]) +
        Math.abs(croppedActual[index + 3] - croppedExpected[index + 3]);

      if (delta > 40) {
        differentPixels += 1;
      }
    }

    return {
      actualBounds,
      expectedBounds,
      actualImage: { width: actualImage.width, height: actualImage.height },
      expectedImage: { width: expectedImage.width, height: expectedImage.height },
      diffRatio: differentPixels / Math.max(cropWidth * cropHeight, 1),
    };
  }, {
    actualBase64: actualBuffer.toString('base64'),
    expectedBase64: expectedBuffer.toString('base64'),
  });

  const actualWidthRatio = comparison.actualBounds.width / Math.max(comparison.actualImage.width, 1);
  const expectedWidthRatio = comparison.expectedBounds.width / Math.max(comparison.expectedImage.width, 1);
  const actualHeightRatio = comparison.actualBounds.height / Math.max(comparison.actualImage.height, 1);
  const expectedHeightRatio = comparison.expectedBounds.height / Math.max(comparison.expectedImage.height, 1);

  expect(comparison.diffRatio).toBeLessThan(0.25);
  expect(Math.abs(actualWidthRatio - expectedWidthRatio)).toBeLessThanOrEqual(0.06);
  expect(Math.abs(actualHeightRatio - expectedHeightRatio)).toBeLessThanOrEqual(0.06);
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
      return (fill === '#111' || fill.includes('gripgradient')) && width >= 10 && height >= 20 && isVisible(rect);
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
  expect(metrics?.figureCount).toBeGreaterThanOrEqual(22);
  expect(metrics?.maxFigureWidth).toBeGreaterThanOrEqual(15);
  expect(metrics?.ballVisible).toBeTruthy();
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
  await expectStartupBoardMatchesReference(page);

  const staleLayoutAfterLoad = await page.evaluate(() => window.localStorage.getItem('foosboard.tableLayout'));
  expect(staleLayoutAfterLoad).toContain('legacy-save');

  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Tische konfigurieren').click();

  await expect(page.getByText('Tischkonfiguration')).toBeVisible();

  await page.locator('[data-testid="field-upload"] input[type="file"]').setInputFiles(fieldSvgPath);

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
