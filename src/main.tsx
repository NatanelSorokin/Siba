import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {applyPrefs, loadPrefs} from './a11y';
import {CartProvider} from './cart';
import {ContentProvider} from './content/store';
import '@fontsource-variable/fredoka/wght.css';
import '@fontsource-variable/rubik/wght.css';
import './index.css';

// Apply saved accessibility settings before the first paint, so the page
// never flashes in its default look for someone who needs a different one.
applyPrefs(loadPrefs());

// Drafts used to be kept in the browser; they live on the server now.
try {
  localStorage.removeItem('site-content-draft-v1');
} catch {
  /* storage unavailable */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContentProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </ContentProvider>
  </StrictMode>,
);
