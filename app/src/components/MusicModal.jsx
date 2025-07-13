import { X, Music } from 'lucide-react';

const MusicModal = ({ 
  show, 
  onClose, 
  imagePath, 
  movement, 
  setNumber, 
  error, 
  onError 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">
            Music - Movement {movement}, Set {setNumber}
          </h3>
          <button
            onClick={onClose}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="text-center">
          {!error ? (
            <img
              src={imagePath}
              alt={`Music snippet for Movement ${movement}, Set ${setNumber}`}
              className="max-w-full max-h-96 object-contain rounded"
              onError={onError}
            />
          ) : (
            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
              <Music className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-white/80">
                Music snippet not available
              </p>
              <p className="text-white/60 text-sm mt-1">
                {imagePath}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicModal;