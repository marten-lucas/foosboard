import { ActionIcon, Badge, Button, Divider, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { Trash2 } from 'lucide-react';
import { boardConfig, type RodConfig, type RodState, type SavedScene } from '../boardConfig';
import type { ToolMode } from '../store/boardStore';

type PositionPanelProps = {
  positions: SavedScene[];
  activePositionId: string | null;
  snapshotName: string;
  shareLink: string;
  rods: Record<RodConfig['id'], RodState>;
  activeTool: ToolMode;
  onSnapshotNameChange: (value: string) => void;
  onSavePosition: () => void;
  onShare: () => void;
  onSetActiveTool: (tool: ToolMode) => void;
  onCycleRodTilt: (rodId: RodConfig['id']) => void;
  onOpenPosition: (positionId: string) => void;
  onRemoveShot: (shotId: string) => void;
};

function getToolLabel(tool: ToolMode) {
  if (tool === 'shot') {
    return 'Schuss';
  }

  if (tool === 'pass') {
    return 'Pass';
  }

  return 'Ball';
}

function getShotKindLabel(kind: SavedScene['scene']['shots'][number]['kind']) {
  return kind === 'pass' ? 'Pass' : 'Schuss';
}

function getShotBadgeColor(kind: SavedScene['scene']['shots'][number]['kind']) {
  return kind === 'pass' ? 'blue' : 'orange';
}

export function PositionPanel({
  positions,
  activePositionId,
  snapshotName,
  shareLink,
  rods,
  activeTool,
  onSnapshotNameChange,
  onSavePosition,
  onShare,
  onSetActiveTool,
  onCycleRodTilt,
  onOpenPosition,
  onRemoveShot,
}: PositionPanelProps) {
  return (
    <Paper className="foosboard-sidebar" radius={0} p="md" withBorder={false}>
      <Stack gap="md" className="foosboard-sidebar__content">
        <Stack gap={2}>
          <Text fw={800} size="xl">
            Foosboard
          </Text>
          <Text size="sm" c="dimmed">
            Refaktorierte Taktiktafel für Tischfußball
          </Text>
          <Text size="xs" c="dimmed">
            Vorlage {boardConfig.width} x {boardConfig.height}
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text fw={700} size="lg">
            Positionen
          </Text>
          <Text size="sm" c="dimmed">
            Zuerst die Position speichern, darunter automatisch die Schüsse anlegen.
          </Text>
        </Stack>

        <Stack gap="xs">
          <TextInput
            label="Positionsname"
            value={snapshotName}
            onChange={(event) => onSnapshotNameChange(event.currentTarget.value)}
            placeholder="z. B. Abschluss rechts"
          />
          <Button onClick={onSavePosition} fullWidth>
            Position speichern
          </Button>
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text fw={600} size="sm">
            Werkzeug
          </Text>
          <Group grow>
            {(['move', 'shot', 'pass'] as ToolMode[]).map((tool) => (
              <Button
                key={tool}
                variant={activeTool === tool ? 'filled' : 'light'}
                onClick={() => onSetActiveTool(tool)}
              >
                {getToolLabel(tool)}
              </Button>
            ))}
          </Group>
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text fw={600} size="sm">
            Teilen
          </Text>
          <Group align="flex-end" grow>
            <Button onClick={onShare}>Share-Link erzeugen</Button>
            <TextInput value={shareLink} readOnly placeholder="Noch kein Link erzeugt" />
          </Group>
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text fw={600} size="sm">
            Stangen
          </Text>
          <Stack gap="xs">
            {boardConfig.rods.slice(0, 6).map((rod) => (
              <Paper key={rod.id} withBorder p="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {rod.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {rods[rod.id].tilt}
                    </Text>
                  </Stack>
                  <Button size="xs" variant="light" onClick={() => onCycleRodTilt(rod.id)}>
                    Kippen
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Stack>

        <Divider />

        <Stack gap="sm" className="foosboard-sidebar__positions">
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              Gespeicherte Positionen
            </Text>
            <Badge variant="light">{positions.length}</Badge>
          </Group>

          {positions.length ? (
            <Stack gap="sm">
              {positions.map((position) => {
                const isActive = position.id === activePositionId;

                return (
                  <Paper
                    key={position.id}
                    withBorder
                    p="sm"
                    className={`foosboard-position-card${isActive ? ' foosboard-position-card--active' : ''}`}
                  >
                    <Stack gap="xs">
                      <Group gap="xs" align="flex-start" wrap="nowrap">
                        <Button
                          variant={isActive ? 'filled' : 'light'}
                          color={isActive ? 'dark' : 'gray'}
                          fullWidth
                          justify="space-between"
                          onClick={() => onOpenPosition(position.id)}
                        >
                          <span>{position.name}</span>
                          {isActive ? <Badge variant="filled" color="dark">aktiv</Badge> : null}
                        </Button>
                      </Group>

                      <Text size="xs" c="dimmed">
                        {position.scene.shots.length} Schüsse
                      </Text>

                      <Stack gap={6} className="foosboard-position-card__shots">
                        {position.scene.shots.length ? (
                          position.scene.shots.map((shot) => (
                            <Group key={shot.id} justify="space-between" wrap="nowrap" gap="xs" className="foosboard-shot-entry">
                              <Group gap={8} wrap="nowrap">
                                <span className="foosboard-shot-entry__color" style={{ backgroundColor: shot.color }} aria-hidden="true" />
                                <Text size="sm">{shot.label}</Text>
                                <Badge size="xs" variant="light" color={getShotBadgeColor(shot.kind)}>
                                  {getShotKindLabel(shot.kind)}
                                </Badge>
                              </Group>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                aria-label={`${shot.label} löschen`}
                                onClick={() => onRemoveShot(shot.id)}
                              >
                                <Trash2 size={14} />
                              </ActionIcon>
                            </Group>
                          ))
                        ) : (
                          <Text size="xs" c="dimmed">
                            Noch keine Schüsse gespeichert.
                          </Text>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Paper withBorder p="sm" className="foosboard-position-card foosboard-position-card--empty">
              <Text size="sm" c="dimmed">
                Noch keine Position gespeichert. Sobald du eine Position speicherst, erscheinen die zugehörigen Schüsse hier darunter.
              </Text>
            </Paper>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
