import { useState, useEffect, useRef } from 'react';
import { X, Map, ChevronLeft, ChevronRight } from 'lucide-react';

const DrillChartModal = ({ 
  show, 
  onClose, 
  imagePath, 
  movement,
  actualMovement, // The actual movement being shown (could be previous movement at transition)
  setNumber, 
  isAtTransition = false, // Whether we're at the transition point (index 0 of non-first movement)
  totalSets = 0,
  minSetNumber = 1,
  maxSetNumber = 0
}) => {
  const [currentSet, setCurrentSet] = useState(setNumber);
  const [currentMovement, setCurrentMovement] = useState(actualMovement || movement);
  const [imageError, setImageError] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const lastTouchDistance = useRef(0);
  
  // Reset to original set when modal opens
  useEffect(() => {
    if (show) {
      setCurrentSet(setNumber);
      setCurrentMovement(actualMovement || movement);
      setImageError(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [show, setNumber, actualMovement, movement]);

  // Reset zoom when changing sets
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentSet]);
  
  if (!show) return null;
  
  const handlePrevious = () => {
    if (currentSet > minSetNumber) {
      setCurrentSet(currentSet - 1);
      setImageError(false);
      // If we're moving back from the first set of current movement to previous movement
      if (isAtTransition && currentSet === minSetNumber + 1) {
        setCurrentMovement(actualMovement || movement);
      }
    }
  };
  
  const handleNext = () => {
    if (currentSet < maxSetNumber) {
      setCurrentSet(currentSet + 1);
      setImageError(false);
      // If we're at transition and moving forward, switch to the actual movement
      if (isAtTransition && currentSet === setNumber) {
        setCurrentMovement(movement);
      }
    }
  };
  
  const getCurrentImagePath = () => {
    return `/drill/${currentMovement}-${currentSet}.png`;
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle pinch zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      lastTouchDistance.current = getTouchDistance(e.touches);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const delta = currentDistance - lastTouchDistance.current;
      
      // Calculate new scale
      const scaleDelta = delta * 0.01;
      const newScale = Math.min(Math.max(scale + scaleDelta, 0.5), 5);
      setScale(newScale);
      
      lastTouchDistance.current = currentDistance;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">
            Drill Chart - Movement {currentMovement}, Set {currentSet}
          </h3>
          <button
            onClick={onClose}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        {scale !== 1 && (
          <div className="text-center mb-2">
            <button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-white text-xs transition-all duration-200"
            >
              Reset Zoom
            </button>
          </div>
        )}
        <div className="text-center">
          {!imageError ? (
            <div 
              className="relative inline-block overflow-hidden"
              style={{ 
                touchAction: isPinching ? 'none' : 'auto'
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                style={{
                  transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                  transformOrigin: 'center',
                  transition: isPinching ? 'none' : 'transform 0.2s'
                }}
              >
                <img
                  src={getCurrentImagePath()}
                  alt={`Drill chart for Movement ${currentMovement}, Set ${currentSet}`}
                  className="max-w-full max-h-96 object-contain rounded"
                  onError={() => setImageError(true)}
                  draggable={false}
                />
              </div>
              <div className="flex justify-center items-center mt-4 space-x-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentSet <= minSetNumber}
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
                  disabled={currentSet <= minSetNumber}
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

export default DrillChartModal;