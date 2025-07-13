import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Info } from 'lucide-react';
import { performerData } from '../data/performerData';

const HomePage = () => {
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedPerformer = localStorage.getItem('drillBookPerformer');
    if (savedPerformer && performerData[savedPerformer]) {
      setSelectedPerformer(savedPerformer);
    }
  }, []);

  const savePerformerSelection = (performerId) => {
    localStorage.setItem('drillBookPerformer', performerId);
    setSelectedPerformer(performerId);
    navigate('/movements');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="Drill Book Logo"
              className="w-8 h-8 mr-3"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-white tracking-wider uppercase font-sans">Drillio</h1>
            <button
              onClick={() => navigate('/about')}
              className="ml-8 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg pi-1 transition-all duration-200"
              title="About Drillio"
            >
              <Info className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

          <div className="bg-black/40 border-2 border-white/40 rounded-lg p-3 backdrop-blur-sm mb-4 shadow-lg">
            <div className="flex items-center justify-center mb-3">
              <img
                  src="/HSlogo.png"
                  alt="E Logo"
                  className="w-8 h-5 mr-3"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
              />
              <h2 className="text-2xl font-bold text-white">Edgewood 2025 - Transient</h2>
            </div>
            <p className="text-white text-lg mb-4" style={{"marginTop": "0.2rem"}}>
              Select your performer:
            </p>
            <select
              value={selectedPerformer || ''}
              onChange={(e) => savePerformerSelection(e.target.value)}
              className="w-full bg-red-600/20 border border-red-500/30 rounded-lg p-3 text-white text-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="" disabled className="bg-gray-800">Choose your position...</option>
              <option value="Staff" className="bg-gray-800">
                Staff View (ALL)
              </option>
              {Object.keys(performerData)
                .filter(id => id !== 'Staff')
                .sort((a, b) => {
                  // Sort by instrument type first (Snare, Tenor, Bass)
                  const aType = performerData[a].name.split(' ')[0];
                  const bType = performerData[b].name.split(' ')[0];
                  if (aType !== bType) {
                    const order = ['Snare', 'Tenor', 'Bass'];
                    return order.indexOf(aType) - order.indexOf(bType);
                  }
                  // Then sort by number within same instrument type
                  const aNum = parseInt(performerData[a].name.split(' ').pop());
                  const bNum = parseInt(performerData[b].name.split(' ').pop());
                  return aNum - bNum;
                })
                .map((performerId) => (
                  <option key={performerId} value={performerId} className="bg-gray-800">
                    {performerData[performerId].name} (#{performerData[performerId].number})
                  </option>
                ))}
            </select>
            
            <div className="mt-6 pt-6  border-t border-white/20">
              <div className="flex items-center justify-center mb-1 mt-4">
                <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-yellow-200 font-semibold text-sm">State Champions</span>
                <Trophy className="w-5 h-5 text-yellow-400 ml-2" />
              </div>
              <div className="text-xs text-red-200 text-center">2018 • 2022 • 2023 • 2024</div>
              <div className="text-xs text-red-300 mt-0.5 text-center">ISSMA Open Class C</div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default HomePage;