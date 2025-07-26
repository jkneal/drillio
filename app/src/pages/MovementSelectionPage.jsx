import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {Trophy, Play, X, Route, Music} from 'lucide-react';
import { performerData } from '../data/performerData';
import { movementsConfig } from '../data/movementsConfig';
import PathVisualizerModal from '../components/PathVisualizerModal';

const MovementSelectionPage = () => {
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [showMovementVideo, setShowMovementVideo] = useState(false);
  const [currentMovementVideo, setCurrentMovementVideo] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [showPathVisualizer, setShowPathVisualizer] = useState(false);
  const [currentMovementPath, setCurrentMovementPath] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedPerformer = localStorage.getItem('drillBookPerformer');
    if (savedPerformer && performerData[savedPerformer]) {
      setSelectedPerformer(savedPerformer);
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!selectedPerformer || !performerData[selectedPerformer]) {
    return null;
  }

  const currentPerformer = performerData[selectedPerformer];

  const handleMovementSelect = (movement) => {
    navigate(`/drill/${movement}`);
  };

  const handleChangePerformer = () => {
    localStorage.removeItem('drillBookPerformer');
    navigate('/');
  };

  const getMovementVideoPath = (movement) => {
    return `/video/${movement}.mp4`;
  };

  const handleMovementVideoClick = (movement) => {
    setCurrentMovementVideo(movement);
    setShowMovementVideo(true);
    setVideoError(false);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handlePathVisualizerClick = (movement) => {
    setCurrentMovementPath(movement);
    setShowPathVisualizer(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 pt-4">
          <div className="flex flex-col items-center">
            <img
                src="/HSlogo.png"
                alt="E Logo"
                className="w-8 h-5 mb-1"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
            />
            <div className="text-white text-center">
              <div>Edgewood 2025</div>
              <img 
                src="/transient.png" 
                alt="Transient" 
                className="h-10 mx-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Select Movement:</h2>
          <p className="text-white/60 text-sm mb-4">Tap a movement to view your drill sets</p>
          {Object.keys(currentPerformer.movements).map((movement) => {
            const hasSets = currentPerformer.movements[movement].length > 0;
            return (
              <div key={movement} className={`${hasSets ? 'bg-red-600/20 hover:bg-red-600/30' : 'bg-gray-600/20'} rounded-lg backdrop-blur-sm transition-all duration-200 border ${hasSets ? 'border-red-500/30' : 'border-gray-500/30'} overflow-hidden`}>
                <button
                  onClick={() => hasSets && handleMovementSelect(movement)}
                  className={`w-full text-white px-4 pt-4 ${hasSets ? 'pb-2' : 'pb-4'} text-left ${!hasSets && 'cursor-not-allowed opacity-50'}`}
                  disabled={!hasSets}
                >
                  <div className="font-semibold text-lg">{movementsConfig[movement]?.displayName || movement}</div>
                  <div className="text-sm opacity-80">
                    {currentPerformer.movements[movement].length} sets
                  </div>
                </button>
                {hasSets && (
                  <div className="flex items-center justify-end space-x-2 px-4 pb-4">
                    <button
                      onClick={() => handleMovementVideoClick(movement)}
                      className="flex items-center text-green-300 hover:text-green-200 text-sm transition-colors"
                      title="View movement animation"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      <span>Preview</span>
                    </button>
                    <span className="text-white/30">|</span>
                    <button
                      onClick={() => handlePathVisualizerClick(movement)}
                      className="flex items-center text-blue-300 hover:text-blue-200 text-sm transition-colors"
                      title="View movement path"
                    >
                      <Route className="w-4 h-4 mr-1" />
                      <span>Path</span>
                    </button>
                    <span className="text-white/30">|</span>
                    <button
                      onClick={() => navigate(`/music-review/${movement}`)}
                      className="flex items-center text-purple-300 hover:text-purple-200 text-sm transition-colors"
                      title="Review music for sets"
                    >
                      <Music className="w-4 h-4 mr-1" />
                      <span>Music</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="bg-black/40 border-2 border-white/40 rounded-lg p-3 backdrop-blur-sm shadow-lg">
            <p className="text-white text-lg" style={{"marginTop": "0.2rem", "marginBottom": "0.2rem"}}>
              Selected: <span className="font-bold">{currentPerformer.name}</span>
              {selectedPerformer !== 'Staff' && (
                <span> | Number: <span className="font-bold">{currentPerformer.number}</span></span>
              )}
            </p>
            <button
              onClick={handleChangePerformer}
              className="mt-1 text-sm text-red-300 hover:text-red-200 transition-colors"
            >
              Change performer
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="relative z-10">
            <div className="mb-4">
              <div className="w-full">
                <div className="flex items-center justify-center mb-2 w-full">
                  <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
                  <span className="text-yellow-200 font-semibold">State Champions</span>
                  <Trophy className="w-6 h-6 text-yellow-400 ml-2" />
                </div>
                <div className="text-sm text-red-200 text-center">2018 • 2022 • 2023 • 2024</div>
                <div className="text-xs text-red-300 mt-1 text-center">ISSMA Open Class C</div>
              </div>
            </div>
          </div>
        </div>

        {showMovementVideo && currentMovementVideo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-4xl max-h-full overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">
                  {movementsConfig[currentMovementVideo]?.displayName || currentMovementVideo} Animation
                </h3>
                <button
                  onClick={() => {
                    setShowMovementVideo(false);
                    setCurrentMovementVideo('');
                    setVideoError(false);
                  }}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="text-center">
                {!videoError ? (
                  <video
                    controls
                    className="max-w-full max-h-96 rounded"
                    onError={handleVideoError}
                  >
                    <source src={getMovementVideoPath(currentMovementVideo)} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
                    <Play className="w-12 h-12 text-red-300 mx-auto mb-4" />
                    <p className="text-white/80">
                      Animation not available
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      {getMovementVideoPath(currentMovementVideo)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <PathVisualizerModal
          show={showPathVisualizer}
          onClose={() => setShowPathVisualizer(false)}
          performerData={selectedPerformer === 'Staff' ? null : performerData[selectedPerformer]}
          movement={currentMovementPath}
          performerId={selectedPerformer === 'Staff' ? null : selectedPerformer}
          isStaffView={selectedPerformer === 'Staff'}
        />
      </div>
    </div>
  );
};

export default MovementSelectionPage;