import { Lightbulb, ArrowRight } from 'lucide-react';
import MovementVector from './MovementVector';

const TipDisplay = ({ tip, nextSet, size = 'normal' }) => {
  if (!tip && !nextSet) return null;

  const textSize = size === 'small' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';
  const spacing = size === 'small' ? 'mr-1' : 'mr-2';
  
  const formatTipText = (text) => {
    if (!text) return null;
    
    // Combined pattern to match both movements and hold
    const combinedPattern = /(left forward|right forward|left backward|right backward|forward|backward|left|right)\s*\((\d+)-to-5\)|(hold|Hold|HOLD)/gi;
    
    let lastIndex = 0;
    const result = [];
    let match;
    
    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push(text.substring(lastIndex, match.index));
      }
      
      // Check if it's a movement pattern
      if (match[1]) {
        const direction = match[1];
        const stepSize = match[2];
        result.push(
          <span key={`movement-${match.index}`}>
            <span className="text-blue-300 font-semibold">{direction}</span>
            <span className="text-white"> (</span>
            <span className="text-green-300 font-semibold">{stepSize}-to-5</span>
            <span className="text-white">)</span>
          </span>
        );
      }
      // Check if it's a hold pattern
      else if (match[3]) {
        result.push(
          <span key={`hold-${match.index}`} className="bg-yellow-600 text-black px-1 rounded font-semibold">
            Hold
          </span>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
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
          <MovementVector tip={tip} size={size} />
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