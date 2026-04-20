import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import { MantineProvider } from '@mantine/core';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);