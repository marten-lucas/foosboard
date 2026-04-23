export type PreviewFigureState = {
  markup: string;
  bounds: {
    width: number;
    height: number;
  };
  anchor: {
    x: number;
    y: number;
  };
  referenceWidth?: number;
};

export type FigureTiltState = 'unten' | 'nachVorn' | 'nachHinten';

export type FigurePreviewTiltState = FigureTiltState | 'hochgestellt';

export function resolveFigurePreviewTiltState(tiltState: FigurePreviewTiltState): FigureTiltState {
  if (tiltState === 'hochgestellt') {
    return 'nachHinten';
  }

  return tiltState;
}

type FigureRenderMetricsInput = {
  state: PreviewFigureState;
  figureWidthCm: number;
  fieldWidthCm: number;
  viewFieldHeight: number;
  unitsMultiplier?: number;
  minWidth?: number;
  minHeight?: number;
};

type RodStrokeWidthInput = {
  rodDiameterCm: number;
  fieldWidthCm: number;
  viewFieldHeight: number;
  unitsMultiplier?: number;
  min?: number;
  max?: number;
};

export function cmToViewUnits(fieldWidthCm: number, viewFieldHeight: number, unitsMultiplier = 1) {
  return Math.max((viewFieldHeight / Math.max(fieldWidthCm, 1)) * unitsMultiplier, 0.1);
}

export function buildFigureRenderMetrics({
  state,
  figureWidthCm,
  fieldWidthCm,
  viewFieldHeight,
  unitsMultiplier = 1,
  minWidth = 1.8,
  minHeight = 1.8,
}: FigureRenderMetricsInput) {
  const unitsPerCm = cmToViewUnits(fieldWidthCm, viewFieldHeight, unitsMultiplier);
  const targetMountWidth = Math.max(figureWidthCm * unitsPerCm, minWidth);
  const referenceWidth = state.referenceWidth || state.bounds.width;
  const scale = targetMountWidth / Math.max(referenceWidth, 1);

  return {
    width: Math.max(state.bounds.width * scale, minWidth),
    height: Math.max(state.bounds.height * scale, minHeight),
    targetMountWidth,
    anchor: state.anchor,
  };
}

export function buildRodStrokeWidth({
  rodDiameterCm,
  fieldWidthCm,
  viewFieldHeight,
  unitsMultiplier = 1,
  min = 0.6,
  max,
}: RodStrokeWidthInput) {
  const scaled = rodDiameterCm * cmToViewUnits(fieldWidthCm, viewFieldHeight, unitsMultiplier);
  const withMin = Math.max(scaled, min);

  if (typeof max === 'number') {
    return Math.min(withMin, max);
  }

  return withMin;
}
