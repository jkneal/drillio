import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Music, Expand, Trash2 } from 'lucide-react';
import { performerData } from '../data/performerData';
import { rehearsalMarks } from '../data/rehearsalMarks';
import { musicConfig } from '../data/musicConfig';
import { movementsConfig } from '../data/movementsConfig';
import MusicModal from '../components/MusicModal';

const MusicReviewPage = () => {
  const { movement } = useParams();
  const navigate = useNavigate();
  const [selectedPerformerId, setSelectedPerformerId] = useState(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [selectedSetNumber, setSelectedSetNumber] = useState(null);
  const [notesData, setNotesData] = useState({});
  const [highlightsData, setHighlightsData] = useState({});

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

  // Load notes and highlights for all sets when component mounts or performer changes
  useEffect(() => {
    if (!selectedPerformerId || !movement) return;
    
    const sets = performerData[selectedPerformerId]?.movements?.[movement] || [];
    const newNotesData = {};
    const newHighlightsData = {};
    
    sets.forEach(set => {
      const notesKey = `musicNotes_${movement}_${set.set}_${selectedPerformerId}`;
      const highlightsKey = `musicHighlights_${movement}_${set.set}_${selectedPerformerId}`;
      
      const savedNotes = localStorage.getItem(notesKey);
      const savedHighlights = localStorage.getItem(highlightsKey);
      
      if (savedNotes) {
        newNotesData[set.set] = JSON.parse(savedNotes);
      }
      if (savedHighlights) {
        newHighlightsData[set.set] = JSON.parse(savedHighlights);
      }
    });
    
    setNotesData(newNotesData);
    setHighlightsData(newHighlightsData);
  }, [selectedPerformerId, movement]);

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

  // Handle opening music modal
  const handleOpenModal = (setNumber) => {
    setSelectedSetNumber(setNumber);
    setShowMusicModal(true);
  };

  // Handle modal close and refresh data
  const handleCloseModal = () => {
    setShowMusicModal(false);
    setSelectedSetNumber(null);
    
    // Reload notes and highlights after modal closes
    if (!selectedPerformerId || !movement) return;
    
    const sets = performerData[selectedPerformerId]?.movements?.[movement] || [];
    const newNotesData = {};
    const newHighlightsData = {};
    
    sets.forEach(set => {
      const notesKey = `musicNotes_${movement}_${set.set}_${selectedPerformerId}`;
      const highlightsKey = `musicHighlights_${movement}_${set.set}_${selectedPerformerId}`;
      
      const savedNotes = localStorage.getItem(notesKey);
      const savedHighlights = localStorage.getItem(highlightsKey);
      
      if (savedNotes) {
        newNotesData[set.set] = JSON.parse(savedNotes);
      }
      if (savedHighlights) {
        newHighlightsData[set.set] = JSON.parse(savedHighlights);
      }
    });
    
    setNotesData(newNotesData);
    setHighlightsData(newHighlightsData);
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
                      <div className="text-center">
                        <div className="relative inline-block" style={{ verticalAlign: 'top' }}>
                          <img
                            src={getMusicImagePath(set.set)}
                            alt={`Music for Set ${set.set}`}
                            className="max-w-full max-h-96 object-contain rounded"
                            style={{ display: 'block', verticalAlign: 'top' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = `
                              <div class="text-center py-8">
                                <p class="text-white/60">Failed to load music image</p>
                              </div>
                            `;
                          }}
                        />
                          
                          {/* Expand button */}
                          <button
                            onClick={() => handleOpenModal(set.set)}
                            className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 border border-red-500/50 rounded-lg p-1.5 transition-all duration-200 shadow-lg"
                            title="Expand and edit"
                          >
                            <Expand className="w-4 h-4 text-white" />
                          </button>
                          
                          {/* SVG overlay for highlights */}
                          <svg 
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            style={{ transform: 'translateY(18px)' }}
                          >
                          {highlightsData[set.set]?.map((highlight) => (
                            <rect
                              key={highlight.id}
                              x={highlight.x1}
                              y={highlight.y1}
                              width={highlight.x2 - highlight.x1}
                              height={highlight.y2 - highlight.y1}
                              fill="rgba(255, 235, 59, 0.5)"
                              stroke="none"
                              pointerEvents="none"
                            />
                          ))}
                        </svg>
                        
                        {/* Notes overlay */}
                        {notesData[set.set]?.map((note) => (
                          <div
                            key={note.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${note.x}%`, top: `${note.y}%` }}
                          >
                            <div 
                              className="px-2 py-1 rounded text-sm font-medium shadow-lg"
                              style={{ backgroundColor: 'rgb(55, 65, 81)', color: 'white' }}
                            >
                              <span>{note.text}</span>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
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
      
      {/* Music Modal */}
      {showMusicModal && selectedSetNumber && (
        <MusicModal
          show={showMusicModal}
          onClose={handleCloseModal}
          movement={movement}
          setNumber={selectedSetNumber}
          performerKey={selectedPerformerId}
          totalSets={sets.length}
          maxSetNumber={Math.max(...sets.map(s => s.set))}
        />
      )}
    </div>
  );
};

export default MusicReviewPage;