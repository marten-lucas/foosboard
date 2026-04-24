import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  boardConfig,
  createDefaultScene,
  type BallState,
  type BallTokenState,
  type RodId,
  type RodState,
  type SavedScene,
  type SerializableScene,
  type ShotLine,
  normalizeTiltMode,
} from '../boardConfig';
import { clamp, createId } from '../geometry';
import { buildRodMotionBounds } from '../lib/rodLayout';

export type ToolMode = 'move' | 'shot' | 'pass';

interface BoardStore extends SerializableScene {
  activeTool: ToolMode;
  activeBallId: string | null;
  activePositionId: string | null;
  snapshots: SavedScene[];
  setBall: (point: BallState) => void;
  spawnBall: (point: BallState) => string;
  moveBall: (ballId: string, point: BallState) => void;
  removeBall: (ballId: string) => void;
  setActiveBall: (ballId: string | null) => void;
  moveRod: (rodId: RodId, y: number) => void;
  cycleRodTilt: (rodId: RodId) => void;
  addShot: (shot: Omit<ShotLine, 'id' | 'label'>) => string;
  updateShot: (shotId: string, patch: Partial<Omit<ShotLine, 'id' | 'label'>>) => void;
  removeShot: (shotId: string) => void;
  setActiveTool: (tool: ToolMode) => void;
  setActiveShotColor: (color: string) => void;
  toggleGuides: () => void;
  toggleFiveGoalPositions: () => void;
  saveSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  resetScene: () => void;
  hydrateScene: (scene: Partial<SerializableScene>) => void;
}

function createSnapshot(scene: SerializableScene, name: string): SavedScene {
  return {
    id: createId('snapshot'),
    name,
    createdAt: Date.now(),
    scene: JSON.parse(JSON.stringify(scene)) as SerializableScene,
  };
}

function buildLabel(kind: ShotLine['kind'], index: number): string {
  const prefix = kind === 'shot' ? 'Schuss' : 'Pass';
  return `${prefix} ${index + 1}`;
}

function createSceneFromDefaults(): SerializableScene {
  return createDefaultScene();
}

function normalizeBallTokens(balls: SerializableScene['balls'] | undefined, legacyBall: BallState | undefined): BallTokenState[] {
  if (balls !== undefined) {
    return balls.map((ball) => ({
      id: ball.id,
      x: ball.x,
      y: ball.y,
    }));
  }

  if (legacyBall) {
    return [
      {
        id: createId('ball'),
        x: legacyBall.x,
        y: legacyBall.y,
      },
    ];
  }

  return [];
}

function cycleTiltValue(currentTilt: RodState['tilt']): RodState['tilt'] {
  switch (currentTilt) {
    case 'neutral':
      return 'front';
    case 'front':
      return 'back';
    case 'back':
      return 'hochgestellt';
    default:
      return 'neutral';
  }
}

function normalizeRodStates(rods: SerializableScene['rods']): SerializableScene['rods'] {
  return boardConfig.rods.reduce((accumulator, rod) => {
    const currentRod = rods[rod.id];
    accumulator[rod.id] = {
      y: currentRod?.y ?? rod.defaultY,
      tilt: normalizeTiltMode(currentRod?.tilt),
    };
    return accumulator;
  }, {} as SerializableScene['rods']);
}

function normalizeScene(scene: Partial<SerializableScene>): Partial<SerializableScene> {
  const balls = normalizeBallTokens(scene.balls, scene.ball);
  const fallbackShotOrigin = scene.ball ?? balls[0] ?? createDefaultScene().ball;

  return {
    ...scene,
    ball: scene.ball ?? balls[0] ?? createDefaultScene().ball,
    balls,
    shots: scene.shots
      ? scene.shots.map((shot) => ({
          ...shot,
          start: { ...(shot.start ?? shot.target ?? fallbackShotOrigin) },
          target: { ...shot.target },
        }))
      : [],
    rods: scene.rods ? normalizeRodStates(scene.rods as SerializableScene['rods']) : scene.rods,
  };
}

function normalizeSavedScene(snapshot: SavedScene): SavedScene {
  return {
    ...snapshot,
    scene: normalizeScene(snapshot.scene) as SerializableScene,
  };
}

