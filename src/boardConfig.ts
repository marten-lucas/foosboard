import tableLayout from './data/tableLayout.json';
import type { StoredTableLayout } from './lib/tableLayout';

export type RodId =
  | 'P2_1'
  | 'P2_2'
  | 'P2_5'
  | 'P2_3'
  | 'P1_3'
  | 'P1_5'
  | 'P1_2'
  | 'P1_1';

export type Team = 'orange' | 'blue';
export type TiltMode = 'neutral' | 'front' | 'back';

export interface RodConfig {
  id: RodId;
  label: string;
  team: Team;
  x: number;
  playerCount: number;
  defaultY: number;
  figureOffsets?: number[];
  rodColor: string;
  figureColor: string;
}

export interface BoardConfig {
  width: number;
  height: number;
  fieldX: number;
  fieldY: number;
  fieldWidth: number;
  fieldHeight: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  goalWidth: number;
  goalDepth: number;
  centerCircleRadius: number;
  centerX: number;
  centerY: number;
  ballRadius: number;
  rodMinY: number;
  rodMaxY: number;
  figureRadius: number;
  figureSpacing: number;
  rods: RodConfig[];
  colors: {
    pageBg: string;
    boardOuter: string;
    boardInner: string;
    fieldLine: string;
    guide: string;
    shadow: string;
    rail: string;
  };
  legacy: {
    name: string;
    sourceAsset: string;
    legacyViewBox: [number, number];
    description: string;
  };
  assets: Record<string, string>;
  settings?: StoredTableLayout['settings'];
}

export interface BallState {
  x: number;
  y: number;
}

export interface RodState {
  y: number;
  tilt: TiltMode;
}

export interface ShotLine {
  id: string;
  kind: 'shot' | 'pass';
  color: string;
  target: BallState;
  label: string;
}

export interface SavedScene {
  id: string;
  name: string;
  createdAt: number;
  scene: SerializableScene;
}

export interface SerializableScene {
  ball: BallState;
  rods: Record<RodId, RodState>;
  shots: ShotLine[];
  guidesVisible: boolean;
  fiveGoalPositions: boolean;
  activeShotColor: string;
}

function resolveStoredLayout(): StoredTableLayout {
  return tableLayout as StoredTableLayout;
}

function createBoardConfigFromLayout(layout: StoredTableLayout): BoardConfig {
  return {
    ...layout.dimensions,
    rods: layout.rods as RodConfig[],
    colors: layout.palette,
    legacy: {
      name: layout.meta.name,
      sourceAsset: layout.meta.sourceAsset,
      legacyViewBox: layout.meta.legacyViewBox as [number, number],
      description: layout.meta.description,
    },
    assets: layout.assets || {},
    settings: layout.settings,
  };
}

let currentLayout = resolveStoredLayout();

export const boardConfig: BoardConfig = createBoardConfigFromLayout(currentLayout);

export function applyTableLayout(layout: StoredTableLayout) {
  currentLayout = layout;
  Object.assign(boardConfig, createBoardConfigFromLayout(layout));
}

const defaultRodStates = boardConfig.rods.reduce((accumulator, rod) => {
  accumulator[rod.id] = { y: rod.defaultY, tilt: 'neutral' };
  return accumulator;
}, {} as Record<RodId, RodState>);

export function createDefaultRodStates(): Record<RodId, RodState> {
  return boardConfig.rods.reduce((accumulator, rod) => {
    const state = defaultRodStates[rod.id];
    accumulator[rod.id] = { ...state };
    return accumulator;
  }, {} as Record<RodId, RodState>);
}

export function createDefaultScene(): SerializableScene {
  return {
    ball: {
      x: boardConfig.centerX,
      y: boardConfig.centerY,
    },
    rods: createDefaultRodStates(),
    shots: [],
    guidesVisible: true,
    fiveGoalPositions: false,
    activeShotColor: '#ff7a3d',
  };
}