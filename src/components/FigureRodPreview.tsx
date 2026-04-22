import { useState } from 'react';
import { buildFigureRenderMetrics, buildRodStrokeWidth, type PreviewFigureState } from '../lib/figureRenderModel';

export type FigurePreviewState = PreviewFigureState;

type FigurePreviewTiltState = 'unten' | 'nachVorn' | 'nachHinten';

type FigureRodPreviewProps = {
  testId: string;
  figureStates: {
    unten: PreviewFigureState;
    nachVorn: PreviewFigureState;
    nachHinten: PreviewFigureState;
  };
  figureColor: string;
  ballColor: string;
  rodDiameterCm: number;
  figureWidthCm: number;
  ballSizeCm: number;
  fieldWidthCm: number;
};

export function FigureRodPreview({
  testId,
  figureStates,
  figureColor,
  ballColor,
  rodDiameterCm,
  figureWidthCm,
  ballSizeCm,
  fieldWidthCm,
}: FigureRodPreviewProps) {
  const [tiltState, setTiltState] = useState<FigurePreviewTiltState>('unten');
  const viewWidth = 28;
  const viewHeight = 44;
  const rodX = viewWidth / 2;
  const rodTop = 0;
  const rodBottom = viewHeight;
  const activeFigure = figureStates[tiltState];
  const figureMarkup = activeFigure.markup;

  const cycleTiltState = () => {
    setTiltState((current) => {
      if (current === 'unten') {
        return 'nachVorn';
      }
      if (current === 'nachVorn') {
        return 'nachHinten';
      }
      return 'unten';
    });
  };

  // Shared render model: all figure sizing derives from one deterministic formula.
  const figureMetrics = buildFigureRenderMetrics({
    state: activeFigure,
    figureWidthCm,
    fieldWidthCm,
    viewFieldHeight: viewHeight,
    unitsMultiplier: 3.8,
    minWidth: 8.5,
    minHeight: 12,
  });
  const mountWidthTarget = figureMetrics.targetMountWidth;
  const scaledFigureWidth = figureMetrics.width;
  const scaledFigureHeight = figureMetrics.height;
  const anchor = figureMetrics.anchor || { x: 0.5, y: 0.5 };
  const figureCenterY = 20;
  const ballRadius = Math.max((ballSizeCm * (mountWidthTarget / Math.max(figureWidthCm, 1))) / 2, 2.6);
  const rodStrokeWidth = buildRodStrokeWidth({
    rodDiameterCm,
    fieldWidthCm,
    viewFieldHeight: viewHeight,
    unitsMultiplier: 3.8,
    min: 2.2,
    max: mountWidthTarget * 0.55,
  });
  const ballX = rodX + Math.min(Math.max(mountWidthTarget * 0.6, ballRadius * 2.2), viewWidth - ballRadius - 1.2);

  return (
    <div className="foosboard-table-overlay-preview foosboard-table-overlay-preview--fill-card" data-testid={testId}>
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="foosboard-table-preview" aria-label="Puppe mit Stange" data-tilt-state={tiltState} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={viewWidth} height={viewHeight} rx="2" fill="#37c837" />
        <line x1={rodX} y1={rodTop} x2={rodX} y2={rodBottom} stroke="#444" strokeWidth={rodStrokeWidth} />
        {figureMarkup ? (
          <foreignObject
            x={rodX - scaledFigureWidth * anchor.x}
            y={figureCenterY - scaledFigureHeight * anchor.y}
            width={scaledFigureWidth}
            height={scaledFigureHeight}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="foosboard-figure-svg-colorized"
              role="button"
              tabIndex={0}
              data-testid="figure-rod-preview-toggle"
              aria-label="Puppenlage wechseln"
              style={{ color: figureColor }}
              onPointerUp={(event) => {
                event.preventDefault();
                event.stopPropagation();
                cycleTiltState();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  cycleTiltState();
                }
              }}
              dangerouslySetInnerHTML={{ __html: figureMarkup }}
            />
          </foreignObject>
        ) : null}
        <circle cx={ballX} cy={31} r={ballRadius} fill={ballColor} stroke="#333" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