function syncActivePositionScene(snapshots: SavedScene[], activePositionId: string | null, scene: SerializableScene): SavedScene[] {
  if (!activePositionId) {
    return snapshots;
  }

  return snapshots.map((snapshot) =>
    snapshot.id === activePositionId
      ? {
          ...snapshot,
          scene: JSON.parse(JSON.stringify(scene)) as SerializableScene,
        }
      : snapshot,
  );
}

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      ...createSceneFromDefaults(),
      activeTool: 'move',
      activeBallId: null,
      activePositionId: null,
      snapshots: [],
      setBall: (point) =>
        set((state) => {
          const ball = {
            x: clamp(point.x, boardConfig.fieldX + boardConfig.ballRadius, boardConfig.fieldX + boardConfig.fieldWidth - boardConfig.ballRadius),
            y: clamp(point.y, boardConfig.fieldY + boardConfig.ballRadius, boardConfig.fieldY + boardConfig.fieldHeight - boardConfig.ballRadius),
          };

          return {
            ball,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              ball,
            }),
          };
        }),
      spawnBall: (point) => {
        const ballId = createId('ball');

        set((state) => {
          const balls = [
            ...state.balls,
            {
              id: ballId,
              x: point.x,
              y: point.y,
            },
          ];
          const ball = {
            x: point.x,
            y: point.y,
          };

          return {
            balls,
            ball,
            activeBallId: ballId,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              balls,
              ball,
            }),
          };
        });

        return ballId;
      },
      moveBall: (ballId, point) =>
        set((state) => {
          const balls = state.balls.map((ball) =>
            ball.id === ballId
              ? {
                  ...ball,
                  x: point.x,
                  y: point.y,
                }
              : ball,
          );
          const ball = state.activeBallId === ballId ? { x: point.x, y: point.y } : state.ball;

          return {
            balls,
            ball,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              balls,
              ball,
            }),
          };
        }),
      removeBall: (ballId) =>
        set((state) => {
          const remainingBalls = state.balls.filter((ball) => ball.id !== ballId);
          const nextBall = remainingBalls[remainingBalls.length - 1];
          const ball = nextBall ? { x: nextBall.x, y: nextBall.y } : createDefaultScene().ball;

          return {
            balls: remainingBalls,
            ball,
            activeBallId: state.activeBallId === ballId ? nextBall?.id ?? null : state.activeBallId,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              balls: remainingBalls,
              ball,
            }),
          };
        }),
      setActiveBall: (ballId) => set(() => ({ activeBallId: ballId })),
      moveRod: (rodId, y) =>
        set((state) => {
          const rods = {
            ...state.rods,
            [rodId]: {
              ...state.rods[rodId],
              y: clamp(y, buildRodMotionBounds(rodId).minY, buildRodMotionBounds(rodId).maxY),
            },
          };

          return {
            rods,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              rods,
            }),
          };
        }),
      cycleRodTilt: (rodId) =>
        set((state) => {
          const rods = {
            ...state.rods,
            [rodId]: {
              ...state.rods[rodId],
              tilt: cycleTiltValue(state.rods[rodId].tilt),
            },
          };

          return {
            rods,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              rods,
            }),
          };
        }),
      addShot: (shot) => {
        const shotId = createId(shot.kind);

        set((state) => {
          const shots = [
            ...state.shots,
            {
              ...shot,
              start: { ...shot.start },
              target: { ...shot.target },
              id: shotId,
              label: buildLabel(shot.kind, state.shots.length),
            },
          ];

          return {
            shots,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              shots,
            }),
          };
        });

        return shotId;
      },
      updateShot: (shotId, patch) =>
        set((state) => {
          const shots = state.shots.map((shot) =>
            shot.id === shotId
              ? {
                  ...shot,
                  ...patch,
                  start: patch.start ? { ...patch.start } : shot.start,
                  target: patch.target ? { ...patch.target } : shot.target,
                }
              : shot,
          );

          return {
            shots,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              shots,
            }),
          };
        }),
      removeShot: (shotId) =>
        set((state) => {
          const shots = state.shots.filter((shot) => shot.id !== shotId);

          return {
            shots,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              shots,
            }),
          };
        }),
      setActiveTool: (tool) => set(() => ({ activeTool: tool })),
      setActiveShotColor: (color) => set(() => ({ activeShotColor: color })),
      toggleGuides: () =>
        set((state) => {
          const guidesVisible = !state.guidesVisible;

          return {
            guidesVisible,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              guidesVisible,
            }),
          };
        }),
      toggleFiveGoalPositions: () =>
        set((state) => {
          const fiveGoalPositions = !state.fiveGoalPositions;

          return {
            fiveGoalPositions,
            snapshots: syncActivePositionScene(state.snapshots, state.activePositionId, {
              ...(getSerializableScene(state as BoardStore) as SerializableScene),
              fiveGoalPositions,
            }),
          };
        }),
      saveSnapshot: (name) => {
        const safeName = name.trim() || `Taktik ${get().snapshots.length + 1}`;
        const scene = getSerializableScene(get());
        const snapshot = createSnapshot(scene, safeName);
        set((state) => ({
          snapshots: [snapshot, ...state.snapshots].slice(0, 12),
          activePositionId: snapshot.id,
        }));
      },
      loadSnapshot: (snapshotId) => {
        const snapshot = get().snapshots.find((item) => item.id === snapshotId);
        if (!snapshot) {
          return;
        }

        set(() => ({
          ...normalizeScene(snapshot.scene),
          activePositionId: snapshot.id,
        }));
      },
      deleteSnapshot: (snapshotId) =>
        set((state) => ({
          snapshots: state.snapshots.filter((snapshot) => snapshot.id !== snapshotId),
        })),
      resetScene: () => set(() => ({ ...createSceneFromDefaults(), activePositionId: null })),
      hydrateScene: (scene) =>
        set((state) => ({
          ...state,
          ...normalizeScene(scene),
          activePositionId: null,
        })),
    }),
    {
      name: 'foosboard-scene',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ball: state.ball,
        balls: state.balls,
        rods: state.rods,
        shots: state.shots,
        guidesVisible: state.guidesVisible,
        fiveGoalPositions: state.fiveGoalPositions,
        activeShotColor: state.activeShotColor,
        activePositionId: state.activePositionId,
        snapshots: state.snapshots.map(normalizeSavedScene),
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<BoardStore> | undefined;

        return {
          ...state,
          balls: normalizeBallTokens(state?.balls, state?.ball),
          rods: state?.rods ? normalizeRodStates(state.rods) : state?.rods,
          shots:
            state?.shots?.map((shot) => ({
              ...shot,
              start: { ...(shot.start ?? shot.target ?? state?.ball ?? createDefaultScene().ball) },
              target: { ...shot.target },
            })) ?? [],
          activePositionId: state?.activePositionId ?? null,
          snapshots: state?.snapshots?.map(normalizeSavedScene),
        };
      },
      version: 5,
    },
  ),
);

export function getSerializableScene(state: BoardStore): SerializableScene {
  return {
    ball: state.ball,
    balls: state.balls,
    rods: state.rods,
    shots: state.shots,
    guidesVisible: state.guidesVisible,
    fiveGoalPositions: state.fiveGoalPositions,
    activeShotColor: state.activeShotColor,
  };
}
