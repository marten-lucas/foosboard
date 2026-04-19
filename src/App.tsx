import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Ban, Copy, Eye, Layers3, Play, RotateCcw, Save, Shield, Sparkles, Trash2 } from 'lucide-react';
import { boardConfig, type RodConfig, type RodState, type SerializableScene } from './boardConfig';
import { clamp, decodeScene, encodeScene, projectGoalShadows, traceShot, type FigureHit, type Point } from './geometry';
import { getSerializableScene, useBoardStore } from './store/boardStore';

type DragState =
  | {
      kind: 'ball';
      pointerId: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: 'rod';
      pointerId: number;
      rodId: RodConfig['id'];
      offsetY: number;
    }
  | null;

const colorChoices = [
  { value: '#ff7a3d', label: 'Orange' },
  { value: '#4fa3f7', label: 'Blau' },
  { value: '#22c55e', label: 'Grün' },
  { value: '#f4bf4f', label: 'Gelb' },
];

const legacyGuideYs = [188.29, 206.29, 224.29, 242.29, 260.29, 278.29];

function getRodOffsets(rod: RodConfig): number[] {
  if (rod.figureOffsets && rod.figureOffsets.length > 0) {
    return rod.figureOffsets;
  }

  const centerYOffset = (rod.playerCount - 1) * boardConfig.figureSpacing * 0.5;
  return Array.from({ length: rod.playerCount }, (_, index) => index * boardConfig.figureSpacing - centerYOffset);
}

function renderLegacyFigure(
  rod: RodConfig,
  tilt: RodState['tilt'],
  offset: number,
  onToggle: (event: React.MouseEvent<SVGGElement>) => void,
) {
  const shiftX = tilt === 'front' ? 7.5 : tilt === 'back' ? -7.5 : 0;
  const bodyX = tilt === 'back' ? -15 : 0;

  return (
    <g transform={`translate(${shiftX}, ${offset})`} onClick={onToggle} style={{ cursor: 'pointer' }}>
      <rect x={-7.5} y={-15} width={15} height={5} fill="#111" />
      <rect x={-7.5} y={10} width={15} height={5} fill="#111" />
      <rect x={bodyX} y={-10} width={15} height={20} fill={rod.figureColor} stroke={tilt === 'neutral' ? 'rgba(15, 29, 25, 0.58)' : 'none'} strokeWidth={0.6} />
      {tilt === 'neutral' ? (
        <circle cx={0} cy={0} r={5} fill="none" stroke="#111" strokeWidth={0.5} />
      ) : (
        <rect x={tilt === 'back' ? 0 : -15} y={-5} width={15} height={10} fill={rod.figureColor} opacity={0.92} />
      )}
    </g>
  );
}

function pointFromEvent(event: Pick<React.PointerEvent, 'clientX' | 'clientY'>, svg: SVGSVGElement | null): Point {
  if (!svg) {
    return { x: 0, y: 0 };
  }

  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * boardConfig.width,
    y: ((event.clientY - rect.top) / rect.height) * boardConfig.height,
  };
}

function buildFigureHits(rods: SerializableScene['rods']): FigureHit[] {
  return boardConfig.rods.flatMap((rod) => {
    const state = rods[rod.id];
    const offsets = getRodOffsets(rod);
    const tiltShift = state.tilt === 'front' ? 7.5 : state.tilt === 'back' ? -7.5 : 0;
    const radius = state.tilt === 'neutral' ? boardConfig.figureRadius : boardConfig.figureRadius * 0.92;

    return offsets.map((offset, index) => ({
      id: `${rod.id}-${index}`,
      rodId: rod.id,
      center: {
        x: rod.x + tiltShift,
        y: state.y + offset,
      },
      radius,
    })) satisfies FigureHit[];
  });
}

function sceneToHash(scene: SerializableScene): string {
  return `scene=${encodeScene(scene)}`;
}

