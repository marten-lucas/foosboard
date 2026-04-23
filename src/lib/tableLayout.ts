import { buildCenteredOffsets } from './rowFigureLayout';

export type TableRowKey = 'goalkeeper' | 'defense' | 'midfield' | 'offense';

export type TableRowConfig = {
  position: number;
  playerCount: number;
  spacing: number;
  outerStop: number;
  rodLength: number;
  rodDiameter: number;
};

export type SvgLayerData = {
  preview: string;
  geometryOptions: string[];
  bounds?: {
    width: number;
    height: number;
  };
};

export type TableDraft = {
  name: string;
  manufacturer: string;
  fieldLength: number;
  fieldWidth: number;
  goalWidth: number;
  rows: Record<TableRowKey, TableRowConfig>;
  figureWidth: number;
  playerOneColor: string;
  playerTwoColor: string;
  ballSize: number;
  ballColor: string;
  figureLayerBottom: string;
  figureLayerForward: string;
  figureLayerBackward: string;
  bottomAnchorGroup: string;
  bottomCollisionGroup: string;
  forwardAnchorGroup: string;
  forwardCollisionGroup: string;
  backwardAnchorGroup: string;
  backwardCollisionGroup: string;
};

export type StoredTableLayout = {
  meta: {
    name: string;
    sourceAsset: string;
    legacyViewBox: [number, number];
    description: string;
  };
  settings: {
    manufacturer: string;
    field: {
      lengthCm: number;
      widthCm: number;
      goalWidthCm: number;
      assetId: string | null;
    };
    configuration: {
      gripLengthCm?: number;
      gripWidthCm?: number;
      rows: Record<TableRowKey, TableRowConfig>;
    };
    figures: {
      widthCm: number;
      colors: {
        player1: string;
        player2: string;
      };
      states: {
        unten: { assetId: string | null; layer: string; anchorGroup: string; collisionGroup: string };
        nachVorn: { assetId: string | null; layer: string; anchorGroup: string; collisionGroup: string };
        nachHinten: { assetId: string | null; layer: string; anchorGroup: string; collisionGroup: string };
      };
    };
    ball: {
      sizeCm: number;
      color: string;
    };
  };
  assets: Record<string, string>;
  dimensions: {
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
  };
  palette: {
    pageBg: string;
    boardOuter: string;
    boardInner: string;
    fieldLine: string;
    guide: string;
    shadow: string;
    rail: string;
  };
  rods: Array<{
    id: string;
    label: string;
    team: 'orange' | 'blue';
    x: number;
    playerCount: number;
    defaultY: number;
    figureOffsets: number[];
    rodColor: string;
    figureColor: string;
  }>;
};

export const defaultTableDraft: TableDraft = {
  name: 'Ullrich P4P',
  manufacturer: 'Ullrich Sport',
  fieldLength: 120,
  fieldWidth: 68,
  goalWidth: 20.5,
  rows: {
    goalkeeper: { position: 7.5, playerCount: 1, spacing: 18.0625, outerStop: 20.25, rodLength: 109, rodDiameter: 1.6 },
    defense: { position: 22.5, playerCount: 2, spacing: 23.375, outerStop: 2, rodLength: 128.5, rodDiameter: 1.6 },
    midfield: { position: 52.5, playerCount: 5, spacing: 12.75, outerStop: 2, rodLength: 104.1, rodDiameter: 1.6 },
    offense: { position: 82.5, playerCount: 3, spacing: 18.0625, outerStop: 2, rodLength: 117, rodDiameter: 1.6 },
  },
  figureWidth: 3.5,
  playerOneColor: '#d9480f',
  playerTwoColor: '#1c7ed6',
  ballSize: 3.5,
  ballColor: '#f5f5f5',
  figureLayerBottom: 'unten',
  figureLayerForward: 'nach vorn',
  figureLayerBackward: 'nach hinten',
  bottomAnchorGroup: 'Verbindungssteg',
  bottomCollisionGroup: 'Torso',
  forwardAnchorGroup: 'Verbindungssteg',
  forwardCollisionGroup: 'Torso',
  backwardAnchorGroup: 'Verbindungssteg',
  backwardCollisionGroup: 'Torso',
};

