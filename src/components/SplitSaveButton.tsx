import { ActionIcon, Button, Group } from '@mantine/core';
import { Download } from 'lucide-react';
import classes from './SplitSaveButton.module.css';

type SplitSaveButtonProps = {
  onSave: () => void;
  onDownloadJson: () => void;
};

export function SplitSaveButton({ onSave, onDownloadJson }: SplitSaveButtonProps) {
  return (
    <Group wrap="nowrap" gap={0}>
      <Button className={classes.button} onClick={onSave} data-testid="save-table-config">
        Speichern
      </Button>
      <ActionIcon
        variant="filled"
        size={36}
        className={classes.menuControl}
        aria-label="Download JSON"
        onClick={onDownloadJson}
        data-testid="download-json"
      >
        <Download size={16} />
      </ActionIcon>
    </Group>
  );
}
