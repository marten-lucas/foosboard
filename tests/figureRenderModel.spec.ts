import { describe, expect, it } from 'vitest';
import { buildFigureRenderMetrics, buildRodStrokeWidth, cmToViewUnits, type PreviewFigureState } from '../src/lib/figureRenderModel';

const state: PreviewFigureState = {
  markup: '<svg></svg>',
  bounds: { width: 20, height: 32 },
  anchor: { x: 0.5, y: 0.4 },
  referenceWidth: 15,
};

describe('figureRenderModel', () => {
  it('converts cm to view units deterministically', () => {
    expect(cmToViewUnits(68, 68)).toBeCloseTo(1, 5);
    expect(cmToViewUnits(68, 44, 3.8)).toBeCloseTo((44 / 68) * 3.8, 5);
  });

  it('uses referenceWidth for stable figure scaling across states', () => {
    const metrics = buildFigureRenderMetrics({
      state,
      figureWidthCm: 3.5,
      fieldWidthCm: 68,
      viewFieldHeight: 68,
      minWidth: 1.8,
      minHeight: 1.8,
    });

    expect(metrics.targetMountWidth).toBeCloseTo(3.5, 5);
    expect(metrics.width).toBeCloseTo((20 / 15) * 3.5, 5);
    expect(metrics.height).toBeCloseTo((32 / 15) * 3.5, 5);
    expect(metrics.anchor).toEqual(state.anchor);
  });

  it('applies rod min and max constraints after scaling', () => {
    const noMax = buildRodStrokeWidth({
      rodDiameterCm: 1.6,
      fieldWidthCm: 68,
      viewFieldHeight: 68,
      min: 0.6,
    });
    const withMax = buildRodStrokeWidth({
      rodDiameterCm: 1.6,
      fieldWidthCm: 68,
      viewFieldHeight: 68,
      unitsMultiplier: 3.8,
      min: 2.2,
      max: 3,
    });

    expect(noMax).toBeCloseTo(1.6, 5);
    expect(withMax).toBe(3);
  });
});
