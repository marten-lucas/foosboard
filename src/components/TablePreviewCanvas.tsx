import type { TableRowConfig, TableRowKey } from '../lib/tableLayout';
import { clamp } from '../geometry';

type TablePreviewCanvasProps = {
  testId: string;
  ariaLabel: string;
  fieldSvg?: string;
  hasFieldUpload: boolean;
  fieldPreviewWidth: number;
  fieldPreviewHeight: number;
  previewFieldX: number;
  previewFieldY: number;
  previewFieldWidth: number;
  previewFieldHeight: number;
  rodExtension: number;
  frameThickness: number;
  gripThickness: number;
  gripLength: number;
  rodDiameter: number;
  rows: Record<TableRowKey, TableRowConfig>;
  visibleRows?: TableRowKey[];
  fieldLengthCm: number;
  fieldWidthCm: number;
  goalWidthCm: number;
  playerOneColor: string;
  playerTwoColor: string;
  figureWidthCm: number;
  includeBall?: boolean;
  ballSizeCm: number;
  ballColor: string;
  useConfiguredFigurePreview?: boolean;
  bottomFigurePreview?: string;
  figurePreviewBounds?: {
    width: number;
    height: number;
  };
  figureAnchor?: {
    x: number;
    y: number;
  };
};

function buildPreviewFigurePositions(row: TableRowConfig, fieldWidthCm: number) {
  return Array.from({ length: row.playerCount }, (_, index) =>
    clamp(
      fieldWidthCm / 2 + (index - (row.playerCount - 1) / 2) * row.spacing,
      2,
      Math.max(fieldWidthCm - 2, 2),
    ),
  );
}

