import type { Dispatch, SetStateAction } from 'react';
import { Button, ColorInput, Divider, Drawer, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Stepper, Text, TextInput } from '@mantine/core';
import { FigureRodPreview } from './FigureRodPreview';
import { SplitSaveButton } from './SplitSaveButton';
import { TablePreviewCanvas } from './TablePreviewCanvas';
import { UploadDropzone } from './UploadDropzone';
import type { TableDraft, TableRowKey } from '../lib/tableLayout';

type TableConfigFormProps = {
  opened: boolean;
  onClose: () => void;
  isMobile: boolean;
  configStep: number;
  setConfigStep: Dispatch<SetStateAction<number>>;
  tableDraft: TableDraft;
  setTableDraft: Dispatch<SetStateAction<TableDraft>>;
  updateRowConfig: (row: TableRowKey, field: 'position' | 'playerCount' | 'spacing' | 'outerStop', value: string | number) => void;
  handleSvgDrop: (key: string) => (files: File[]) => void;
  svgPreviews: Record<string, string>;
  hasFieldUpload: boolean;
  fieldPreviewWidth: number;
  fieldPreviewHeight: number;
  rodPreviewWidth: number;
  rodPreviewHeight: number;
  previewFieldX: number;
  fieldPreviewY: number;
  rodPreviewFieldY: number;
  previewFieldWidth: number;
  previewFieldHeight: number;
  rodExtension: number;
  frameThickness: number;
  gripThickness: number;
  gripLength: number;
  colorSwatches: string[];
  figureLayerOptions: string[];
  getGeometryOptionsForLayer: (layerName: string) => string[];
  getLayerPreview: (layerName: string) => string;
  previewFigureMarkup: string;
  previewFigureBounds: { width: number; height: number };
  previewFigureAnchor: { x: number; y: number };
  onSave: () => void;
  onDownloadJson: () => void;
};

