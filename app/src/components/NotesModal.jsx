import { useState, useEffect } from 'react';
import { X, StickyNote, ChevronDown } from 'lucide-react';

const NotesModal = ({ 
  show, 
  onClose, 
  movement, 
  setNumber,
  performerId
}) => {
  const [note, setNote] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  
  const quickTemplates = [
    "Check spacing with ",
    "Watch step size",
    "Little in front of ",
    "Littin behind ",
    "Line up with yard line",
    "Stay in line with ",
    "Hit position stronger",
    "Watch for visual cue",
    "Keep shoulders square",
    "Rock and Roll Step "
  ];
  
  // Generate storage key
  const getStorageKey = () => {
    return `note_${performerId}_${movement}_${setNumber}`;
  };
  
  // Load note when modal opens
  useEffect(() => {
    if (show) {
      const savedNote = localStorage.getItem(getStorageKey());
      setNote(savedNote || '');
    }
  }, [show, movement, setNumber, performerId]);
  
  // Save note to localStorage
  const handleSave = () => {
    const key = getStorageKey();
    if (note.trim()) {
      localStorage.setItem(key, note.trim());
    } else {
      localStorage.removeItem(key);
    }
    onClose();
  };
  
  // Add template to note
  const handleTemplateClick = (template) => {
    setNote(prevNote => {
      // Add space if note doesn't end with space
      const separator = prevNote && !prevNote.endsWith(' ') ? ' ' : '';
      return prevNote + separator + template;
    });
    setShowTemplates(false);
  };
  
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg flex items-center">
            <StickyNote className="w-5 h-5 mr-2" />
            Notes - Movement {movement}, Set {setNumber}
          </h3>
          <button
            onClick={onClose}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-white/80 text-sm mb-1 block">Your Notes:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your personal notes for this set..."
              className="w-full h-32 bg-black/40 border border-white/40 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              autoFocus
            />
          </div>
          
          <div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center text-white/80 text-sm hover:text-white transition-colors"
            >
              <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              Quick Templates
            </button>
            
            {showTemplates && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {quickTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleTemplateClick(template)}
                    className="bg-red-700/20 hover:bg-red-700/30 border border-red-500/30 rounded px-2 py-1 text-xs text-white/80 text-left transition-all"
                  >
                    {template}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg px-4 py-2 text-white transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-red-600/30 hover:bg-red-600/40 border border-red-500/30 rounded-lg px-4 py-2 text-white font-semibold transition-all duration-200"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesModal;