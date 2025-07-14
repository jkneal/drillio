import { useState, useEffect } from 'react';
import { X, Map, ChevronLeft, ChevronRight } from 'lucide-react';

const DrillChartModal = ({ 
  show, 
  onClose, 
  imagePath, 
  movement, 
  setNumber, 
  totalSets = 0
}) => {
  const [currentSet, setCurrentSet] = useState(setNumber);
  const [imageError, setImageError] = useState(false);
  
  // Reset to original set when modal opens
  useEffect(() => {
    if (show) {
      setCurrentSet(setNumber);
      setImageError(false);
    }
  }, [show, setNumber]);
  
  if (!show) return null;
  
  const handlePrevious = () => {
    if (currentSet > 1) {
      setCurrentSet(currentSet - 1);
      setImageError(false);
    }
  };
  
  const handleNext = () => {
    setCurrentSet(currentSet + 1);
    setImageError(false);
  };
  
  const getCurrentImagePath = () => {
    return `/drill/${movement}-${currentSet}.png`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">
            Drill Chart - Movement {movement}, Set {currentSet}
          </h3>
          <button
            onClick={onClose}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="text-center">
          {!imageError ? (
            <div>
              <img
                src={getCurrentImagePath()}
                alt={`Drill chart for Movement ${movement}, Set ${currentSet}`}
                className="max-w-full max-h-96 object-contain rounded"
                onError={() => setImageError(true)}
              />
              <div className="flex justify-center items-center mt-4 space-x-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentSet <= 1}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-semibold">
                  Set {currentSet}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentSet >= totalSets}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
              <Map className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-white/80">
                Drill chart not available for Set {currentSet}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {getCurrentImagePath()}
              </p>
              <div className="flex justify-center items-center mt-4 space-x-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentSet <= 1}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-semibold">
                  Set {currentSet}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentSet >= totalSets}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default DrillChartModal;