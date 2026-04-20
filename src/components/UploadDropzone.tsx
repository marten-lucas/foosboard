import { Group, Paper, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { Upload } from 'lucide-react';
import type { ReactNode } from 'react';

type UploadDropzoneProps = {
  label: string;
  preview?: string;
  onDrop: (files: File[]) => void;
  fillHeight?: boolean;
  showPreview?: boolean;
  testId?: string;
  placeholder?: ReactNode;
};

export function UploadDropzone({
  label,
  preview,
  onDrop,
  fillHeight = false,
  showPreview = true,
  testId,
  placeholder,
}: UploadDropzoneProps) {
  return (
    <Stack gap="xs" className={fillHeight ? 'foosboard-upload-stack--fill' : undefined} data-testid={testId}>
      <Dropzone className="foosboard-dropzone" onDrop={onDrop} onReject={() => {}} multiple={false} accept={['image/svg+xml']}>
        <Group justify="center" gap="xs" mih={56}>
          <Upload size={16} />
          <Text size="sm">{label}</Text>
        </Group>
      </Dropzone>
      {showPreview ? (
        <Paper withBorder p="md" className={fillHeight ? 'foosboard-preview-card foosboard-preview-card--fill' : 'foosboard-preview-card'}>
          {preview ? (
            <div className={fillHeight ? 'foosboard-svg-preview foosboard-svg-preview--fill' : 'foosboard-svg-preview'} dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <div className={fillHeight ? 'foosboard-svg-preview foosboard-svg-preview--fill' : 'foosboard-svg-preview'}>
              {placeholder || (
                <Text size="sm" c="dimmed">
                  Preview
                </Text>
              )}
            </div>
          )}
        </Paper>
      ) : null}
    </Stack>
  );
}
