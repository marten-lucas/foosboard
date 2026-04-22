import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['zustand', 'zustand/middleware', '@mantine/hooks', 'lucide-react', '@mantine/dropzone'],
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      provider: playwright({
        launch: { headless: false },
      }),
      instances: [
        {
          browser: 'chromium',
        },
      ],
    },
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    include: ['tests/FigureRodPreview.spec.tsx'],
  },
});