const BOARD_WIDTH = 610;
const FIELD_HEIGHT_UNITS = 320;
const FIELD_X = 22.213;
const FRAME_MARGIN = 5;
const FIELD_MARGIN = 15; // Board-Einheiten Puffer oberhalb/unterhalb des Stangen-Überstands
const CENTER_CIRCLE_RATIO = 45 / 320;
const GOAL_DEPTH = 5.213;

function toFieldUnits(valueCm: number, totalCm: number, totalUnits: number) {
  return (valueCm / Math.max(totalCm, 1)) * totalUnits;
}

function buildFigureOffsets(row: TableRowConfig, fieldWidthCm: number) {
  const spacingUnits = toFieldUnits(row.spacing, fieldWidthCm, FIELD_HEIGHT_UNITS);
  return buildCenteredOffsets(row.playerCount, spacingUnits);
}

function getRodExtensionUnits(rodLengthCm: number, fieldWidthCm: number) {
  return Math.max(((rodLengthCm - fieldWidthCm) / 2 / Math.max(fieldWidthCm, 1)) * FIELD_HEIGHT_UNITS, 0);
}

export function buildTableLayoutFromDraft(
  draft: TableDraft,
  svgPreviews: Record<string, string>,
  layerData: Record<string, SvgLayerData>,
): StoredTableLayout {
  // Stangen-Überstand in Board-Einheiten bestimmt die nötige Randhöhe.
  const maxRodLength = Math.max(...Object.values(draft.rows).map((row) => row.rodLength));
  const rodExtensionUnits = getRodExtensionUnits(maxRodLength, draft.fieldWidth);
  const FIELD_Y = rodExtensionUnits + FIELD_MARGIN;
  const BOARD_HEIGHT = FIELD_HEIGHT_UNITS + 2 * FIELD_Y;
  const fieldWidthUnits = BOARD_WIDTH - FIELD_X * 2 - 5.264;
  const fieldX = FIELD_X;
  const frameX = fieldX + FRAME_MARGIN / 2;
  const frameY = FIELD_Y + FRAME_MARGIN / 2;
  const frameWidth = fieldWidthUnits - FRAME_MARGIN;
  const frameHeight = FIELD_HEIGHT_UNITS - FRAME_MARGIN;
  const centerX = fieldX + fieldWidthUnits / 2;
  const centerY = FIELD_Y + FIELD_HEIGHT_UNITS / 2;
  const goalWidthUnits = toFieldUnits(draft.goalWidth, draft.fieldWidth, FIELD_HEIGHT_UNITS);
  const ballRadius = Math.max(toFieldUnits(draft.ballSize / 2, draft.fieldWidth, FIELD_HEIGHT_UNITS), 4);
  const figureRadius = Math.max(toFieldUnits(draft.figureWidth / 2, draft.fieldWidth, FIELD_HEIGHT_UNITS), 6);
  const rowOrder = [
    { id: 'P2_1', row: 'goalkeeper' as const, label: 'Torwart', team: 'orange' as const, mirrored: false },
    { id: 'P2_2', row: 'defense' as const, label: 'Abwehr', team: 'orange' as const, mirrored: false },
    { id: 'P1_3', row: 'offense' as const, label: 'Angriff', team: 'blue' as const, mirrored: true },
    { id: 'P2_5', row: 'midfield' as const, label: 'Mittelfeld', team: 'orange' as const, mirrored: false },
    { id: 'P1_5', row: 'midfield' as const, label: 'Mittelfeld', team: 'blue' as const, mirrored: true },
    { id: 'P2_3', row: 'offense' as const, label: 'Angriff', team: 'orange' as const, mirrored: false },
    { id: 'P1_2', row: 'defense' as const, label: 'Abwehr', team: 'blue' as const, mirrored: true },
    { id: 'P1_1', row: 'goalkeeper' as const, label: 'Torwart', team: 'blue' as const, mirrored: true },
  ];

  const assets: Record<string, string> = {};
  if (svgPreviews.field) {
    assets['field.primary'] = svgPreviews.field;
  }
  if (layerData[draft.figureLayerBottom]?.preview) {
    assets['figure.bottom'] = layerData[draft.figureLayerBottom].preview;
  }
  if (layerData[draft.figureLayerForward]?.preview) {
    assets['figure.forward'] = layerData[draft.figureLayerForward].preview;
  }
  if (layerData[draft.figureLayerBackward]?.preview) {
    assets['figure.backward'] = layerData[draft.figureLayerBackward].preview;
  }

  return {
    meta: {
      name: draft.name,
      sourceAsset: 'field.primary',
      legacyViewBox: [BOARD_WIDTH, BOARD_HEIGHT],
      description: `Konfigurierter Tisch ${draft.manufacturer} ${draft.name}`,
    },
    settings: {
      manufacturer: draft.manufacturer,
      field: {
        lengthCm: draft.fieldLength,
        widthCm: draft.fieldWidth,
        goalWidthCm: draft.goalWidth,
        assetId: assets['field.primary'] ? 'field.primary' : null,
      },
      configuration: {
        gripLengthCm: 7,
        gripWidthCm: 3,
        rows: draft.rows,
      },
      figures: {
        widthCm: draft.figureWidth,
        colors: {
          player1: draft.playerOneColor,
          player2: draft.playerTwoColor,
        },
        states: {
          unten: {
            assetId: assets['figure.bottom'] ? 'figure.bottom' : null,
            layer: draft.figureLayerBottom,
            anchorGroup: draft.bottomAnchorGroup,
            collisionGroup: draft.bottomCollisionGroup,
          },
          nachVorn: {
            assetId: assets['figure.forward'] ? 'figure.forward' : null,
            layer: draft.figureLayerForward,
            anchorGroup: draft.forwardAnchorGroup,
            collisionGroup: draft.forwardCollisionGroup,
          },
          nachHinten: {
            assetId: assets['figure.backward'] ? 'figure.backward' : null,
            layer: draft.figureLayerBackward,
            anchorGroup: draft.backwardAnchorGroup,
            collisionGroup: draft.backwardCollisionGroup,
          },
        },
      },
      ball: {
        sizeCm: draft.ballSize,
        color: draft.ballColor,
      },
    },
    assets,
    dimensions: {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      fieldX,
      fieldY: FIELD_Y,
      fieldWidth: fieldWidthUnits,
      fieldHeight: FIELD_HEIGHT_UNITS,
      frameX,
      frameY,
      frameWidth,
      frameHeight,
      goalWidth: goalWidthUnits,
      goalDepth: GOAL_DEPTH,
      centerCircleRadius: FIELD_HEIGHT_UNITS * CENTER_CIRCLE_RATIO,
      centerX,
      centerY,
      ballRadius,
      rodMinY: FIELD_Y + 40,
      rodMaxY: FIELD_Y + FIELD_HEIGHT_UNITS - 40,
      figureRadius,
      figureSpacing: toFieldUnits(draft.rows.midfield.spacing, draft.fieldWidth, FIELD_HEIGHT_UNITS),
    },
    palette: {
      pageBg: '#e9e9e9',
      boardOuter: '#2da62d',
      boardInner: '#37c837',
      fieldLine: '#ffffff',
      guide: 'rgba(0,0,0,0.22)',
      shadow: 'rgba(25, 40, 35, 0.18)',
      rail: '#b7b7b7',
    },
    rods: rowOrder.map((item) => {
      const row = draft.rows[item.row];
      const x = item.mirrored
        ? fieldX + fieldWidthUnits - toFieldUnits(row.position, draft.fieldLength, fieldWidthUnits)
        : fieldX + toFieldUnits(row.position, draft.fieldLength, fieldWidthUnits);

      return {
        id: item.id,
        label: item.label,
        team: item.team,
        x,
        playerCount: row.playerCount,
        defaultY: centerY,
        figureOffsets: buildFigureOffsets(row, draft.fieldWidth),
        rodColor: '#c9c2b8',
        figureColor: item.team === 'orange' ? draft.playerOneColor : draft.playerTwoColor,
        rodLengthCm: row.rodLength,
        rodDiameterCm: row.rodDiameter,
      };
    }),
  };
}
