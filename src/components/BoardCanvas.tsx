import type { RefObject } from 'react';
import { boardConfig, normalizeTiltMode, type BallTokenState, type RodConfig, type RodState } from '../boardConfig';
import { defaultTableDraft } from '../lib/tableLayout';
import { getRodGeometry, getRodRowKey } from '../lib/rodLayout';
import { buildTableSurfaceGeometry, TABLE_FRAME_THICKNESS_CM } from '../lib/tableSurface';
import { TableGoalVisuals } from './TableGoalVisuals';
import { SharedVisualDefs } from './SharedVisualDefs';
import { buildCenteredOffsets } from '../lib/rowFigureLayout';
import { getBallTrayLayout } from '../lib/ballLayout';
import type { Point } from '../geometry';

type FigureStateKey = 'unten' | 'nachVorn' | 'nachHinten';

type LiveFigureState = {
  markup: string;
  width: number;
  height: number;
  anchor: {
    x: number;
    y: number;
  };
};

function getFigureForeignObjectX(width: number, anchorX: number, mirrored: boolean) {
  return -width * (mirrored ? 1 - anchorX : anchorX);
}

type BoardCanvasProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  isPortraitViewport: boolean;
  balls: BallTokenState[];
  draggingBallId: string | null;
  fallingBallId: string | null;
  rods: Record<RodConfig['id'], RodState>;
  savedFieldAsset: string;
  liveRodExtension: number;
  liveGripLength: number;
  liveGripThickness: number;
  liveRodHandleWidth: number;
  liveRodHandleHeight: number;
  liveFigureStates: Record<FigureStateKey, LiveFigureState>;
  onBoardPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onStartBallDrag: (event: React.PointerEvent<SVGCircleElement>, ballId: string | null, origin: Point) => void;
  onStartRodDrag: (rodId: RodConfig['id'], event: React.PointerEvent<SVGRectElement>) => void;
  onNudgeRod: (rodId: RodConfig['id'], direction: 'towards-top' | 'towards-bottom') => void;
  onCycleRodTilt: (rodId: RodConfig['id']) => void;
};

function getFigureStateKey(tilt: RodState['tilt']): FigureStateKey {
  const normalizedTilt = normalizeTiltMode(tilt);

  if (normalizedTilt === 'front') {
    return 'nachVorn';
  }

  if (normalizedTilt === 'back' || normalizedTilt === 'hochgestellt') {
    return 'nachHinten';
  }

  return 'unten';
}

function getRodOffsets(rod: RodConfig): number[] {
  if (rod.figureOffsets && rod.figureOffsets.length > 0) {
    return rod.figureOffsets;
  }

  return buildCenteredOffsets(rod.playerCount, boardConfig.figureSpacing);
}

