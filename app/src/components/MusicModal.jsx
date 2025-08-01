import { useState, useEffect, useRef } from 'react';
import { X, Music, ChevronLeft, ChevronRight, Plus, Trash2, Highlighter } from 'lucide-react';

const MusicModal = ({ 
  show, 
  onClose, 
  movement, 
  setNumber, 
  isStaffView = false,
  performerKey = '',
  totalSets = 0,
  maxSetNumber = 0
}) => {
  const [currentSet, setCurrentSet] = useState(setNumber);
  const [imageError, setImageError] = useState(false);
  const [notes, setNotes] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customNoteText, setCustomNoteText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputPosition, setCustomInputPosition] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  
  const noteTemplates = {
    hold: 'Hold',
    custom: ''
  };
  
  // Reset to original set when modal opens
  useEffect(() => {
    if (show) {
      setCurrentSet(setNumber);
      setImageError(false);
      loadNotes();
    }
  }, [show, setNumber]);
  
  // Load notes from localStorage
  const loadNotes = () => {
    const storageKey = `musicNotes_${movement}_${currentSet}_${performerKey}`;
    const savedNotes = localStorage.getItem(storageKey);
    const highlightKey = `musicHighlights_${movement}_${currentSet}_${performerKey}`;
    const savedHighlights = localStorage.getItem(highlightKey);
    
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      setNotes([]);
    }
    
    if (savedHighlights) {
      setHighlights(JSON.parse(savedHighlights));
    } else {
      setHighlights([]);
    }
  };
  
  // Save notes to localStorage
  const saveNotes = (newNotes) => {
    const storageKey = `musicNotes_${movement}_${currentSet}_${performerKey}`;
    localStorage.setItem(storageKey, JSON.stringify(newNotes));
  };
  
  // Save highlights to localStorage
  const saveHighlights = (newHighlights) => {
    const highlightKey = `musicHighlights_${movement}_${currentSet}_${performerKey}`;
    localStorage.setItem(highlightKey, JSON.stringify(newHighlights));
  };
  
  // Load notes when currentSet changes
  useEffect(() => {
    if (show) {
      loadNotes();
    }
  }, [currentSet, movement, performerKey]);
  
  if (!show) return null;
  
  const handlePrevious = () => {
    if (currentSet > 2) { // Music starts at set 2
      setCurrentSet(currentSet - 1);
      setImageError(false);
    }
  };
  
  const handleNext = () => {
    if (currentSet < maxSetNumber) {
      setCurrentSet(currentSet + 1);
      setImageError(false);
    }
  };
  
  const getCurrentImagePath = () => {
    if (isStaffView) {
      return `/music/Staff${movement}-${currentSet}.png`;
    }
    
    // Determine prefix based on performer key
    let prefix = performerKey;
    if (performerKey.startsWith('SD')) {
      prefix = 'SD';
    } else if (performerKey.startsWith('TD')) {
      prefix = 'TD';
    } else if (performerKey.startsWith('BD')) {
      prefix = 'BD';
    }
    
    return `/music/${prefix}${movement}-${currentSet}.png`;
  };
  
  const handleImageClick = (e) => {
    if (!isAddingNote || isHighlighting) return;
    
    const { x, y } = getCoordinates(e);
    
    if (selectedTemplate === 'custom') {
      setCustomInputPosition({ x, y });
      setShowCustomInput(true);
      setCustomNoteText('');
    } else {
      const newNote = {
        id: Date.now(),
        x,
        y,
        text: noteTemplates[selectedTemplate],
        template: selectedTemplate
      };
      
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
      
      setIsAddingNote(false);
      setSelectedTemplate('');
    }
  };
  
  const handleCustomNoteSubmit = () => {
    if (customNoteText.trim()) {
      const newNote = {
        id: Date.now(),
        x: customInputPosition.x,
        y: customInputPosition.y,
        text: customNoteText,
        template: 'custom'
      };
      
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
    }
    
    setShowCustomInput(false);
    setCustomNoteText('');
    setIsAddingNote(false);
    setSelectedTemplate('');
  };
  
  const getCoordinates = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    return { x, y };
  };

  const handleStart = (e) => {
    if (!isHighlighting) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawEnd({ x, y });
  };
  
  const handleMove = (e) => {
    if (!isHighlighting || !isDrawing) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    
    setDrawEnd({ x, y });
  };
  
  const handleEnd = (e) => {
    if (!isHighlighting || !isDrawing || !drawStart || !drawEnd) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawEnd(null);
      return;
    }
    
    e.preventDefault();
    
    const width = Math.abs(drawEnd.x - drawStart.x);
    const height = Math.abs(drawEnd.y - drawStart.y);
    
    // Only create highlight if the rectangle has meaningful size
    if (width > 1 && height > 1) {
      const highlight = {
        id: Date.now(),
        x1: Math.min(drawStart.x, drawEnd.x),
        y1: Math.min(drawStart.y, drawEnd.y),
        x2: Math.max(drawStart.x, drawEnd.x),
        y2: Math.max(drawStart.y, drawEnd.y)
      };
      
      const updatedHighlights = [...highlights, highlight];
      setHighlights(updatedHighlights);
      saveHighlights(updatedHighlights);
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
  };
  
  const deleteNote = (noteId) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
  };
  
  const deleteHighlight = (highlightId) => {
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    setHighlights(updatedHighlights);
    saveHighlights(updatedHighlights);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">
            Music - Movement {movement}, Set {currentSet}
          </h3>
          <button
            onClick={onClose}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        {!imageError && (
          <div className="mb-4 flex gap-2 justify-center">
            <button
              onClick={() => {
                setIsAddingNote(true);
                setSelectedTemplate('hold');
                setIsHighlighting(false);
              }}
              className={`px-3 py-1 rounded-lg border transition-all duration-200 ${
                isAddingNote && selectedTemplate === 'hold'
                  ? 'bg-blue-600/30 border-blue-500/50 text-white'
                  : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-white'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Hold
            </button>
            <button
              onClick={() => {
                setIsAddingNote(true);
                setSelectedTemplate('custom');
                setIsHighlighting(false);
              }}
              className={`px-3 py-1 rounded-lg border transition-all duration-200 ${
                isAddingNote && selectedTemplate === 'custom'
                  ? 'bg-blue-600/30 border-blue-500/50 text-white'
                  : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-white'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Custom
            </button>
            <button
              onClick={() => {
                setIsHighlighting(!isHighlighting);
                setIsAddingNote(false);
                setSelectedTemplate('');
                setShowCustomInput(false);
              }}
              className={`px-3 py-1 rounded-lg border transition-all duration-200 ${
                isHighlighting
                  ? 'bg-yellow-600/30 border-yellow-500/50 text-white'
                  : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-white'
              }`}
            >
              <Highlighter className="w-4 h-4 inline mr-1" />
              {isHighlighting ? 'Stop Highlighting' : 'Highlight'}
            </button>
            {isAddingNote && (
              <button
                onClick={() => {
                  setIsAddingNote(false);
                  setSelectedTemplate('');
                  setShowCustomInput(false);
                }}
                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-white transition-all duration-200"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        {isHighlighting && !imageError && (
          <div className="text-center text-sm text-white/70 mb-2">
            Draw around an area to highlight. Click on highlights to delete them.
          </div>
        )}
        <div className="text-center relative" ref={containerRef}>
          {!imageError ? (
            <div className="relative inline-block" style={{ userSelect: 'none' }}>
              <img
                ref={imageRef}
                src={getCurrentImagePath()}
                alt={`Music snippet for Movement ${movement}, Set ${currentSet}`}
                className={`max-w-full max-h-96 object-contain rounded ${
                  isAddingNote ? 'cursor-crosshair' : isHighlighting ? 'cursor-crosshair' : ''
                }`}
                style={{ 
                  pointerEvents: isHighlighting ? 'none' : 'auto',
                  touchAction: isAddingNote ? 'none' : 'auto'
                }}
                onClick={handleImageClick}
                onTouchEnd={(e) => {
                  if (isAddingNote && !isHighlighting) {
                    e.preventDefault();
                    handleImageClick(e);
                  }
                }}
                onError={() => setImageError(true)}
                draggable={false}
              />
              
              {/* SVG overlay for drawing and highlights */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ 
                  pointerEvents: isHighlighting ? 'auto' : 'none',
                  cursor: isHighlighting ? 'crosshair' : 'default',
                  touchAction: isHighlighting ? 'none' : 'auto'
                }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                onTouchCancel={handleEnd}
              >
                {/* Rendered highlights */}
                {highlights.map((highlight) => (
                  <g key={highlight.id} className="group">
                    <rect
                      x={highlight.x1}
                      y={highlight.y1}
                      width={highlight.x2 - highlight.x1}
                      height={highlight.y2 - highlight.y1}
                      fill="rgba(255, 235, 59, 0.5)"
                      stroke="none"
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHighlight(highlight.id);
                      }}
                      onMouseEnter={(e) => e.target.setAttribute('fill', 'rgba(255, 235, 59, 0.7)')}
                      onMouseLeave={(e) => e.target.setAttribute('fill', 'rgba(255, 235, 59, 0.5)')}
                    >
                      <title>Click to delete</title>
                    </rect>
                  </g>
                ))}
              
                {/* Current drawing rectangle */}
                {isDrawing && drawStart && drawEnd && (
                  <rect
                    x={Math.min(drawStart.x, drawEnd.x)}
                    y={Math.min(drawStart.y, drawEnd.y)}
                    width={Math.abs(drawEnd.x - drawStart.x)}
                    height={Math.abs(drawEnd.y - drawStart.y)}
                    fill="rgba(255, 235, 59, 0.3)"
                    stroke="rgb(255, 235, 59)"
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                    pointerEvents="none"
                  />
                )}
              </svg>
              
              {/* Notes */}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${note.x}%`, top: `${note.y}%` }}
                >
                  <div 
                    className="px-2 py-1 rounded text-sm font-medium shadow-lg flex items-center gap-1"
                    style={{ backgroundColor: 'rgb(55, 65, 81)', color: 'white' }}
                  >
                    <span>{note.text}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="rounded p-0.5"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgb(75, 85, 99)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Custom note input */}
              {showCustomInput && (
                <div
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${customInputPosition.x}%`, top: `${customInputPosition.y}%` }}
                >
                  <div className="bg-gray-700 rounded-lg shadow-lg p-2 flex gap-2">
                    <input
                      type="text"
                      value={customNoteText}
                      onChange={(e) => setCustomNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomNoteSubmit();
                        } else if (e.key === 'Escape') {
                          setShowCustomInput(false);
                          setCustomNoteText('');
                          setIsAddingNote(false);
                          setSelectedTemplate('');
                        }
                      }}
                      placeholder="Enter note..."
                      className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white placeholder-gray-400"
                      autoFocus
                    />
                    <button
                      onClick={handleCustomNoteSubmit}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-center items-center mt-4 space-x-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentSet <= 2}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-semibold">
                  Set {currentSet}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentSet >= maxSetNumber}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
              <Music className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-white/80">
                Music snippet not available for Set {currentSet}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {getCurrentImagePath()}
              </p>
              <div className="flex justify-center items-center mt-4 space-x-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentSet <= 2}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-semibold">
                  Set {currentSet}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentSet >= maxSetNumber}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicModal;