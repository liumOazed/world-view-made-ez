import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Type system: EB Garamond for display and figures, a geometric sans
// (Century Gothic where installed, Poppins otherwise) for the interface.
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import '@fontsource/poppins/latin-300.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import './effects';
import './styles.css';
import './map.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
