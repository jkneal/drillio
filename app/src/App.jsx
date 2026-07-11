import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovementSelectionPage from './pages/MovementSelectionPage';
import DrillPage from './pages/DrillPage';
import AboutPage from './pages/AboutPage';
import LearningDrillPage from './pages/LearningDrillPage';
import CoordinatePracticePage from './pages/CoordinatePracticePage';
import MusicReviewPage from './pages/MusicReviewPage';
import PWAPrompt from './components/PWAPrompt';
import { APP_VERSION } from './version';
import './App.css';

function App() {
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
    
    // Handle service worker updates
    if ('serviceWorker' in navigator) {
      // Use a timeout to prevent blocking if service worker isn't ready
      const serviceWorkerPromise = navigator.serviceWorker.ready;
      
      // Set a timeout for service worker operations
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.log('Service worker initialization timed out, continuing anyway');
          resolve(null);
        }, 5000); // 5 second timeout
      });
      
      Promise.race([serviceWorkerPromise, timeoutPromise]).then(registration => {
        if (!registration) {
          console.log('Service worker not available, app will run without offline support');
          return;
        }
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update().catch(err => {
            console.log('Service worker update check failed:', err);
          });
        }, 60000);

      }).catch(err => {
        console.error('Service worker initialization failed:', err);
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

  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movements" element={<MovementSelectionPage />} />
        <Route path="/drill/:movement" element={<DrillPage />} />
        <Route path="/music-review/:movement" element={<MusicReviewPage />} />
        <Route path="/learning-drill" element={<LearningDrillPage />} />
        <Route path="/coordinate-practice" element={<CoordinatePracticePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PWAPrompt />
    </Router>
  );
}

export default App;
