import { Map, Music } from 'lucide-react';

const SetHeader = ({ 
  setNumber, 
  subtitle,
  showMusicIcon = true,
  onDrillChartClick,
  onMusicClick
}) => {
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
        {showMusicIcon && setNumber > 1 && (
          <button
            onClick={onMusicClick}
            className="ml-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
            title="View music snippet"
          >
            <Music className="w-5 h-5 text-blue-300" />
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