function App() {
  const isCompact = useMediaQuery('(max-width: 1080px)');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const ball = useBoardStore((state) => state.ball);
  const rods = useBoardStore((state) => state.rods);
  const shots = useBoardStore((state) => state.shots);
  const guidesVisible = useBoardStore((state) => state.guidesVisible);
  const fiveGoalPositions = useBoardStore((state) => state.fiveGoalPositions);
  const activeShotColor = useBoardStore((state) => state.activeShotColor);
  const snapshots = useBoardStore((state) => state.snapshots);
  const activeTool = useBoardStore((state) => state.activeTool);
  const setBall = useBoardStore((state) => state.setBall);
  const moveRod = useBoardStore((state) => state.moveRod);
  const cycleRodTilt = useBoardStore((state) => state.cycleRodTilt);
  const addShot = useBoardStore((state) => state.addShot);
  const removeShot = useBoardStore((state) => state.removeShot);
  const setActiveTool = useBoardStore((state) => state.setActiveTool);
  const setActiveShotColor = useBoardStore((state) => state.setActiveShotColor);
  const toggleGuides = useBoardStore((state) => state.toggleGuides);
  const toggleFiveGoalPositions = useBoardStore((state) => state.toggleFiveGoalPositions);
  const saveSnapshot = useBoardStore((state) => state.saveSnapshot);
  const loadSnapshot = useBoardStore((state) => state.loadSnapshot);
  const deleteSnapshot = useBoardStore((state) => state.deleteSnapshot);
  const resetScene = useBoardStore((state) => state.resetScene);
  const hydrateScene = useBoardStore((state) => state.hydrateScene);

  const figureHits = useMemo(() => buildFigureHits(rods), [rods]);

  const fieldBounds = useMemo(
    () => ({
      left: boardConfig.fieldX,
      top: boardConfig.fieldY,
      right: boardConfig.fieldX + boardConfig.fieldWidth,
      bottom: boardConfig.fieldY + boardConfig.fieldHeight,
    }),
    [],
  );

  const shotTraces = useMemo(() => shots.map((shot) => ({ shot, trace: traceShot(ball, shot.target, fieldBounds, figureHits) })), [ball, fieldBounds, figureHits, shots]);

  const leftGoalShadows = useMemo(
    () =>
      projectGoalShadows(
        ball,
        figureHits,
        boardConfig.fieldX,
        boardConfig.centerY - boardConfig.goalWidth / 2,
        boardConfig.centerY + boardConfig.goalWidth / 2,
      ),
    [ball, figureHits],
  );

  const rightGoalShadows = useMemo(
    () =>
      projectGoalShadows(
        ball,
        figureHits,
        boardConfig.fieldX + boardConfig.fieldWidth,
        boardConfig.centerY - boardConfig.goalWidth / 2,
        boardConfig.centerY + boardConfig.goalWidth / 2,
      ),
    [ball, figureHits],
  );

  useEffect(() => {
    const applyHashScene = () => {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const token = params.get('scene');
      if (!token) {
        return;
      }

      const scene = decodeScene<Partial<SerializableScene>>(token);
      if (scene) {
        hydrateScene(scene);
      }
    };

    applyHashScene();
    window.addEventListener('hashchange', applyHashScene);
    return () => window.removeEventListener('hashchange', applyHashScene);
  }, [hydrateScene]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const svg = svgRef.current;
      if (!drag || !svg || drag.pointerId !== event.pointerId) {
        return;
      }

      const rect = svg.getBoundingClientRect();
      const point = {
        x: ((event.clientX - rect.left) / rect.width) * boardConfig.width,
        y: ((event.clientY - rect.top) / rect.height) * boardConfig.height,
      };

      if (drag.kind === 'ball') {
        setBall({
          x: clamp(point.x - drag.offsetX, fieldBounds.left, fieldBounds.right),
          y: clamp(point.y - drag.offsetY, fieldBounds.top, fieldBounds.bottom),
        });
      } else {
        moveRod(drag.rodId, clamp(point.y - drag.offsetY, boardConfig.rodMinY, boardConfig.rodMaxY));
      }
    };

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [fieldBounds, moveRod, setBall]);

  const handleBoardPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const point = pointFromEvent(event, svg);

    if (activeTool === 'move') {
      setBall({
        x: clamp(point.x, fieldBounds.left, fieldBounds.right),
        y: clamp(point.y, fieldBounds.top, fieldBounds.bottom),
      });
      return;
    }

    addShot({
      kind: activeTool === 'pass' ? 'pass' : 'shot',
      color: activeShotColor,
      target: point,
    });
  };

  const startBallDrag = (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>, svg);
    dragRef.current = {
      kind: 'ball',
      pointerId: event.pointerId,
      offsetX: point.x - ball.x,
      offsetY: point.y - ball.y,
    };
  };

  const startRodDrag = (rodId: RodConfig['id'], event: React.PointerEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>, svg);
    dragRef.current = {
      kind: 'rod',
      pointerId: event.pointerId,
      rodId,
      offsetY: point.y - rods[rodId].y,
    };
  };

  const handleShare = async () => {
    const scene = getSerializableScene(useBoardStore.getState());
    const hash = sceneToHash(scene);
    window.location.hash = hash;
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    setShareLink(url);
    setCopyState('idle');

    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1400);
    } catch {
      return;
    }
  };

  const handleSaveSnapshot = () => {
    saveSnapshot(snapshotName);
    setSnapshotName('');
  };

  const goalTop = boardConfig.centerY - boardConfig.goalWidth / 2;
  const goalMarkerSegments = fiveGoalPositions
    ? Array.from({ length: 5 }, (_, index) => ({ y: goalTop + index * 18, height: 18 }))
    : Array.from({ length: 3 }, (_, index) => ({ y: goalTop + index * 30, height: 30 }));
  const leftGoalColors = fiveGoalPositions
    ? ['rgba(255, 219, 194, 0.55)', 'rgba(255, 190, 145, 0.5)', 'rgba(255, 160, 104, 0.5)', 'rgba(232, 118, 63, 0.5)', 'rgba(191, 84, 34, 0.55)']
    : ['rgba(255, 219, 194, 0.55)', 'rgba(255, 160, 104, 0.5)', 'rgba(191, 84, 34, 0.55)'];
  const rightGoalColors = fiveGoalPositions
    ? ['rgba(199, 224, 255, 0.55)', 'rgba(163, 202, 247, 0.5)', 'rgba(118, 177, 238, 0.5)', 'rgba(73, 151, 217, 0.5)', 'rgba(37, 104, 162, 0.55)']
    : ['rgba(199, 224, 255, 0.55)', 'rgba(118, 177, 238, 0.5)', 'rgba(37, 104, 162, 0.55)'];

  return (
    <AppShell header={{ height: 88 }} padding="md" className="foosboard-shell">
      <AppShell.Header className="foosboard-header">
        <Group h="100%" justify="space-between" px="lg" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Paper radius="xl" p="xs" bg="var(--panel-bg)">
              <Shield size={20} />
            </Paper>
            <div>
              <Title order={2} className="foosboard-brand">
                Foosboard
              </Title>
              <Text size="sm" c="dimmed">
                Refaktorierte Taktiktafel für Tischfußball
              </Text>
            </div>
          </Group>

          <Group gap="xs" wrap="wrap" justify="flex-end">
            <Badge variant="light" color="teal">
              {activeTool === 'move' ? 'Ball platzieren' : activeTool === 'shot' ? 'Schusslinie' : 'Passlinie'}
            </Badge>
            <Badge variant="light" color="gray">
              {shots.length} Linien
            </Badge>
            <Badge variant="light" color="orange">
              {snapshots.length} Snapshots
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <div className="foosboard-layout">
          <Card className="foosboard-board-card">
            <Stack gap="sm">
              <Group justify="space-between" align="flex-end">
                <div>
                  <Text fw={600}>Spielfeld</Text>
                  <Text size="sm" c="dimmed">
                    Klick setzt den Ball, Linienwerkzeuge erzeugen Taktikpfade.
                  </Text>
                </div>
                <Group gap="xs">
                  <Badge variant="light" color="green">
                    Vorlage {boardConfig.width} x {boardConfig.height}
                  </Badge>
                  <Badge variant="light" color="blue">
                    {isCompact ? 'Mobile' : 'Desktop'}
                  </Badge>
                </Group>
              </Group>

              <div className="foosboard-board-wrap">
                <svg
                  ref={svgRef}
                  data-testid="board-svg"
                  aria-label="Foosboard Spielfeld"
                  viewBox={`0 0 ${boardConfig.width} ${boardConfig.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  onPointerDown={handleBoardPointerDown}
                  style={{ touchAction: 'none' }}
                >
                  <defs>
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="rgba(12, 28, 24, 0.25)" />
                    </filter>
                    <marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#14342d" />
                    </marker>
                  </defs>

                  <rect width={boardConfig.width} height={boardConfig.height} fill={boardConfig.colors.pageBg} />
                  <rect x={boardConfig.fieldX} y={boardConfig.fieldY} width={boardConfig.fieldWidth} height={boardConfig.fieldHeight} fill={boardConfig.colors.boardInner} />
                  <rect x={boardConfig.frameX} y={boardConfig.frameY} width={boardConfig.frameWidth} height={boardConfig.frameHeight} fill="none" stroke="#111" strokeWidth={5} />

                  <g fill="none" stroke={boardConfig.colors.fieldLine} strokeWidth={2}>
                    <path d={`M ${boardConfig.fieldX} ${boardConfig.fieldY + 65} H ${boardConfig.fieldX + 130} V ${boardConfig.fieldY + 255} H ${boardConfig.fieldX}`} />
                    <path d={`M ${boardConfig.fieldX} ${boardConfig.fieldY + 90} H ${boardConfig.fieldX + 70} V ${boardConfig.fieldY + 230} H ${boardConfig.fieldX}`} />
                    <line x1={boardConfig.centerX} y1={boardConfig.fieldY} x2={boardConfig.centerX} y2={boardConfig.fieldY + boardConfig.fieldHeight} />
                    <path d={`M ${boardConfig.fieldX + boardConfig.fieldWidth} ${boardConfig.fieldY + 65} H ${boardConfig.fieldX + boardConfig.fieldWidth - 130} V ${boardConfig.fieldY + 255} H ${boardConfig.fieldX + boardConfig.fieldWidth}`} />
                    <path d={`M ${boardConfig.fieldX + boardConfig.fieldWidth} ${boardConfig.fieldY + 230} H ${boardConfig.fieldX + boardConfig.fieldWidth - 70} V ${boardConfig.fieldY + 90} H ${boardConfig.fieldX + boardConfig.fieldWidth}`} />
                    <path d={`M ${boardConfig.fieldX + 130} ${boardConfig.fieldY + 125} C ${boardConfig.fieldX + 160} ${boardConfig.fieldY + 135} ${boardConfig.fieldX + 160} ${boardConfig.fieldY + 185} ${boardConfig.fieldX + 130} ${boardConfig.fieldY + 195}`} />
                    <path d={`M ${boardConfig.fieldX + boardConfig.fieldWidth - 130} ${boardConfig.fieldY + 195} C ${boardConfig.fieldX + boardConfig.fieldWidth - 160} ${boardConfig.fieldY + 185} ${boardConfig.fieldX + boardConfig.fieldWidth - 160} ${boardConfig.fieldY + 135} ${boardConfig.fieldX + boardConfig.fieldWidth - 130} ${boardConfig.fieldY + 125}`} />
                    <circle cx={boardConfig.centerX} cy={boardConfig.centerY} r={boardConfig.centerCircleRadius} />
                    <circle cx={boardConfig.centerX} cy={boardConfig.centerY} r={3} fill={boardConfig.colors.fieldLine} />
                  </g>

                  <g>
                    <rect x={boardConfig.fieldX - boardConfig.goalDepth} y={goalTop} width={boardConfig.goalDepth} height={boardConfig.goalWidth} fill={boardConfig.colors.fieldLine} />
                    <rect x={boardConfig.fieldX + boardConfig.fieldWidth} y={goalTop} width={boardConfig.goalDepth} height={boardConfig.goalWidth} fill={boardConfig.colors.fieldLine} />
                  </g>

                  <g opacity={0.5}>
                    {leftGoalShadows.map((shadow, index) => (
                      <rect
                        key={`left-shadow-${shadow.rodId}-${index}`}
                        x={boardConfig.fieldX - boardConfig.goalDepth + 0.8}
                        y={shadow.start}
                        width={Math.max(2, boardConfig.goalDepth - 1.6)}
                        height={Math.max(4, shadow.end - shadow.start)}
                        fill="#df6f3d"
                      />
                    ))}
                    {rightGoalShadows.map((shadow, index) => (
                      <rect
                        key={`right-shadow-${shadow.rodId}-${index}`}
                        x={boardConfig.fieldX + boardConfig.fieldWidth + 0.8}
                        y={shadow.start}
                        width={Math.max(2, boardConfig.goalDepth - 1.6)}
                        height={Math.max(4, shadow.end - shadow.start)}
                        fill="#4a97d9"
                      />
                    ))}
                  </g>

                  <g opacity={0.72}>
                    {goalMarkerSegments.map((segment, index) => (
                      <g key={`${segment.y}-${segment.height}`}>
                        <rect x={boardConfig.fieldX - 16.7} y={segment.y} width={16.5} height={segment.height} fill={leftGoalColors[index]} stroke="rgba(0,0,0,0.65)" strokeWidth={0.55} />
                        <rect x={boardConfig.fieldX + boardConfig.fieldWidth} y={segment.y} width={16.9} height={segment.height} fill={rightGoalColors[index]} stroke="rgba(0,0,0,0.65)" strokeWidth={0.55} />
                      </g>
                    ))}
                  </g>

                  {guidesVisible && (
                    <g opacity={0.45}>
                      {legacyGuideYs.map((guideY) => (
                        <line
                          key={guideY}
                          x1={boardConfig.fieldX}
                          y1={guideY}
                          x2={boardConfig.fieldX + boardConfig.fieldWidth}
                          y2={guideY}
                          stroke={boardConfig.colors.guide}
                          strokeWidth={1}
                          strokeDasharray="2 4"
                        />
                      ))}
                    </g>
                  )}

                  {shotTraces.map(({ shot, trace }) => {
                    const points = trace.segments.map((segment) => [segment.start, segment.end]).flat();
                    const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
                    const strokeWidth = shot.kind === 'pass' ? 4 : 5;
                    const strokeOpacity = trace.blocker ? 0.65 : 0.95;
                    const isPass = shot.kind === 'pass';

                    return (
                      <g key={shot.id}>
                        <polyline
                          points={polylinePoints}
                          fill="none"
                          stroke={shot.color}
                          strokeWidth={strokeWidth + 5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.16}
                        />
                        <polyline
                          points={polylinePoints}
                          fill="none"
                          stroke={shot.color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={isPass ? '10 8' : 'none'}
                          strokeOpacity={strokeOpacity}
                          markerEnd={trace.blocker ? undefined : 'url(#arrow-head)'}
                        />
                        {trace.blocker && (
                          <circle cx={trace.blocker.center.x} cy={trace.blocker.center.y} r={trace.blocker.radius + 4} fill={shot.color} opacity={0.22} />
                        )}
                      </g>
                    );
                  })}

                  {boardConfig.rods.map((rod) => {
                    const rodState = rods[rod.id];
                    const offsets = getRodOffsets(rod);

                    return (
                      <g key={rod.id} data-testid={`rod-${rod.id}`} transform={`translate(${rod.x},0)`}>
                        <rect x={-2.5} y={38.35} width={5} height={390} fill={rod.rodColor} stroke="rgba(0,0,0,0.58)" strokeWidth={0.95} />
                        <rect x={-7.5} y={14.39} width={15} height={40} fill="#111" rx={1.5} />
                        <rect x={-7.5} y={412.24} width={15} height={40} fill="#111" rx={1.5} />

                        <rect
                          x={-34.95}
                          y={rodState.y - 28.89}
                          width={69.9}
                          height={57.78}
                          fill="rgba(255,255,255,0.04)"
                          stroke="rgba(255,255,255,0.35)"
                          strokeWidth={1}
                          strokeDasharray="2 3"
                          onPointerDown={(event) => startRodDrag(rod.id, event)}
                          cursor="ns-resize"
                        />

                        <g transform={`translate(0 ${rodState.y})`}>
                          {offsets.map((offset, index) => (
                            <g key={`${rod.id}-${index}`}>
                              {renderLegacyFigure(rod, rodState.tilt, offset, (event) => {
                                event.stopPropagation();
                                cycleRodTilt(rod.id);
                              })}
                            </g>
                          ))}
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
                      onPointerDown={startBallDrag}
                      cursor="grab"
                      filter="url(#shadow)"
                    />
                    <circle cx={ball.x - 2.4} cy={ball.y - 2.8} r={2.1} fill="rgba(255,255,255,0.95)" />
                  </g>
                </svg>
              </div>
            </Stack>
          </Card>

          <Stack className="foosboard-sidebar" gap="md">
            <Card className="foosboard-panel">
              <Stack gap="md">
                <div>
                  <Text fw={600}>Werkzeuge</Text>
                  <Text size="sm" c="dimmed">
                    Wähle Ballbewegung oder Linienwerkzeuge für Schuss und Pass.
                  </Text>
                </div>

                <SegmentedControl
                  data={[
                    { label: 'Ball', value: 'move' },
                    { label: 'Schuss', value: 'shot' },
                    { label: 'Pass', value: 'pass' },
                  ]}
                  value={activeTool}
                  onChange={(value) => setActiveTool(value as typeof activeTool)}
                />

                <SegmentedControl
                  data={colorChoices.map((choice) => ({ value: choice.value, label: choice.label }))}
                  value={activeShotColor}
                  onChange={(value) => setActiveShotColor(value)}
                />

                <Group grow>
                  <Button leftSection={<Eye size={16} />} variant={guidesVisible ? 'filled' : 'light'} onClick={toggleGuides}>
                    {guidesVisible ? 'Hilfslinien an' : 'Hilfslinien aus'}
                  </Button>
                  <Button leftSection={<Layers3 size={16} />} variant={fiveGoalPositions ? 'filled' : 'light'} onClick={toggleFiveGoalPositions}>
                    {fiveGoalPositions ? '5 Zielpunkte' : '3 Zielpunkte'}
                  </Button>
                </Group>

                <Group grow>
                  <Button leftSection={<RotateCcw size={16} />} variant="light" onClick={resetScene}>
                    Reset
                  </Button>
                  <Button leftSection={<Sparkles size={16} />} variant="light" onClick={handleShare}>
                    Teilen
                  </Button>
                </Group>

                <Group align="flex-end" grow>
                  <TextInput
                    label="Snapshot-Name"
                    placeholder="z. B. Standardpresse"
                    value={snapshotName}
                    onChange={(event) => setSnapshotName(event.currentTarget.value)}
                  />
                  <Button leftSection={<Save size={16} />} onClick={handleSaveSnapshot}>
                    Speichern
                  </Button>
                </Group>

                <TextInput
                  label="Share-Link"
                  value={shareLink}
                  placeholder="Link wird hier erzeugt"
                  readOnly
                  rightSection={
                    <ActionIcon variant="subtle" aria-label="Kopieren" onClick={handleShare}>
                      <Copy size={16} />
                    </ActionIcon>
                  }
                />

                <Text size="sm" c={copyState === 'copied' ? 'teal' : 'dimmed'}>
                  {copyState === 'copied' ? 'Link in die Zwischenablage kopiert.' : `Der Link basiert auf ${boardConfig.legacy.sourceAsset} und wird als Base64-Hash gespeichert.`}
                </Text>
              </Stack>
            </Card>

            <Card className="foosboard-panel">
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={600}>Stellungen</Text>
                    <Text size="sm" c="dimmed">
                      Gespeicherte Szenen im LocalStorage.
                    </Text>
                  </div>
                  <Badge variant="light">{snapshots.length}</Badge>
                </Group>

                <Divider />

                <Stack className="foosboard-saved-list">
                  {snapshots.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      Noch keine Snapshots gespeichert.
                    </Text>
                  ) : (
                    snapshots.map((snapshot) => (
                      <Paper key={snapshot.id} withBorder p="sm" radius="lg" bg="rgba(255,255,255,0.5)">
                        <Group justify="space-between" align="center">
                          <div>
                            <Text fw={600}>{snapshot.name}</Text>
                            <Text size="xs" c="dimmed">
                              {new Date(snapshot.createdAt).toLocaleString('de-DE')}
                            </Text>
                          </div>
                          <Group gap={6}>
                            <ActionIcon variant="light" aria-label="Laden" onClick={() => loadSnapshot(snapshot.id)}>
                              <Play size={15} />
                            </ActionIcon>
                            <ActionIcon variant="light" aria-label="Löschen" onClick={() => deleteSnapshot(snapshot.id)}>
                              <Trash2 size={15} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Stack>
            </Card>

            <Card className="foosboard-panel">
              <Stack gap="xs">
                <Text fw={600}>Aktueller Zustand</Text>
                <Text size="sm" c="dimmed">
                  Ball und Rods aus dem neuen Zustandssystem.
                </Text>
                <Group gap="xs" wrap="wrap">
                  <Badge variant="light" color="teal">
                    Ball {Math.round(ball.x)} / {Math.round(ball.y)}
                  </Badge>
                  <Badge variant="light" color="blue">
                    Linien {shots.length}
                  </Badge>
                  <Badge variant="light" color="orange">
                    Hilfen {guidesVisible ? 'an' : 'aus'}
                  </Badge>
                </Group>
                <Divider my="xs" />
                {boardConfig.rods.slice(0, 6).map((rod) => (
                  <Group key={rod.id} justify="space-between" align="center" wrap="nowrap">
                    <div>
                      <Text size="sm">{rod.label}</Text>
                      <Text size="xs" c="dimmed" className="foosboard-mono">
                        {Math.round(rods[rod.id].y)} mm · {rods[rod.id].tilt}
                      </Text>
                    </div>
                    <Button size="xs" variant="light" onClick={() => cycleRodTilt(rod.id)}>
                      Kippen
                    </Button>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card className="foosboard-panel">
              <Stack gap="xs">
                <Text fw={600}>Linienverwaltung</Text>
                {shots.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Noch keine Schuss- oder Passlinien angelegt.
                  </Text>
                ) : (
                  shots.map((shot) => (
                    <Group key={shot.id} justify="space-between" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <div style={{ width: 14, height: 14, borderRadius: 999, background: shot.color }} />
                        <Text size="sm">{shot.label}</Text>
                      </Group>
                      <ActionIcon variant="light" aria-label="Linie löschen" onClick={() => removeShot(shot.id)}>
                        <Ban size={15} />
                      </ActionIcon>
                    </Group>
                  ))
                )}
              </Stack>
            </Card>
          </Stack>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;