export function TablePreviewCanvas({
  testId,
  ariaLabel,
  fieldSvg,
  hasFieldUpload,
  fieldPreviewWidth,
  fieldPreviewHeight,
  previewFieldX,
  previewFieldY,
  previewFieldWidth,
  previewFieldHeight,
  rodExtension,
  frameThickness,
  gripThickness,
  gripLength,
  rodDiameter,
  rows,
  visibleRows,
  fieldLengthCm,
  fieldWidthCm,
  goalWidthCm,
  playerOneColor,
  playerTwoColor,
  figureWidthCm,
  includeBall = false,
  ballSizeCm,
  ballColor,
  useConfiguredFigurePreview = false,
  bottomFigurePreview,
  figurePreviewBounds,
  figureAnchor,
}: TablePreviewCanvasProps) {
  const goalHeight = (goalWidthCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight;
  const goalY = previewFieldY + (previewFieldHeight - goalHeight) / 2;
  const goalDepth = Math.max(frameThickness / 2, 1);
  const figureBounds = figurePreviewBounds && figurePreviewBounds.width > 0 && figurePreviewBounds.height > 0
    ? figurePreviewBounds
    : { width: 10, height: 20 };
  const anchor = figureAnchor ? { x: figureAnchor.x, y: figureAnchor.y } : { x: 0.5, y: 0.5 };
  const targetFigureWidth = (figureWidthCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight;
  const previewScale = targetFigureWidth / Math.max(figureBounds.width, 1);
  const configuredFigureWidth = Math.max(targetFigureWidth, 1.8);
  const configuredFigureHeight = Math.max(figureBounds.height * previewScale, 1.8);
  const simpleFigureWidth = Math.max(targetFigureWidth, 2.4);
  const simpleFigureHeight = Math.max(simpleFigureWidth * 1.45, 6);
  const rowKeys = visibleRows && visibleRows.length > 0 ? visibleRows : (['goalkeeper', 'defense', 'midfield', 'offense'] as TableRowKey[]);

  return (
    <div
      className="foosboard-table-overlay-preview"
      data-testid={testId}
      style={{ aspectRatio: `${fieldPreviewWidth} / ${fieldPreviewHeight}` }}
    >
      <svg viewBox={`0 0 ${fieldPreviewWidth} ${fieldPreviewHeight}`} className="foosboard-table-preview" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={fieldPreviewWidth} height={fieldPreviewHeight} rx="2" fill="#d9d9d9" />
        {!hasFieldUpload ? <rect x={previewFieldX} y={previewFieldY} width={previewFieldWidth} height={previewFieldHeight} fill="#69db7c" /> : null}
        <rect x={previewFieldX - goalDepth} y={goalY} width={goalDepth} height={goalHeight} fill="#ffffff" />
        <rect x={previewFieldX + previewFieldWidth} y={goalY} width={goalDepth} height={goalHeight} fill="#ffffff" />
      </svg>

      <div
        className="foosboard-preview-field-window"
        data-testid={testId === 'rod-preview-canvas' ? 'rod-preview-window' : undefined}
        style={{
          left: `${(previewFieldX / fieldPreviewWidth) * 100}%`,
          top: `${(previewFieldY / fieldPreviewHeight) * 100}%`,
          width: `${(previewFieldWidth / fieldPreviewWidth) * 100}%`,
          height: `${(previewFieldHeight / fieldPreviewHeight) * 100}%`,
          background: hasFieldUpload ? 'transparent' : '#69db7c',
        }}
      >
        {fieldSvg ? <div className="foosboard-svg-preview foosboard-svg-preview--fill foosboard-svg-preview--fit-width" dangerouslySetInnerHTML={{ __html: fieldSvg }} /> : null}
      </div>

      <svg
        viewBox={`0 0 ${fieldPreviewWidth} ${fieldPreviewHeight}`}
        className="foosboard-table-preview foosboard-table-preview--overlay"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {rowKeys.flatMap((rowKey) => {
          const row = rows[rowKey];
          const leftX = previewFieldX + (row.position / Math.max(fieldLengthCm, 1)) * previewFieldWidth;
          const rightX = previewFieldX + previewFieldWidth - (row.position / Math.max(fieldLengthCm, 1)) * previewFieldWidth;
          const rodStrokeWidth = Math.max(rodDiameter, 0.6);
          const points = buildPreviewFigurePositions(row, fieldWidthCm);
          const gripSize = Math.min(Math.max(rodExtension, 0), gripLength);

          return [
            <g key={`${rowKey}-p1`}>
              <line x1={leftX} y1={previewFieldY} x2={leftX} y2={previewFieldY + previewFieldHeight + rodExtension} stroke="#444" strokeWidth={rodStrokeWidth} />
              <rect x={leftX - gripThickness / 2} y={previewFieldY + previewFieldHeight + rodExtension - gripSize} width={gripThickness} height={gripSize} rx="1" fill="#111" stroke="rgba(0,0,0,0.35)" strokeWidth="0.4" />
              {!useConfiguredFigurePreview ? points.map((point, index) => (
                <rect
                  key={`${rowKey}-p1-${index}`}
                  x={leftX - simpleFigureWidth / 2}
                  y={previewFieldY + (point / Math.max(fieldWidthCm, 1)) * previewFieldHeight - simpleFigureHeight / 2}
                  width={simpleFigureWidth}
                  height={simpleFigureHeight}
                  rx="0.8"
                  fill={playerOneColor}
                  stroke="rgba(0,0,0,0.28)"
                  strokeWidth="0.4"
                />
              )) : null}
            </g>,
            <g key={`${rowKey}-p2`}>
              <line x1={rightX} y1={previewFieldY - rodExtension} x2={rightX} y2={previewFieldY + previewFieldHeight} stroke="#444" strokeWidth={rodStrokeWidth} />
              <rect x={rightX - gripThickness / 2} y={previewFieldY - rodExtension} width={gripThickness} height={gripSize} rx="1" fill="#111" stroke="rgba(0,0,0,0.35)" strokeWidth="0.4" />
              {!useConfiguredFigurePreview ? points.map((point, index) => (
                <rect
                  key={`${rowKey}-p2-${index}`}
                  x={rightX - simpleFigureWidth / 2}
                  y={previewFieldY + (point / Math.max(fieldWidthCm, 1)) * previewFieldHeight - simpleFigureHeight / 2}
                  width={simpleFigureWidth}
                  height={simpleFigureHeight}
                  rx="0.8"
                  fill={playerTwoColor}
                  stroke="rgba(0,0,0,0.28)"
                  strokeWidth="0.4"
                />
              )) : null}
            </g>,
          ];
        })}

        {includeBall ? (
          <circle
            cx={previewFieldX + previewFieldWidth / 2}
            cy={previewFieldY + previewFieldHeight / 2}
            r={Math.max((ballSizeCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight / 2, 1.2)}
            fill={ballColor}
            stroke="#333"
            strokeWidth="0.5"
          />
        ) : null}

        {useConfiguredFigurePreview && bottomFigurePreview
          ? rowKeys.flatMap((rowKey) => {
              const row = rows[rowKey];
              const leftX = previewFieldX + (row.position / Math.max(fieldLengthCm, 1)) * previewFieldWidth;
              const rightX = previewFieldX + previewFieldWidth - (row.position / Math.max(fieldLengthCm, 1)) * previewFieldWidth;
              const points = buildPreviewFigurePositions(row, fieldWidthCm);

              return [
                ...points.map((point, index) => (
                  <g key={`${rowKey}-overlay-p1-${index}`}>
                    <foreignObject
                      x={leftX - configuredFigureWidth * anchor.x}
                      y={previewFieldY + (point / Math.max(fieldWidthCm, 1)) * previewFieldHeight - configuredFigureHeight * anchor.y}
                      width={configuredFigureWidth}
                      height={configuredFigureHeight}
                    >
                      <div xmlns="http://www.w3.org/1999/xhtml" className="foosboard-figure-svg-colorized" style={{ color: playerOneColor }} dangerouslySetInnerHTML={{ __html: bottomFigurePreview }} />
                    </foreignObject>
                  </g>
                )),
                ...points.map((point, index) => (
                  <g key={`${rowKey}-overlay-p2-${index}`}>
                    <foreignObject
                      x={rightX - configuredFigureWidth * anchor.x}
                      y={previewFieldY + (point / Math.max(fieldWidthCm, 1)) * previewFieldHeight - configuredFigureHeight * anchor.y}
                      width={configuredFigureWidth}
                      height={configuredFigureHeight}
                    >
                      <div xmlns="http://www.w3.org/1999/xhtml" className="foosboard-figure-svg-colorized foosboard-figure-svg-colorized--mirrored" style={{ color: playerTwoColor }} dangerouslySetInnerHTML={{ __html: bottomFigurePreview }} />
                    </foreignObject>
                  </g>
                )),
              ];
            })
          : null}

        <rect data-testid={`${testId}-frame`} x={previewFieldX} y={previewFieldY} width={previewFieldWidth} height={previewFieldHeight} fill="none" stroke="#111" strokeWidth={frameThickness} />
      </svg>
    </div>
  );
}
