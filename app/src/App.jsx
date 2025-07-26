import { useEffect } from 'react';
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

    // Cleanup on unmount
    return () => {
      notificationScheduler.stop();
    };
  }, []);

  return (
    <Router>
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