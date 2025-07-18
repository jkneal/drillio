import { Lightbulb, ArrowRight } from 'lucide-react';
import MovementVector from './MovementVector';

const TipDisplay = ({ tip, nextSet, movementVector, size = 'normal' }) => {
  if (!tip && !nextSet) return null;

  const textSize = size === 'small' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';
  const spacing = size === 'small' ? 'mr-1' : 'mr-2';
  
  const formatTipText = (text) => {
    if (!text) return null;
    
    // Pattern to match "Move <direction>" and step size, and hold
    const movePattern = /Move\s+(Forward|Right Forward|Right|Right Backward|Backward|Left Backward|Left|Left Forward)\s*\((\d+)-to-5\)/gi;
    const holdPattern = /(hold|Hold|HOLD)/gi;
    
    let lastIndex = 0;
    const result = [];
    let match;
    
    // First process Move patterns
    const processedText = text.replace(movePattern, (match, direction, stepSize, offset) => {
      return `__MOVE_START__${direction}__MOVE_MID__${stepSize}__MOVE_END__`;
    });
    
    // Then process Hold patterns
    const parts = processedText.split(/(__MOVE_START__|__MOVE_MID__|__MOVE_END__|hold|Hold|HOLD)/gi);
    
    let i = 0;
    while (i < parts.length) {
      const part = parts[i];
      
      if (part === '__MOVE_START__' && i + 3 < parts.length) {
        const direction = parts[i + 1];
        const stepSize = parts[i + 3];
        result.push(
          <span key={`movement-${i}`}>
            <span className="text-white">Move </span>
            <span className="text-blue-300 font-semibold">{direction}</span>
            <span className="text-white"> (</span>
            <span className="text-green-300 font-semibold">{stepSize}-to-5</span>
            <span className="text-white">)</span>
          </span>
        );
        i += 5; // Skip the processed parts
      } else if (part && part.match(/^(hold|Hold|HOLD)$/i)) {
        result.push(
          <span key={`hold-${i}`} className="bg-yellow-600 text-black px-1 rounded font-semibold">
            Hold
          </span>
        );
        i++;
      } else if (part && part !== '__MOVE_MID__' && part !== '__MOVE_END__') {
        result.push(part);
        i++;
      } else {
        i++;
      }
    }
    
    return result;
  };

  return (
    <div className="space-y-2">
      {tip && (
        <div className="flex items-center">
          <Lightbulb className={`${iconSize} text-yellow-300 ${spacing} flex-shrink-0`} />
          <div className={`text-white/80 ${textSize} leading-relaxed flex-1`}>
            {formatTipText(tip)}
          </div>
          <MovementVector tip={tip} movementVector={movementVector} size={size} />
        </div>
      )}
      
      {nextSet && (
        <div className="flex items-center">
          <ArrowRight className={`${iconSize} text-blue-300 ${spacing} flex-shrink-0`} />
          <div className={`text-white/80 ${textSize} leading-relaxed`}>
            <span className="font-semibold">Next: </span>
            {nextSet}
          </div>
        </div>
      )}
    </div>
  );
};

export default TipDisplay;