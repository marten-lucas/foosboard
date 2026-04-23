import { boardConfig, type RodId } from '../boardConfig';
import { defaultTableDraft, type TableRowConfig, type TableRowKey } from './tableLayout';
import { buildCenteredOffsets } from './rowFigureLayout';
import { buildRodStrokeWidth } from './figureRenderModel';

export function buildCenteredRodBounds(viewTop: number, fieldHeight: number, rodExtension: number) {
  return {
    top: viewTop - rodExtension,
    bottom: viewTop + fieldHeight + rodExtension,
  };
}

const ROD_ROW_KEY_BY_ID: Record<RodId, TableRowKey> = {
  P2_1: 'goalkeeper',
  P2_2: 'defense',
  P2_5: 'midfield',
  P2_3: 'offense',
  P1_3: 'offense',
  P1_5: 'midfield',
  P1_2: 'defense',
  P1_1: 'goalkeeper',
};

export function getRodRowKey(rodId: RodId) {
  return ROD_ROW_KEY_BY_ID[rodId];
}

export function getRodGeometry(row: Pick<TableRowConfig, 'rodLength' | 'rodDiameter'>, fieldWidthCm: number, viewFieldHeight: number) {
  const rodExtension = Math.max(((row.rodLength - fieldWidthCm) / 2 / Math.max(fieldWidthCm, 1)) * viewFieldHeight, 0);
  const rodStrokeWidth = buildRodStrokeWidth({
    rodDiameterCm: row.rodDiameter,
    fieldWidthCm,
    viewFieldHeight,
    min: 0.6,
  });

  return {
    rodExtension,
    rodStrokeWidth,
  };
}

export function getMaxRodExtension(rows: Record<TableRowKey, Pick<TableRowConfig, 'rodLength' | 'rodDiameter'>>, fieldWidthCm: number, viewFieldHeight: number) {
  return Math.max(...Object.values(rows).map((row) => getRodGeometry(row, fieldWidthCm, viewFieldHeight).rodExtension), 0);
}

export function buildRodMotionBounds(rodId: RodId) {
  const rowKey = getRodRowKey(rodId);
  const row = boardConfig.settings?.configuration.rows[rowKey] ?? defaultTableDraft.rows[rowKey];
  const fieldWidthCm = boardConfig.settings?.field.widthCm ?? defaultTableDraft.fieldWidth;
  const spacingUnits = (row.spacing / Math.max(fieldWidthCm, 1)) * boardConfig.fieldHeight;
  const figureOffsets = buildCenteredOffsets(row.playerCount, spacingUnits);
  const maxFigureOffset = Math.max(...figureOffsets.map((offset) => Math.abs(offset)), 0);
  const outerStopUnits = Math.min((row.outerStop / Math.max(fieldWidthCm, 1)) * boardConfig.fieldHeight, boardConfig.fieldHeight / 2);
  const figureRadiusUnits = boardConfig.figureRadius;

  return {
    minY: boardConfig.fieldY + outerStopUnits + figureRadiusUnits + maxFigureOffset,
    maxY: boardConfig.fieldY + boardConfig.fieldHeight - outerStopUnits - figureRadiusUnits - maxFigureOffset,
  };
}