export function BoardCanvas({
  svgRef,
  isPortraitViewport,
  balls,
  draggingBallId,
  fallingBallId,
  rods,
  savedFieldAsset,
  liveRodExtension,
  liveGripLength,
  liveGripThickness,
  liveRodHandleWidth,
  liveRodHandleHeight,
  liveFigureStates,
  onBoardPointerDown,
  onStartBallDrag,
  onStartRodDrag,
  onNudgeRod,
  onCycleRodTilt,
}: BoardCanvasProps) {
  const fieldWidthCm = boardConfig.settings?.field.widthCm ?? defaultTableDraft.fieldWidth;
  const tableSurface = buildTableSurfaceGeometry({
    fieldX: boardConfig.fieldX,
    fieldY: boardConfig.fieldY,
    fieldWidth: boardConfig.fieldWidth,
    fieldHeight: boardConfig.fieldHeight,
    fieldWidthCm,
    frameThicknessCm: TABLE_FRAME_THICKNESS_CM,
    goalWidth: boardConfig.goalWidth,
    goalDepth: boardConfig.goalDepth,
  });
  const ballTray = getBallTrayLayout();

  return (
    <div className={`foosboard-board-wrap${isPortraitViewport ? ' foosboard-board-wrap--portrait' : ''}`}>
      <svg
        ref={svgRef}
        data-testid="board-svg"
        aria-label="Foosboard Spielfeld"
        className={`foosboard-board-svg${isPortraitViewport ? ' foosboard-board-svg--portrait' : ''}`}
        viewBox={`0 0 ${boardConfig.width} ${boardConfig.height}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onBoardPointerDown}
        style={{ touchAction: 'none' }}
        data-field-height={boardConfig.fieldHeight}
        data-rod-extension={liveRodExtension}
        data-portrait-viewport={isPortraitViewport ? 'true' : 'false'}
      >
        <defs>
          <SharedVisualDefs />
        </defs>

        <rect x={boardConfig.fieldX} y={boardConfig.fieldY} width={boardConfig.fieldWidth} height={boardConfig.fieldHeight} fill={boardConfig.colors.boardInner} />
        {savedFieldAsset ? (
          <foreignObject x={boardConfig.fieldX} y={boardConfig.fieldY} width={boardConfig.fieldWidth} height={boardConfig.fieldHeight}>
            <div className="foosboard-live-field-asset" dangerouslySetInnerHTML={{ __html: savedFieldAsset }} />
          </foreignObject>
        ) : null}
        {balls.map((ball) => (
          <g
            key={ball.id}
            className={[
              'foosboard-ball-token',
              draggingBallId === ball.id ? 'foosboard-ball-token--dragging' : '',
              fallingBallId === ball.id ? 'foosboard-ball-token--dropping' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ pointerEvents: 'none', transform: `translate(${ball.x}px, ${ball.y}px)` }}
            aria-hidden="true"
          >
            <circle cx={0} cy={0} r={boardConfig.ballRadius} fill="url(#ballGradient)" stroke="rgba(60,60,60,0.45)" strokeWidth={1.5} />
            <circle
              cx={-boardConfig.ballRadius * 0.27}
              cy={-boardConfig.ballRadius * 0.29}
              r={boardConfig.ballRadius * 0.22}
              fill="rgba(255,255,255,0.82)"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        ))}
        <g>
          {ballTray.trays.map((tray) => (
            <g key={tray.id} data-testid={`ball-tray-${tray.id}`} className={`foosboard-ball-tray foosboard-ball-tray--${tray.id}`}>
              <rect
                x={tray.tray.x}
                y={tray.tray.y}
                width={tray.tray.width}
                height={tray.tray.height}
                rx={tray.tray.rx}
                fill="rgba(255,255,255,0.38)"
                stroke="rgba(45,45,45,0.18)"
                strokeWidth={1}
              />
              <text
                x={tray.labelPoint.x}
                y={tray.labelPoint.y}
                textAnchor="middle"
                fill="rgba(25,25,25,0.52)"
                fontSize="8"
                letterSpacing="0.08em"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                Bälle
              </text>
              {tray.balls.map((ball) => (
                <g key={ball.id} style={{ transform: `translate(${ball.point.x}px, ${ball.point.y}px)` }}>
                  <circle
                    data-testid={`ball-tray-${tray.id}-${ball.id}`}
                    cx={0}
                    cy={0}
                    r={boardConfig.ballRadius}
                    fill="url(#ballGradient)"
                    stroke="rgba(60,60,60,0.4)"
                    strokeWidth={1.25}
                    cursor="grab"
                    onPointerDown={(event) => onStartBallDrag(event, null, ball.point)}
                  />
                  <circle
                    cx={-boardConfig.ballRadius * 0.27}
                    cy={-boardConfig.ballRadius * 0.29}
                    r={boardConfig.ballRadius * 0.22}
                    fill="rgba(255,255,255,0.82)"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              ))}
            </g>
          ))}
        </g>
        {boardConfig.rods.map((rod) => {
          const rodState = rods[rod.id];
          const rowKey = getRodRowKey(rod.id);
          const offsets = getRodOffsets(rod);
          const rodGeometry = getRodGeometry({ rodLength: rod.rodLengthCm, rodDiameter: rod.rodDiameterCm }, fieldWidthCm, boardConfig.fieldHeight);
          const rodHeight = boardConfig.fieldHeight + rodGeometry.rodExtension * 2;
          const rodTop = rodState.y - rodHeight / 2;
          const rodBottom = rodState.y + rodHeight / 2;
          const gripLength = Math.min(rodGeometry.rodExtension, liveGripLength);
          const rodCapWidth = Math.max(rodGeometry.rodStrokeWidth * 1.55, 9);
          const rodCapHeight = Math.max(rodGeometry.rodStrokeWidth * 0.45, 3.2);
          const nudgeHitWidth = Math.max(liveGripThickness * 1.4, rodGeometry.rodStrokeWidth * 6, 16);
          const topExposedEnd = tableSurface.frame.y;
          const bottomExposedStart = tableSurface.frame.y + tableSurface.frame.height;
          const topNudgeY = rod.team === 'blue' ? rodTop + gripLength : rodTop;
          const topNudgeHeight = Math.max(topExposedEnd - topNudgeY, 0);
          const bottomNudgeEnd = rod.team === 'orange' ? rodBottom - gripLength : rodBottom;
          const bottomNudgeHeight = Math.max(bottomNudgeEnd - bottomExposedStart, 0);

          return (
            <g
              key={rod.id}
              data-testid={`rod-${rod.id}`}
              data-row-key={rowKey}
              data-rod-length-cm={rod.rodLengthCm}
              data-rod-extension={rodGeometry.rodExtension}
              data-tilt-state={rodState.tilt}
              transform={`translate(${rod.x},0)`}
            >
              {/* Stange als Rect mit zylindrischem Gradient */}
              <rect
                data-rod-body="true"
                x={-rodGeometry.rodStrokeWidth / 2}
                y={rodTop}
                width={rodGeometry.rodStrokeWidth}
                height={rodBottom - rodTop}
                fill="url(#rodGradient)"
              />
              <rect
                x={-rodCapWidth / 2}
                y={rodTop - rodCapHeight / 2}
                width={rodCapWidth}
                height={rodCapHeight}
                rx={rodCapHeight / 3}
                fill="rgba(70,70,70,0.85)"
              />
              <rect
                x={-rodCapWidth / 2}
                y={rodBottom - rodCapHeight / 2}
                width={rodCapWidth}
                height={rodCapHeight}
                rx={rodCapHeight / 3}
                fill="rgba(70,70,70,0.85)"
              />
              {/* Griff */}
              <rect
                x={-liveGripThickness / 2}
                y={rod.team === 'orange' ? rodBottom - gripLength : rodTop}
                width={liveGripThickness}
                height={gripLength}
                rx={liveGripThickness / 4}
                fill="url(#gripGradient)"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="0.4"
                onPointerDown={(event) => onStartRodDrag(rod.id, event)}
                cursor={isPortraitViewport ? 'ew-resize' : 'ns-resize'}
              />
              {topNudgeHeight > 0 ? (
                <rect
                  data-testid={`rod-${rod.id}-nudge-top`}
                  x={-nudgeHitWidth / 2}
                  y={topNudgeY}
                  width={nudgeHitWidth}
                  height={topNudgeHeight}
                  fill="transparent"
                  cursor={isPortraitViewport ? 'ew-resize' : 'ns-resize'}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onNudgeRod(rod.id, 'towards-top');
                  }}
                />
              ) : null}
              {bottomNudgeHeight > 0 ? (
                <rect
                  data-testid={`rod-${rod.id}-nudge-bottom`}
                  x={-nudgeHitWidth / 2}
                  y={bottomExposedStart}
                  width={nudgeHitWidth}
                  height={bottomNudgeHeight}
                  fill="transparent"
                  cursor={isPortraitViewport ? 'ew-resize' : 'ns-resize'}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onNudgeRod(rod.id, 'towards-bottom');
                  }}
                />
              ) : null}

              <g transform={`translate(0 ${rodState.y})`}>
                {offsets.map((offset, index) => {
                  const figureState = liveFigureStates[getFigureStateKey(rodState.tilt)];
                  const figureOpacity = normalizeTiltMode(rodState.tilt) === 'hochgestellt' ? 0.5 : 1;
                  const handleFigureToggle = (event: React.SyntheticEvent) => {
                    event.stopPropagation();
                    onCycleRodTilt(rod.id);
                  };

                  return (
                    <g key={`${rod.id}-${index}`} style={{ cursor: 'pointer' }}>
                      {figureState.markup ? (
                        <foreignObject
                          x={getFigureForeignObjectX(figureState.width, figureState.anchor.x, rod.team === 'blue')}
                          y={offset - figureState.height * figureState.anchor.y}
                          width={figureState.width}
                          height={figureState.height}
                          style={{ pointerEvents: 'auto', opacity: figureOpacity }}
                          onClick={handleFigureToggle}
                        >
                          <div
                            xmlns="http://www.w3.org/1999/xhtml"
                            className={`foosboard-figure-svg-colorized${rod.team === 'blue' ? ' foosboard-figure-svg-colorized--mirrored' : ''}`}
                            style={{ color: rod.figureColor, pointerEvents: 'none' }}
                            dangerouslySetInnerHTML={{ __html: figureState.markup }}
                          />
                        </foreignObject>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })}

        {/* Rahmen liegt bewusst über den Stangen */}
        <rect
          data-testid="board-frame"
          x={tableSurface.frame.x}
          y={tableSurface.frame.y}
          width={tableSurface.frame.width}
          height={tableSurface.frame.height}
          fill="none"
          stroke="#111"
          strokeWidth={tableSurface.frame.strokeWidth}
          style={{ pointerEvents: 'none' }}
        />

        <TableGoalVisuals goals={tableSurface.goals} />

        {balls.map((ball) => (
          <g
            key={`${ball.id}-hitbox`}
            data-testid={`ball-${ball.id}`}
            className="foosboard-ball-hitbox"
            style={{ transform: `translate(${ball.x}px, ${ball.y}px)` }}
          >
            <circle
              cx={0}
              cy={0}
              r={boardConfig.ballRadius + 6}
              fill="rgba(0,0,0,0.001)"
              stroke="rgba(0,0,0,0.001)"
              strokeWidth={1}
              cursor="grab"
              onPointerDown={(event) => onStartBallDrag(event, ball.id, { x: ball.x, y: ball.y })}
            />
          </g>
        ))}

      </svg>
    </div>
  );
}
