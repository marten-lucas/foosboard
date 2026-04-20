import type { RefObject } from 'react';
import { boardConfig, type BallState, type RodConfig, type RodState } from '../boardConfig';

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

type BoardCanvasProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  ball: BallState;
  rods: Record<RodConfig['id'], RodState>;
  savedFieldAsset: string;
  goalTop: number;
  liveRodExtension: number;
  liveGripLength: number;
  liveGripThickness: number;
  liveRodStrokeWidth: number;
  liveRodHandleWidth: number;
  liveRodHandleHeight: number;
  liveFigureStates: Record<FigureStateKey, LiveFigureState>;
  onBoardPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onStartBallDrag: (event: React.PointerEvent<SVGCircleElement>) => void;
  onStartRodDrag: (rodId: RodConfig['id'], event: React.PointerEvent<SVGRectElement>) => void;
  onCycleRodTilt: (rodId: RodConfig['id']) => void;
};

function getFigureStateKey(tilt: RodState['tilt']): FigureStateKey {
  if (tilt === 'front') {
    return 'nachVorn';
  }

  if (tilt === 'back') {
    return 'nachHinten';
  }

  return 'unten';
}

function getRodOffsets(rod: RodConfig): number[] {
  if (rod.figureOffsets && rod.figureOffsets.length > 0) {
    return rod.figureOffsets;
  }

  const centerYOffset = (rod.playerCount - 1) * boardConfig.figureSpacing * 0.5;
  return Array.from({ length: rod.playerCount }, (_, index) => index * boardConfig.figureSpacing - centerYOffset);
}

export function BoardCanvas({
  svgRef,
  ball,
  rods,
  savedFieldAsset,
  goalTop,
  liveRodExtension,
  liveGripLength,
  liveGripThickness,
  liveRodStrokeWidth,
  liveRodHandleWidth,
  liveRodHandleHeight,
  liveFigureStates,
  onBoardPointerDown,
  onStartBallDrag,
  onStartRodDrag,
  onCycleRodTilt,
}: BoardCanvasProps) {
  return (
    <div className="foosboard-board-wrap">
      <svg
        ref={svgRef}
        data-testid="board-svg"
        aria-label="Foosboard Spielfeld"
        className="foosboard-board-svg"
        viewBox={`0 0 ${boardConfig.width} ${boardConfig.height}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onBoardPointerDown}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="rgba(12, 28, 24, 0.25)" />
          </filter>
        </defs>

        <rect width={boardConfig.width} height={boardConfig.height} fill={boardConfig.colors.pageBg} />
        <rect x={boardConfig.fieldX} y={boardConfig.fieldY} width={boardConfig.fieldWidth} height={boardConfig.fieldHeight} fill={boardConfig.colors.boardInner} />
        {savedFieldAsset ? (
          <foreignObject x={boardConfig.fieldX} y={boardConfig.fieldY} width={boardConfig.fieldWidth} height={boardConfig.fieldHeight}>
            <div className="foosboard-live-field-asset" dangerouslySetInnerHTML={{ __html: savedFieldAsset }} />
          </foreignObject>
        ) : null}
        <rect x={boardConfig.frameX} y={boardConfig.frameY} width={boardConfig.frameWidth} height={boardConfig.frameHeight} fill="none" stroke="#111" strokeWidth={5} />

        <g>
          <rect x={boardConfig.fieldX - boardConfig.goalDepth} y={goalTop} width={boardConfig.goalDepth} height={boardConfig.goalWidth} fill={boardConfig.colors.fieldLine} />
          <rect x={boardConfig.fieldX + boardConfig.fieldWidth} y={goalTop} width={boardConfig.goalDepth} height={boardConfig.goalWidth} fill={boardConfig.colors.fieldLine} />
        </g>

        {boardConfig.rods.map((rod) => {
          const rodState = rods[rod.id];
          const offsets = getRodOffsets(rod);

          return (
            <g key={rod.id} data-testid={`rod-${rod.id}`} transform={`translate(${rod.x},0)`}>
              <line
                x1={0}
                y1={rod.team === 'orange' ? boardConfig.fieldY : boardConfig.fieldY - liveRodExtension}
                x2={0}
                y2={rod.team === 'orange' ? boardConfig.fieldY + boardConfig.fieldHeight + liveRodExtension : boardConfig.fieldY + boardConfig.fieldHeight}
                stroke="#444"
                strokeWidth={liveRodStrokeWidth}
              />
              <rect
                x={-liveGripThickness / 2}
                y={rod.team === 'orange' ? boardConfig.fieldY + boardConfig.fieldHeight + liveRodExtension - Math.min(liveRodExtension, liveGripLength) : boardConfig.fieldY - liveRodExtension}
                width={liveGripThickness}
                height={Math.min(liveRodExtension, liveGripLength)}
                rx={liveGripThickness / 4}
                fill="#111"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.4"
              />
              <rect
                x={-liveRodHandleWidth / 2}
                y={rodState.y - liveRodHandleHeight / 2}
                width={liveRodHandleWidth}
                height={liveRodHandleHeight}
                fill="transparent"
                stroke="none"
                onPointerDown={(event) => onStartRodDrag(rod.id, event)}
                cursor="ns-resize"
              />

              <g transform={`translate(0 ${rodState.y})`}>
                {offsets.map((offset, index) => {
                  const figureState = liveFigureStates[getFigureStateKey(rodState.tilt)];

                  return (
                    <g
                      key={`${rod.id}-${index}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCycleRodTilt(rod.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {figureState.markup ? (
                        <foreignObject
                          x={-figureState.width * figureState.anchor.x}
                          y={offset - figureState.height * figureState.anchor.y}
                          width={figureState.width}
                          height={figureState.height}
                        >
                          <div
                            xmlns="http://www.w3.org/1999/xhtml"
                            className={`foosboard-figure-svg-colorized${rod.team === 'blue' ? ' foosboard-figure-svg-colorized--mirrored' : ''}`}
                            style={{ color: rod.figureColor }}
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

        <g>
          <circle
            data-testid="ball-token"
            cx={ball.x}
            cy={ball.y}
            r={boardConfig.ballRadius}
            fill="#fdfcf8"
            stroke="#1f332d"
            strokeWidth={2}
            onPointerDown={onStartBallDrag}
            cursor="grab"
            filter="url(#shadow)"
          />
          <circle cx={ball.x - 2.4} cy={ball.y - 2.8} r={2.1} fill="rgba(255,255,255,0.95)" />
        </g>
      </svg>
    </div>
  );
}
