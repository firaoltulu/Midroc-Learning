import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './app/providers';
import '@fontsource-variable/inter';
import './index.css';
import './shared/config/env';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>
);
