import { Map, Music, Sparkles, StickyNote, Route } from 'lucide-react';
import { setNicknamesConfig } from '../data/setNicknamesConfig';

const SetHeader = ({ 
  setNumber, 
  subtitle,
  showMusicIcon = true,
  onDrillChartClick,
  onMusicClick,
  onNotesClick,
  onPathVisualizerClick,
  movement,
  hasNote = false,
  musicAvailable = false
}) => {
  // Convert setNumber to string for config lookup
  const nickname = movement && setNumber && setNicknamesConfig[movement]?.[String(setNumber)];
  
  return (
    <div className="text-center mb-4">
      <div className="flex items-center justify-center mb-2">
        <h2 className="text-2xl font-bold text-white">SET {setNumber}</h2>
        <button
          onClick={onDrillChartClick}
          className="ml-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
          title="View drill chart"
        >
          <Map className="w-5 h-5 text-blue-300" />
        </button>
        {showMusicIcon && setNumber > 1 && musicAvailable && (
          <button
            onClick={onMusicClick}
            className="ml-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
            title="View music snippet"
          >
            <Music className="w-5 h-5 text-blue-300" />
          </button>
        )}
        {onNotesClick && (
          <button
            onClick={onNotesClick}
            className={`ml-2 ${hasNote ? 'bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30' : 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30'} rounded-lg p-icon transition-all duration-200 relative`}
            title="Personal notes"
          >
            <StickyNote className={`w-5 h-5 ${hasNote ? 'text-yellow-300' : 'text-blue-300'}`} />
            {hasNote && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
            )}
          </button>
        )}
        {onPathVisualizerClick && (
          <button
            onClick={onPathVisualizerClick}
            className="ml-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
            title="Path visualization"
          >
            <Route className="w-5 h-5 text-blue-300" />
          </button>
        )}
      </div>
      {subtitle && (
        <div className="text-white/80 text-lg">{subtitle}</div>
      )}
    </div>
  );
};

export default SetHeader;