export function TableConfigForm({
  opened,
  onClose,
  isMobile,
  configStep,
  setConfigStep,
  tableDraft,
  setTableDraft,
  updateRowConfig,
  handleSvgDrop,
  svgPreviews,
  hasFieldUpload,
  fieldPreviewWidth,
  fieldPreviewHeight,
  rodPreviewWidth,
  rodPreviewHeight,
  previewFieldX,
  fieldPreviewY,
  rodPreviewFieldY,
  previewFieldWidth,
  previewFieldHeight,
  rodExtension,
  frameThickness,
  gripThickness,
  gripLength,
  colorSwatches,
  figureLayerOptions,
  getGeometryOptionsForLayer,
  getLayerPreview,
  previewFigureMarkup,
  previewFigureBounds,
  previewFigureAnchor,
  onSave,
  onDownloadJson,
}: TableConfigFormProps) {
  const goalHeight = (tableDraft.goalWidth / Math.max(tableDraft.fieldWidth, 1)) * previewFieldHeight;
  const goalY = fieldPreviewY + (previewFieldHeight - goalHeight) / 2;
  const goalDepth = Math.max(frameThickness / 2, 1);

  return (
    <Drawer opened={opened} onClose={onClose} title="Tischkonfiguration" position="right" size={isMobile ? '100%' : '72%'}>
      <Stack gap="md" className="foosboard-config-drawer-content">
        <Stepper active={configStep} onStepClick={setConfigStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
          <Stepper.Step label="Stammdaten" description="Allgemein & Spielfeld">
            <Stack mt="md" gap="lg" className="foosboard-step-fill">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Hersteller" value={tableDraft.manufacturer} onChange={(event) => setTableDraft((current) => ({ ...current, manufacturer: event.currentTarget.value }))} />
                <TextInput label="Name" value={tableDraft.name} onChange={(event) => setTableDraft((current) => ({ ...current, name: event.currentTarget.value }))} />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
                <NumberInput label="Spielfeldlänge (innen)" suffix=" cm" value={tableDraft.fieldLength} onChange={(value) => setTableDraft((current) => ({ ...current, fieldLength: Number(value) || 0 }))} />
                <NumberInput label="Spielfeldbreite (innen)" suffix=" cm" value={tableDraft.fieldWidth} onChange={(value) => setTableDraft((current) => ({ ...current, fieldWidth: Number(value) || 0 }))} />
                <NumberInput label="Torbreite" suffix=" cm" value={tableDraft.goalWidth} onChange={(value) => setTableDraft((current) => ({ ...current, goalWidth: Number(value) || 0 }))} />
                <NumberInput label="Stangenlänge" aria-label="Stangenlänge" suffix=" cm" value={tableDraft.rodLength} onChange={(value) => setTableDraft((current) => ({ ...current, rodLength: Number(value) || 0 }))} />
                <NumberInput label="Stangendurchmesser" aria-label="Stangendurchmesser" suffix=" cm" value={tableDraft.rodDiameter} onChange={(value) => setTableDraft((current) => ({ ...current, rodDiameter: Number(value) || 0 }))} />
              </SimpleGrid>

              <Stack gap="xs" className="foosboard-upload-stack--fill">
                <UploadDropzone label="Upload Spielfeld" onDrop={handleSvgDrop('field')} showPreview={false} testId="field-upload" />
                <Paper withBorder p="md" className="foosboard-preview-card foosboard-preview-card--fill">
                  <div className="foosboard-table-overlay-preview" data-testid="field-preview-canvas" style={{ aspectRatio: `${fieldPreviewWidth} / ${fieldPreviewHeight}` }}>
                    <svg viewBox={`0 0 ${fieldPreviewWidth} ${fieldPreviewHeight}`} className="foosboard-table-preview" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
                      <rect x="0" y="0" width={fieldPreviewWidth} height={fieldPreviewHeight} rx="2" fill="#d9d9d9" />
                      {!hasFieldUpload ? <rect x={previewFieldX} y={fieldPreviewY} width={previewFieldWidth} height={previewFieldHeight} fill="#69db7c" /> : null}
                      <rect x={previewFieldX - goalDepth} y={goalY} width={goalDepth} height={goalHeight} fill="#ffffff" />
                      <rect x={previewFieldX + previewFieldWidth} y={goalY} width={goalDepth} height={goalHeight} fill="#ffffff" />
                    </svg>
                    <div
                      className="foosboard-preview-field-window"
                      data-testid="field-preview-window"
                      style={{
                        left: `${(previewFieldX / fieldPreviewWidth) * 100}%`,
                        top: `${(fieldPreviewY / fieldPreviewHeight) * 100}%`,
                        width: `${(previewFieldWidth / fieldPreviewWidth) * 100}%`,
                        height: `${(previewFieldHeight / fieldPreviewHeight) * 100}%`,
                        background: hasFieldUpload ? 'transparent' : '#69db7c',
                      }}
                    >
                      {svgPreviews.field ? <div className="foosboard-svg-preview foosboard-svg-preview--fill foosboard-svg-preview--fit-width" dangerouslySetInnerHTML={{ __html: svgPreviews.field }} /> : null}
                    </div>
                    <svg viewBox={`0 0 ${fieldPreviewWidth} ${fieldPreviewHeight}`} className="foosboard-table-preview foosboard-table-preview--overlay" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
                      <rect data-testid="field-preview-frame" x={previewFieldX} y={fieldPreviewY} width={previewFieldWidth} height={previewFieldHeight} fill="none" stroke="#111" strokeWidth={frameThickness} />
                    </svg>
                  </div>
                </Paper>
              </Stack>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Konfiguration" description="Reihen">
            <Stack mt="md" gap="xs" className="foosboard-step-fill">
              <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
                {[
                  { key: 'goalkeeper', label: 'Torwart' },
                  { key: 'defense', label: 'Abwehr' },
                  { key: 'midfield', label: 'Mitte' },
                  { key: 'offense', label: 'Sturm' },
                ].map((row) => (
                  <Paper key={row.key} withBorder p="sm">
                    <Stack gap="xs">
                      <Text fw={600}>{row.label}</Text>
                      <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                        <NumberInput label="Position" suffix=" cm" value={tableDraft.rows[row.key as TableRowKey].position} onChange={(value) => updateRowConfig(row.key as TableRowKey, 'position', value)} />
                        <NumberInput label="Anzahl Puppen" value={tableDraft.rows[row.key as TableRowKey].playerCount} onChange={(value) => updateRowConfig(row.key as TableRowKey, 'playerCount', value)} />
                        <NumberInput label="Puppenabstand" suffix=" cm" value={tableDraft.rows[row.key as TableRowKey].spacing} onChange={(value) => updateRowConfig(row.key as TableRowKey, 'spacing', value)} />
                        <NumberInput label="Anschlag außen" suffix=" cm" value={tableDraft.rows[row.key as TableRowKey].outerStop} onChange={(value) => updateRowConfig(row.key as TableRowKey, 'outerStop', value)} />
                      </SimpleGrid>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>

              <Paper withBorder p="xs" className="foosboard-preview-card foosboard-preview-card--large">
                <TablePreviewCanvas
                  testId="rod-preview-canvas"
                  ariaLabel="Stangenvorschau"
                  fieldSvg={svgPreviews.field}
                  hasFieldUpload={hasFieldUpload}
                  fieldPreviewWidth={rodPreviewWidth}
                  fieldPreviewHeight={rodPreviewHeight}
                  previewFieldX={previewFieldX}
                  previewFieldY={rodPreviewFieldY}
                  previewFieldWidth={previewFieldWidth}
                  previewFieldHeight={previewFieldHeight}
                  rodExtension={rodExtension}
                  frameThickness={frameThickness}
                  gripThickness={gripThickness}
                  gripLength={gripLength}
                  rodDiameter={tableDraft.rodDiameter}
                  rows={tableDraft.rows}
                  fieldLengthCm={tableDraft.fieldLength}
                  fieldWidthCm={tableDraft.fieldWidth}
                  goalWidthCm={tableDraft.goalWidth}
                  playerOneColor={tableDraft.playerOneColor}
                  playerTwoColor={tableDraft.playerTwoColor}
                  figureWidthCm={tableDraft.figureWidth}
                  ballSizeCm={tableDraft.ballSize}
                  ballColor={tableDraft.ballColor}
                  useConfiguredFigurePreview={Boolean(previewFigureMarkup)}
                  bottomFigurePreview={previewFigureMarkup}
                  figurePreviewBounds={previewFigureBounds}
                  figureAnchor={previewFigureAnchor}
                />
              </Paper>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Puppen & Ball" description="Layer und Ball">
            <Stack mt="md" gap="md" className="foosboard-step-fill">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
                <NumberInput label="Breite der Puppe" suffix=" cm" value={tableDraft.figureWidth} onChange={(value) => setTableDraft((current) => ({ ...current, figureWidth: Number(value) || 0 }))} />
                <ColorInput label="Farbe Spieler 1" format="hex" swatches={colorSwatches} value={tableDraft.playerOneColor} onChange={(value) => setTableDraft((current) => ({ ...current, playerOneColor: value }))} />
                <ColorInput label="Farbe Spieler 2" format="hex" swatches={colorSwatches} value={tableDraft.playerTwoColor} onChange={(value) => setTableDraft((current) => ({ ...current, playerTwoColor: value }))} />
                <NumberInput label="Ballgröße" suffix=" cm" value={tableDraft.ballSize} onChange={(value) => setTableDraft((current) => ({ ...current, ballSize: Number(value) || 0 }))} />
                <ColorInput label="Ballfarbe" format="hex" swatches={colorSwatches} value={tableDraft.ballColor} onChange={(value) => setTableDraft((current) => ({ ...current, ballColor: value }))} />
              </SimpleGrid>

              <UploadDropzone label="Upload Figuren-SVG" preview={svgPreviews.figureSource} onDrop={handleSvgDrop('figureSource')} showPreview={false} testId="figure-upload" />

              <SimpleGrid cols={{ base: 1, md: 4 }}>
                {[
                  {
                    id: 'bottom',
                    label: 'Puppe unten',
                    layerValue: tableDraft.figureLayerBottom,
                    anchorValue: tableDraft.bottomAnchorGroup,
                    collisionValue: tableDraft.bottomCollisionGroup,
                    setLayer: (value: string) => setTableDraft((current) => ({ ...current, figureLayerBottom: value })),
                    setAnchor: (value: string) => setTableDraft((current) => ({ ...current, bottomAnchorGroup: value })),
                    setCollision: (value: string) => setTableDraft((current) => ({ ...current, bottomCollisionGroup: value })),
                  },
                  {
                    id: 'forward',
                    label: 'Puppe nach vorn',
                    layerValue: tableDraft.figureLayerForward,
                    anchorValue: tableDraft.forwardAnchorGroup,
                    collisionValue: tableDraft.forwardCollisionGroup,
                    setLayer: (value: string) => setTableDraft((current) => ({ ...current, figureLayerForward: value })),
                    setAnchor: (value: string) => setTableDraft((current) => ({ ...current, forwardAnchorGroup: value })),
                    setCollision: (value: string) => setTableDraft((current) => ({ ...current, forwardCollisionGroup: value })),
                  },
                  {
                    id: 'backward',
                    label: 'Puppe nach hinten',
                    layerValue: tableDraft.figureLayerBackward,
                    anchorValue: tableDraft.backwardAnchorGroup,
                    collisionValue: tableDraft.backwardCollisionGroup,
                    setLayer: (value: string) => setTableDraft((current) => ({ ...current, figureLayerBackward: value })),
                    setAnchor: (value: string) => setTableDraft((current) => ({ ...current, backwardAnchorGroup: value })),
                    setCollision: (value: string) => setTableDraft((current) => ({ ...current, backwardCollisionGroup: value })),
                  },
                ].map((position) => {
                  const geometryOptions = getGeometryOptionsForLayer(position.layerValue);
                  const preview = getLayerPreview(position.layerValue);

                  return (
                    <Paper key={position.label} withBorder p="md" data-testid={`figure-column-${position.id}`}>
                      <Stack gap="sm">
                        <Text fw={600}>{position.label}</Text>
                        <Select label="Layer" data={figureLayerOptions} value={position.layerValue} onChange={(value) => position.setLayer(value || '')} />
                        <Paper withBorder p="xs" className="foosboard-preview-card" data-testid={`figure-preview-${position.id}`}>
                          {preview ? (
                            <div className="foosboard-svg-preview" dangerouslySetInnerHTML={{ __html: preview }} />
                          ) : (
                            <div className="foosboard-svg-preview">
                              <Text size="sm" c="dimmed">Preview</Text>
                            </div>
                          )}
                        </Paper>
                        <Select label="Verbindungsgruppe" data={geometryOptions} value={position.anchorValue} onChange={(value) => position.setAnchor(value || '')} />
                        <Select label="Kollisionsgruppe" data={geometryOptions} value={position.collisionValue} onChange={(value) => position.setCollision(value || '')} />
                      </Stack>
                    </Paper>
                  );
                })}
                <Paper withBorder p="xs" className="foosboard-preview-card" data-testid="figure-rod-preview-card">
                  <FigureRodPreview
                    testId="figure-rod-preview-canvas"
                    figureMarkup={previewFigureMarkup}
                    figureBounds={previewFigureBounds}
                    figureAnchor={previewFigureAnchor}
                    figureColor={tableDraft.playerOneColor}
                    ballColor={tableDraft.ballColor}
                    figureWidthCm={tableDraft.figureWidth}
                    ballSizeCm={tableDraft.ballSize}
                    fieldWidthCm={tableDraft.fieldWidth}
                  />
                </Paper>
              </SimpleGrid>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Ergebnis" description="Preview & Bestätigung">
            <Stack mt="md" gap="md" className="foosboard-step-fill">
              <Paper withBorder p="md" className="foosboard-preview-card foosboard-preview-card--fill">
                <TablePreviewCanvas
                  testId="result-preview-canvas"
                  ariaLabel="Preview gerenderter Tisch"
                  fieldSvg={svgPreviews.field}
                  hasFieldUpload={hasFieldUpload}
                  fieldPreviewWidth={rodPreviewWidth}
                  fieldPreviewHeight={rodPreviewHeight}
                  previewFieldX={previewFieldX}
                  previewFieldY={rodPreviewFieldY}
                  previewFieldWidth={previewFieldWidth}
                  previewFieldHeight={previewFieldHeight}
                  rodExtension={rodExtension}
                  frameThickness={frameThickness}
                  gripThickness={gripThickness}
                  gripLength={gripLength}
                  rodDiameter={tableDraft.rodDiameter}
                  rows={tableDraft.rows}
                  fieldLengthCm={tableDraft.fieldLength}
                  fieldWidthCm={tableDraft.fieldWidth}
                  goalWidthCm={tableDraft.goalWidth}
                  playerOneColor={tableDraft.playerOneColor}
                  playerTwoColor={tableDraft.playerTwoColor}
                  figureWidthCm={tableDraft.figureWidth}
                  ballSizeCm={tableDraft.ballSize}
                  ballColor={tableDraft.ballColor}
                  includeBall
                  useConfiguredFigurePreview={Boolean(previewFigureMarkup)}
                  bottomFigurePreview={previewFigureMarkup}
                  figurePreviewBounds={previewFigureBounds}
                  figureAnchor={previewFigureAnchor}
                />
              </Paper>
            </Stack>
          </Stepper.Step>
        </Stepper>

        <div className="foosboard-config-footer">
          <Divider />
          <Group justify="space-between">
            <Button variant="default" onClick={() => setConfigStep((current) => Math.max(current - 1, 0))}>
              Zurück
            </Button>
            {configStep === 3 ? (
              <SplitSaveButton onSave={onSave} onDownloadJson={onDownloadJson} />
            ) : (
              <Button onClick={() => setConfigStep((current) => Math.min(current + 1, 3))}>
                Weiter
              </Button>
            )}
          </Group>
        </div>
      </Stack>
    </Drawer>
  );
}
