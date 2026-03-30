import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/layout.css';
import './styles/canvas.css';
import './styles/modules.css';
import './styles/debug.css';
import './styles/dialogs.css';
import './styles/library.css';
import './styles/properties.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
