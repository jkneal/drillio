import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Music } from 'lucide-react';
import { performerData } from '../data/performerData';
import { rehearsalMarks } from '../data/rehearsalMarks';
import { musicConfig } from '../data/musicConfig';
import { movementsConfig } from '../data/movementsConfig';

const MusicReviewPage = () => {
  const { movement } = useParams();
  const navigate = useNavigate();
  const [selectedPerformerId, setSelectedPerformerId] = useState(null);

  // Get the selected performer from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('drillBookPerformer');
    if (saved && performerData[saved]) {
      setSelectedPerformerId(saved);
    } else {
      // If no performer selected, redirect to home
      navigate('/');
    }
  }, [navigate]);

  // Get all sets for the movement
  const getSetsForMovement = () => {
    if (!performerData[selectedPerformerId]?.movements?.[movement]) {
      return [];
    }
    return performerData[selectedPerformerId].movements[movement];
  };

  // Check if music is available for a specific set
  const getMusicAvailability = (setNumber) => {
    if (!movement || !musicConfig[movement]) return false;
    
    let prefix = 'Staff';
    if (selectedPerformerId.startsWith('SD')) {
      prefix = 'SD';
    } else if (selectedPerformerId.startsWith('TD')) {
      prefix = 'TD';
    } else if (selectedPerformerId.startsWith('BD')) {
      prefix = 'BD';
    }
    
    return musicConfig[movement]?.[prefix]?.[String(setNumber)] || false;
  };

  // Get music image path
  const getMusicImagePath = (setNumber) => {
    let prefix = 'Staff';
    if (selectedPerformerId.startsWith('SD')) {
      prefix = 'SD';
    } else if (selectedPerformerId.startsWith('TD')) {
      prefix = 'TD';
    } else if (selectedPerformerId.startsWith('BD')) {
      prefix = 'BD';
    }
    
    return `/music/${prefix}${movement}-${setNumber}.png`;
  };

  // Early return if no performer selected
  if (!selectedPerformerId || !performerData[selectedPerformerId]) {
    return null;
  }

  const sets = getSetsForMovement();
  const currentPerformer = performerData[selectedPerformerId];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/movements`)}
            className="flex items-center text-white/80 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Movements
          </button>
          
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 backdrop-blur-sm rounded-lg p-4 mb-4">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center mb-2">
              <Music className="w-6 h-6 mr-2" />
              Music Review
            </h1>
            <h2 className="text-lg text-purple-300 text-center">
              {movementsConfig[movement]?.displayName || `Movement ${movement}`}
            </h2>
          </div>
        </div>

        {/* Current Performer Display */}
        <div className="bg-red-700/20 border border-red-500/30 backdrop-blur-sm rounded-lg p-3 mb-6">
          <p className="text-white">
            Performer: <span className="font-bold">{currentPerformer.name}</span>
          </p>
        </div>

        {/* Sets List */}
        <div className="space-y-4">
          {sets.length === 0 ? (
            <div className="bg-red-700/20 border border-red-500/30 backdrop-blur-sm rounded-lg p-8 text-center">
              <p className="text-white/60">No sets found for this movement.</p>
            </div>
          ) : (
            sets.map((set) => {
              const hasMusic = getMusicAvailability(set.set);
              const rehearsalMark = rehearsalMarks[movement]?.[String(set.set)];
              
              return (
                <div key={set.set} className="bg-red-700/20 border border-red-500/30 backdrop-blur-sm rounded-lg p-6 hover:bg-red-700/25 transition-all duration-200">
                  {/* Set Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <h3 className="text-xl font-semibold text-white">
                        Set {set.set}
                      </h3>
                      {rehearsalMark && (
                        <span className="ml-3 px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-purple-300 text-sm font-bold">
                          {rehearsalMark}
                        </span>
                      )}
                    </div>
                    {set.counts && (
                      <span className="text-white/60 text-sm">
                        {set.counts} counts
                      </span>
                    )}
                  </div>

                  {/* Tip */}
                  {set.tip ? (
                    <div className="mb-4 text-yellow-300 flex items-start">
                      <span className="mr-2">💡</span>
                      <span>{set.tip}</span>
                    </div>
                  ) : (
                    <div className="mb-4 text-white/40 text-sm">
                      No tip available
                    </div>
                  )}

                  {/* Music Image or Rest */}
                  <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                    {hasMusic ? (
                      <img
                        src={getMusicImagePath(set.set)}
                        alt={`Music for Set ${set.set}`}
                        className="w-full max-w-2xl mx-auto rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.parentElement.innerHTML = `
                            <div class="text-center py-8">
                              <p class="text-white/60">Failed to load music image</p>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="text-center py-12 bg-gray-800/30 rounded-lg">
                        <div className="text-white/40 text-6xl mb-2">𝄽</div>
                        <p className="text-white/60 text-lg">Rest</p>
                        <p className="text-white/40 text-sm mt-2">No music during this set</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicReviewPage;