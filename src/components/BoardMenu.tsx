import { ActionIcon, Menu } from '@mantine/core';
import { Check, Settings2, TableProperties } from 'lucide-react';

type BoardMenuProps = {
  selectedTable: string;
  onOpenConfig: () => void;
};

export function BoardMenu({ selectedTable, onOpenConfig }: BoardMenuProps) {
  return (
    <div className="foosboard-header-bar">
      <Menu shadow="md" width={220} withinPortal={false} trigger="click" keepMounted>
        <Menu.Target>
          <ActionIcon variant="default" size="lg" aria-label="Tischauswahl öffnen">
            <TableProperties size={18} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Tisch auswählen</Menu.Label>
          <Menu.Item leftSection={<Check size={14} />}>
            {selectedTable}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<Settings2 size={14} />} onClick={onOpenConfig}>
            Tische konfigurieren
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
