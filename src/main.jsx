import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA: Registro o limpieza de Service Worker
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => console.log('[PWA] Service Worker registrado en scope:', registration.scope))
        .catch((error) => console.warn('[PWA] Registro falló:', error));
    });
  } else {
    // En desarrollo, desregistramos activamente cualquier SW para evitar caché obsoleta (pantalla en blanco)
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
        console.log('[PWA] Service Worker desregistrado en entorno de desarrollo.');
      }
    });
  }
}
