import { ColorInput, Tabs } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { type BallTokenState, type ShotLine } from '../boardConfig';
import {
  getShotTargetModeLabel,
  getShotTargetOptions,
  normalizeShotTargetSlot,
  resolveShotGoalSide,
  resolveShotTargetPoint,
  SHOT_STYLE_OPTIONS,
  type ShotSelection,
  type ShotStyle,
  type ShotTargetMode,
  type ShotTargetSlot,
} from '../lib/shotTargets';

type GoalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ShotContextMenuProps = {
  ball: BallTokenState;
  shots: ShotLine[];
  selectedShotId: string | null;
  activeShotColor: string;
  colorSwatches: string[];
  goals: {
    left: GoalRect;
    right: GoalRect;
  };
  bounds: GoalRect;
  fiveGoalPositions: boolean;
  hasShotForBall: boolean;
  onChangeTargetMode: (mode: ShotTargetMode) => void;
  onChangeShotColor: (color: string) => void;
  onCreateShot: (selection: ShotSelection) => void;
  onDeleteShot: () => void;
  onClose: () => void;
  onSelectShot: (shotId: string | null) => void;
};

function createTargetLabel(mode: ShotTargetMode, slot: ShotTargetSlot) {
  return getShotTargetOptions(mode).find((option) => option.value === slot)?.label ?? slot;
}

