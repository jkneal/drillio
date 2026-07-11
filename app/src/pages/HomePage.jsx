import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, BookOpen } from 'lucide-react';
import { performerData } from '../data/performerData';
import ShowBrand from '../components/ShowBrand';

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
    <div className="min-h-screen show-theme p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 pt-8">
          <div className="flex items-center justify-center mb-1">
            <img
              src="/logo.png"
              alt="Drill Book Logo"
              className="w-8 h-8 mr-3"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-white tracking-wider uppercase font-sans">Drillio</h1>
          </div>
          <div className="show-kicker">Digital drill book</div>
        </div>

          <div className="show-card rounded-lg p-4 backdrop-blur-sm mb-4 shadow-lg">
            <ShowBrand />
            <p className="text-white text-lg mb-4 mt-4">
              Select your performer:
            </p>
            <select
              value={selectedPerformer || ''}
              onChange={(e) => savePerformerSelection(e.target.value)}
              className="show-select w-full rounded-lg p-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
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
            
            {selectedPerformer && (
              <button
                onClick={() => navigate('/movements')}
                className="show-primary-button w-full mt-4 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Continue as {performerData[selectedPerformer].name}
              </button>
            )}
            
            <div className="mt-6 pt-6  border-t border-white/20">
              <div className="flex items-center justify-center mb-1 mt-4">
                <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-yellow-200 font-semibold text-sm">State Champions</span>
                <Trophy className="w-5 h-5 text-yellow-400 ml-2" />
              </div>
              <div className="text-xs text-red-200 text-center">2018 • 2022 • 2023 • 2024 • 2025</div>
              <div className="text-xs text-red-300 mt-0.5 text-center">ISSMA Open Class C</div>
            </div>
          </div>
          
          <div className="text-center mt-8 space-y-2">
            <button
              onClick={() => navigate('/learning-drill')}
              className="home-learning-link"
            >
              <BookOpen className="w-4 h-4" />
              <span>Learning Drill</span>
            </button>
            <button
              onClick={() => navigate('/about')}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              About
            </button>
          </div>
        </div>
      </div>
  );
};

export default HomePage;
