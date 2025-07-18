import { Sparkles } from 'lucide-react';
import { setNicknamesConfig } from '../data/setNicknamesConfig';

const NicknameBadge = ({ movement, setNumber }) => {
  const nickname = movement && setNumber && setNicknamesConfig[movement]?.[String(setNumber)];
  
  if (!nickname) return null;
  
  return (
    <div className="flex justify-center mb-2">
      <div className="nickname-badge inline-flex items-center rounded-full px-1.5 py-0.5">
        <Sparkles className="w-2 h-2 text-white mr-0.5 opacity-80" />
        <span className="nickname-text font-semibold text-[10px]">
          {nickname}
        </span>
        <Sparkles className="w-2 h-2 text-white ml-0.5 opacity-80" />
      </div>
    </div>
  );
};

export default NicknameBadge;