export function ShotContextMenu({
  ball,
  shots,
  selectedShotId,
  activeShotColor,
  colorSwatches,
  goals,
  bounds,
  fiveGoalPositions,
  hasShotForBall,
  onChangeTargetMode,
  onChangeShotColor,
  onCreateShot,
  onDeleteShot,
  onClose,
  onSelectShot,
}: ShotContextMenuProps) {
  const selectedShot = useMemo(() => shots.find((shot) => shot.id === selectedShotId) ?? null, [selectedShotId, shots]);
  const [draftShotStyle, setDraftShotStyle] = useState<ShotStyle>('straight');
  const [draftCollisionEnabled, setDraftCollisionEnabled] = useState(false);

  useEffect(() => {
    if (selectedShot) {
      setDraftShotStyle(selectedShot.shotStyle);
      setDraftCollisionEnabled(selectedShot.collisionEnabled);
      return;
    }

    setDraftShotStyle('straight');
    setDraftCollisionEnabled(false);
  }, [selectedShot?.id]);

  const targetMode: ShotTargetMode = selectedShot?.targetMode ?? (fiveGoalPositions ? 5 : 3);
  const targetGoalSide = resolveShotGoalSide(ball.x);
  const selectedColor = selectedShot?.color ?? activeShotColor;
  const selectedShotsForBall = shots.filter((shot) => shot.sourceBallId === ball.id);

  const handleTargetModeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    const nextMode = Number(value) as ShotTargetMode;
    onChangeTargetMode(nextMode);
  };

  const handleTargetClick = (targetSlot: ShotTargetSlot) => {
    const goal = goals[targetGoalSide];
    const normalizedSlot = normalizeShotTargetSlot(targetMode, targetSlot);
    const target = resolveShotTargetPoint(goal, targetGoalSide, targetMode, normalizedSlot);

    onCreateShot({
      target,
      targetGoalSide,
      targetMode,
      targetSlot: normalizedSlot,
      shotStyle: selectedShot ? selectedShot.shotStyle : draftShotStyle,
      collisionEnabled: selectedShot ? selectedShot.collisionEnabled : draftCollisionEnabled,
    });
  };

  const handleShotStyleClick = (shotStyle: ShotStyle) => {
    setDraftShotStyle(shotStyle);

    if (selectedShot) {
      onCreateShot({
        target: selectedShot.target,
        targetGoalSide: selectedShot.targetGoalSide,
        targetMode: selectedShot.targetMode,
        targetSlot: selectedShot.targetSlot,
        shotStyle,
        collisionEnabled: selectedShot.collisionEnabled,
      });
    }
  };

  const handleCollisionClick = (collisionEnabled: boolean) => {
    setDraftCollisionEnabled(collisionEnabled);

    if (selectedShot) {
      onCreateShot({
        target: selectedShot.target,
        targetGoalSide: selectedShot.targetGoalSide,
        targetMode: selectedShot.targetMode,
        targetSlot: selectedShot.targetSlot,
        shotStyle: selectedShot.shotStyle,
        collisionEnabled,
      });
    }
  };

  return (
    <aside
      className="foosboard-shot-menu"
      data-testid="shot-drawer"
      style={{ left: 0 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="foosboard-shot-menu__header">
        <div>
          <div className="foosboard-shot-menu__eyebrow">Schuss-Drawer</div>
          <div className="foosboard-shot-menu__title">{selectedShot ? 'Schuss bearbeiten' : 'Neuen Schuss anlegen'}</div>
          <div className="foosboard-shot-menu__subtitle">Automatisch auf das {targetGoalSide === 'left' ? 'linke' : 'rechte'} Tor</div>
        </div>
        <button type="button" className="foosboard-shot-menu__icon-button" aria-label="Drawer schließen" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="foosboard-shot-menu__section">
        <div className="foosboard-shot-menu__row foosboard-shot-menu__row--split">
          <button
            type="button"
            className={`foosboard-shot-menu__button foosboard-shot-menu__button--ghost${!selectedShot ? ' foosboard-shot-menu__button--active' : ''}`}
            onClick={() => onSelectShot(null)}
          >
            Neuer Schuss
          </button>
          <button
            type="button"
            className="foosboard-shot-menu__button foosboard-shot-menu__button--ghost"
            disabled={!selectedShot}
            onClick={onDeleteShot}
          >
            Schuss löschen
          </button>
        </div>
      </div>

      <div className="foosboard-shot-menu__section">
        <Tabs value={targetMode.toString()} onChange={handleTargetModeChange} keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="3">3 Torpositionen</Tabs.Tab>
            <Tabs.Tab value="5">5 Torpositionen</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="3" className="foosboard-shot-menu__tab-panel">
            <div className="foosboard-shot-menu__row foosboard-shot-menu__row--three">
              {getShotTargetOptions(3).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`foosboard-shot-menu__button foosboard-shot-menu__button--target${selectedShot?.targetSlot === option.value ? ' foosboard-shot-menu__button--active' : ''}`}
                  onClick={() => handleTargetClick(option.value)}
                  title={createTargetLabel(3, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="5" className="foosboard-shot-menu__tab-panel">
            <div className="foosboard-shot-menu__row foosboard-shot-menu__row--five">
              {getShotTargetOptions(5).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`foosboard-shot-menu__button foosboard-shot-menu__button--target${selectedShot?.targetSlot === option.value ? ' foosboard-shot-menu__button--active' : ''}`}
                  onClick={() => handleTargetClick(option.value)}
                  title={createTargetLabel(5, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>

      <div className="foosboard-shot-menu__section">
        <div className="foosboard-shot-menu__label">Schussart</div>
        <div className="foosboard-shot-menu__stack">
          {SHOT_STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`foosboard-shot-menu__button foosboard-shot-menu__button--wide${draftShotStyle === option.value ? ' foosboard-shot-menu__button--active' : ''}`}
              aria-pressed={draftShotStyle === option.value}
              onClick={() => handleShotStyleClick(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="foosboard-shot-menu__section">
        <div className="foosboard-shot-menu__label">Kollision</div>
        <div className="foosboard-shot-menu__row foosboard-shot-menu__row--two">
          <button
            type="button"
            className={`foosboard-shot-menu__button${draftCollisionEnabled ? ' foosboard-shot-menu__button--active' : ''}`}
            aria-pressed={draftCollisionEnabled}
            onClick={() => handleCollisionClick(true)}
          >
            An
          </button>
          <button
            type="button"
            className={`foosboard-shot-menu__button${!draftCollisionEnabled ? ' foosboard-shot-menu__button--active' : ''}`}
            aria-pressed={!draftCollisionEnabled}
            onClick={() => handleCollisionClick(false)}
          >
            Aus
          </button>
        </div>
      </div>

      <div className="foosboard-shot-menu__section foosboard-shot-menu__section--shots">
        <div className="foosboard-shot-menu__label">Schusslinien</div>
        <div className="foosboard-shot-menu__list" role="list">
          {selectedShotsForBall.length > 0 ? (
            selectedShotsForBall.map((shot) => (
              <button
                key={shot.id}
                type="button"
                className={`foosboard-shot-menu__shot-item${selectedShot?.id === shot.id ? ' foosboard-shot-menu__shot-item--active' : ''}`}
                onClick={() => onSelectShot(shot.id)}
              >
                <span className="foosboard-shot-menu__shot-item-label">{shot.label}</span>
                <span className="foosboard-shot-menu__shot-item-meta">
                  {getShotTargetModeLabel(shot.targetMode)} · {createTargetLabel(shot.targetMode, shot.targetSlot)}
                </span>
              </button>
            ))
          ) : (
            <div className="foosboard-shot-menu__empty">Noch keine Schusslinie angelegt.</div>
          )}
        </div>
        <button
          type="button"
          className="foosboard-shot-menu__button foosboard-shot-menu__button--ghost foosboard-shot-menu__button--full"
          disabled={!hasShotForBall}
          onClick={onDeleteShot}
        >
          Ausgewählten Schuss löschen
        </button>
      </div>

      <div className="foosboard-shot-menu__section foosboard-shot-menu__section--color">
        <div className="foosboard-shot-menu__label">Farbe</div>
        <ColorInput
          className="foosboard-shot-menu__color-input"
          value={selectedColor}
          onChange={onChangeShotColor}
          format="hex"
          size="xs"
          swatches={colorSwatches}
          withPicker={false}
          disallowInput
          withEyeDropper={false}
          closeOnColorSwatchClick
        />
      </div>
    </aside>
  );
}
