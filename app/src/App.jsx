import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovementSelectionPage from './pages/MovementSelectionPage';
import DrillPage from './pages/DrillPage';
import AboutPage from './pages/AboutPage';
import SlidePracticePage from './pages/SlidePracticePage';
import PWAPrompt from './components/PWAPrompt';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movements" element={<MovementSelectionPage />} />
        <Route path="/drill/:movement" element={<DrillPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/slide-practice" element={<SlidePracticePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PWAPrompt />
    </Router>
  );
}

export default App;