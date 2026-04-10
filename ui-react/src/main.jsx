/** @file main.jsx
*  @description Vite entry point that bootstraps the React app with lazy-loaded routes, a service worker, and a connection monitor for offline resilience.
*/
import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { getConnectionMonitor } from './utils/connection-monitor';
import ConnectionStatus from './components/global/ConnectionStatus';

// Suppress console.log and console.warn in production builds to reduce
// memory pressure on long-running display clients (kiosk mode).
// console.error is preserved so real errors remain visible.
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.debug = noop;
  console.info = noop;
}

// Eager loading for frequently used components
import FlightboardLayout from './layouts/FlightboardLayout';
import SingleRoomLayout from './layouts/SingleRoomLayout';
import NotFound from './components/global/NotFound';

// Lazy loading for less frequently used components
const WiFiInfoLayout = lazy(() => import('./layouts/WiFiInfoLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.5rem',
    color: '#666'
  }}>
    Loading...
  </div>
);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[ServiceWorker] Registered successfully:', registration.scope);
        
        // When a new SW is found, tell it to activate immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[ServiceWorker] New version activated');
              }
            });
          }
        });

        // Check for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Registration failed:', error);
      });
  });
}

// App wrapper component to initialize connection monitor
const App = () => {
  useEffect(() => {
    // Initialize connection monitor
    getConnectionMonitor({
      checkInterval: 5000,
      maxRetries: 60
    });
  }, []);

  return (
    <>
      <ConnectionStatus />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<FlightboardLayout />} />
          <Route path="/single-room/:name" element={<SingleRoomLayout />} />
          <Route path="/room-minimal/:name" element={<SingleRoomLayout />} />
          <Route path="/wifi-info" element={<WiFiInfoLayout />} />
          <Route path="/admin" element={<AdminLayout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const container = document.getElementById('app');
const root = createRoot(container);

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
