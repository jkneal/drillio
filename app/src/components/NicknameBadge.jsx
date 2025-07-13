import { Sparkles } from 'lucide-react';
import { setNicknamesConfig } from '../data/setNicknamesConfig';

const NicknameBadge = ({ movement, setNumber }) => {
  const nickname = movement && setNumber && setNicknamesConfig[movement]?.[String(setNumber)];
  
  if (!nickname) return null;
  
  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="nickname-badge inline-flex items-center rounded-full px-2 py-0.5 backdrop-blur-sm">
        <Sparkles className="w-2.5 h-2.5 text-yellow-300 mr-1 animate-pulse" />
        <span className="nickname-text font-semibold text-xs">
          {nickname}
        </span>
        <Sparkles className="w-2.5 h-2.5 text-yellow-300 ml-1 animate-pulse" />
      </div>
    </div>
  );
};

export default NicknameBadge;