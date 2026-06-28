import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import './styles/tokens.css';
import './styles/layout.css';
import './styles/kpi.css';
import './styles/toolbar.css';
import './styles/grid.css';
import './styles/inspector.css';
import './styles/alerts.css';
import './styles/footer.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);