import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {applyPrefs, loadPrefs} from './a11y';
import '@fontsource-variable/fredoka/wght.css';
import '@fontsource-variable/rubik/wght.css';
import './index.css';

// Apply saved accessibility settings before the first paint, so the page
// never flashes in its default look for someone who needs a different one.
applyPrefs(loadPrefs());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
