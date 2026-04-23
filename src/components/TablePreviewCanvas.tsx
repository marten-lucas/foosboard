import type { TableRowConfig, TableRowKey } from '../lib/tableLayout';
import { buildFigureRenderMetrics, type PreviewFigureState } from '../lib/figureRenderModel';
import { buildCenteredFigurePositionsCm } from '../lib/rowFigureLayout';
import { buildCenteredRodBounds, getRodGeometry } from '../lib/rodLayout';
import { buildTableSurfaceGeometry } from '../lib/tableSurface';
import { TableGoalVisuals } from './TableGoalVisuals';
import { SharedVisualDefs } from './SharedVisualDefs';

function getFigureForeignObjectX(width: number, anchorX: number, mirrored: boolean) {
  return -width * (mirrored ? 1 - anchorX : anchorX);
}

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
  figurePreviewState?: PreviewFigureState;
};

function buildPreviewFigurePositions(row: TableRowConfig, fieldWidthCm: number) {
  return buildCenteredFigurePositionsCm(row, fieldWidthCm);
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
  figurePreviewState,
}: TablePreviewCanvasProps) {
  const tableSurface = buildTableSurfaceGeometry({
    fieldX: previewFieldX,
    fieldY: previewFieldY,
    fieldWidth: previewFieldWidth,
    fieldHeight: previewFieldHeight,
    fieldWidthCm,
    frameThicknessCm: frameThickness,
    goalWidthCm,
  });
  const resolvedFigureState: PreviewFigureState = figurePreviewState || {
    markup: bottomFigurePreview || '',
    bounds: { width: 10, height: 20 },
    anchor: { x: 0.5, y: 0.5 },
    referenceWidth: 10,
  };
  const configuredFigureMetrics = buildFigureRenderMetrics({
    state: resolvedFigureState,
    figureWidthCm,
    fieldWidthCm,
    viewFieldHeight: previewFieldHeight,
    minWidth: 1.8,
    minHeight: 1.8,
  });
  const configuredFigureWidth = configuredFigureMetrics.width;
  const configuredFigureHeight = configuredFigureMetrics.height;
  const anchor = configuredFigureMetrics.anchor;
  const targetFigureWidth = configuredFigureMetrics.targetMountWidth;
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
        data-field-height={previewFieldHeight}
        data-rod-extension={rodExtension}
      >
        <defs>
          <SharedVisualDefs />
        </defs>
        {rowKeys.flatMap((rowKey) => {
          const row = rows[rowKey];
          const leftX = previewFieldX + (row.position / Math.max(fieldLengthCm, 1)) * previewFieldWidth;
          const rightX = previewFieldX + previewFieldWidth - (row.position / Math.max(fieldLengthCm, 1)) * previewFieldWidth;
          const rodGeometry = getRodGeometry(row, fieldWidthCm, previewFieldHeight);
          const points = buildPreviewFigurePositions(row, fieldWidthCm);
          const gripSize = Math.min(Math.max(rodGeometry.rodExtension, 0), gripLength);
          const rodBounds = buildCenteredRodBounds(previewFieldY, previewFieldHeight, rodGeometry.rodExtension);
          const rodCapWidth = Math.max(rodGeometry.rodStrokeWidth * 1.55, 2.8);
          const rodCapHeight = Math.max(rodGeometry.rodStrokeWidth * 0.45, 1.2);

          return [
            <g key={`${rowKey}-p1`} data-row-key={rowKey} data-team="player1" data-rod-length-cm={row.rodLength} data-rod-extension={rodGeometry.rodExtension}>
              <rect
                data-rod-body="true"
                x={leftX - rodGeometry.rodStrokeWidth / 2}
                y={rodBounds.top}
                width={rodGeometry.rodStrokeWidth}
                height={rodBounds.bottom - rodBounds.top}
                fill="url(#rodGradient)"
              />
              <rect x={leftX - rodCapWidth / 2} y={rodBounds.top - rodCapHeight / 2} width={rodCapWidth} height={rodCapHeight} rx={rodCapHeight / 3} fill="rgba(70,70,70,0.85)" />
              <rect x={leftX - rodCapWidth / 2} y={rodBounds.bottom - rodCapHeight / 2} width={rodCapWidth} height={rodCapHeight} rx={rodCapHeight / 3} fill="rgba(70,70,70,0.85)" />
              <rect x={leftX - gripThickness / 2} y={rodBounds.bottom - gripSize} width={gripThickness} height={gripSize} rx="1" fill="url(#gripGradient)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.4" />
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
            <g key={`${rowKey}-p2`} data-row-key={rowKey} data-team="player2" data-rod-length-cm={row.rodLength} data-rod-extension={rodGeometry.rodExtension}>
              <rect
                data-rod-body="true"
                x={rightX - rodGeometry.rodStrokeWidth / 2}
                y={rodBounds.top}
                width={rodGeometry.rodStrokeWidth}
                height={rodBounds.bottom - rodBounds.top}
                fill="url(#rodGradient)"
              />
              <rect x={rightX - rodCapWidth / 2} y={rodBounds.top - rodCapHeight / 2} width={rodCapWidth} height={rodCapHeight} rx={rodCapHeight / 3} fill="rgba(70,70,70,0.85)" />
              <rect x={rightX - rodCapWidth / 2} y={rodBounds.bottom - rodCapHeight / 2} width={rodCapWidth} height={rodCapHeight} rx={rodCapHeight / 3} fill="rgba(70,70,70,0.85)" />
              <rect x={rightX - gripThickness / 2} y={rodBounds.top} width={gripThickness} height={gripSize} rx="1" fill="url(#gripGradient)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.4" />
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
          <>
            <circle
              cx={previewFieldX + previewFieldWidth / 2}
              cy={previewFieldY + previewFieldHeight / 2}
              r={Math.max((ballSizeCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight / 2, 1.2)}
              fill="url(#ballGradient)"
              stroke="rgba(60,60,60,0.45)"
              strokeWidth="0.8"
            />
            <circle
              cx={previewFieldX + previewFieldWidth / 2 - Math.max((ballSizeCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight / 2, 1.2) * 0.27}
              cy={previewFieldY + previewFieldHeight / 2 - Math.max((ballSizeCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight / 2, 1.2) * 0.29}
              r={Math.max((ballSizeCm / Math.max(fieldWidthCm, 1)) * previewFieldHeight / 2, 1.2) * 0.22}
              fill="rgba(255,255,255,0.82)"
            />
          </>
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
                      x={leftX + getFigureForeignObjectX(configuredFigureWidth, anchor.x, false)}
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
                      x={rightX + getFigureForeignObjectX(configuredFigureWidth, anchor.x, true)}
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

        <rect data-testid={`${testId}-frame`} x={tableSurface.frame.x} y={tableSurface.frame.y} width={tableSurface.frame.width} height={tableSurface.frame.height} fill="none" stroke="#111" strokeWidth={tableSurface.frame.strokeWidth} />
        <TableGoalVisuals goals={tableSurface.goals} />
      </svg>
    </div>
  );
}
