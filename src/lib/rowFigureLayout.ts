import type { TableRowConfig } from './tableLayout';

export function buildCenteredOffsets(playerCount: number, spacingUnits: number): number[] {
  const safePlayerCount = Math.max(Math.floor(playerCount), 1);
  const centerOffset = (safePlayerCount - 1) * spacingUnits * 0.5;

  return Array.from({ length: safePlayerCount }, (_, index) => index * spacingUnits - centerOffset);
}

export function buildCenteredFigurePositionsCm(row: TableRowConfig, fieldWidthCm: number): number[] {
  const center = fieldWidthCm / 2;
  return buildCenteredOffsets(row.playerCount, row.spacing).map((offset) => center + offset);
}