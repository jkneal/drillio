import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovementSelectionPage from './pages/MovementSelectionPage';
import DrillPage from './pages/DrillPage';
import AboutPage from './pages/AboutPage';
import SlidePracticePage from './pages/SlidePracticePage';
import SlideTrackerCameraPage from './pages/SlideTrackerCameraPage';
import MusicReviewPage from './pages/MusicReviewPage';
import PWAPrompt from './components/PWAPrompt';
import NotificationManager from './components/NotificationManager';
import { notificationScheduler } from './utils/notificationScheduler';
import { APP_VERSION } from './version';
import './App.css';

function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check for version update
    const lastVersion = localStorage.getItem('drillioAppVersion');
    if (lastVersion && lastVersion !== APP_VERSION) {
      // Clear any stale caches on major update
      if (lastVersion.split('.')[0] !== APP_VERSION.split('.')[0]) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    }
    localStorage.setItem('drillioAppVersion', APP_VERSION);
    
    // Start the notification scheduler when app loads
    if ('Notification' in window && Notification.permission === 'granted') {
      notificationScheduler.start();
    }

    // Handle service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Listen for controller change
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Cleanup on unmount
    return () => {
      notificationScheduler.stop();
    };
  }, []);

  return (
    <Router>
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-auto md:max-w-md md:mx-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-lg text-center z-50">
          <p className="text-sm mb-2">
            A new version is available!
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                setUpdateAvailable(false);
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                }
              }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-semibold"
            >
              Update Now
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="px-3 py-1 bg-black/20 hover:bg-black/30 rounded text-sm"
            >
              Later
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movements" element={<MovementSelectionPage />} />
        <Route path="/drill/:movement" element={<DrillPage />} />
        <Route path="/music-review/:movement" element={<MusicReviewPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/slide-practice" element={<SlidePracticePage />} />
        <Route path="/slide-tracker" element={<SlideTrackerCameraPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PWAPrompt />
      <NotificationManager />
    </Router>
  );
}

export default App;