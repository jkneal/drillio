import { useNavigate } from 'react-router-dom';
import { Home, ChevronRight, Users, Music, Play, SkipForward, ChevronLeft, Lightbulb, Map, Wifi, WifiOff } from 'lucide-react';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-white hover:text-red-200 transition-colors"
            >
              <Home className="w-6 h-6 mr-2" />
              <span>Home</span>
            </button>
            <div className="flex flex-col items-center">
              <img
                src="/HSlogo.png"
                alt="E Logo"
                className="w-8 h-5 mb-1"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="text-white text-center text-sm">
                <div>Edgewood 2025</div>
                <div className="text-xs">- Transient -</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/40 border-2 border-white/40 rounded-lg p-6 backdrop-blur-sm shadow-lg mb-4">
          <h1 className="text-2xl font-bold text-white mb-4 text-center">About Drillio</h1>
          
          <p className="text-white/90 mb-6">
            Drillio is your personal drill book companion for the Edgewood High School Marching Band's 
            2025 show "Transient". Access your drill positions, movements, and performance tips 
            right from your phone!
          </p>

          <h2 className="text-xl font-semibold text-white mb-3">How to Use Drillio</h2>
          
          <div className="space-y-4 mb-6">
            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                1. Select Your Position
              </h3>
              <p className="text-white/80 text-sm">
                Choose your instrument and position from the dropdown menu. Your selection is saved 
                automatically so you won't need to select it again next time. Staff members can 
                select "Staff View" to see all performers' positions at once.
              </p>
            </div>

            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <ChevronRight className="w-4 h-4 mr-2" />
                2. Choose a Movement
              </h3>
              <p className="text-white/80 text-sm">
                Select from the 5 movements in our show: Uninvited, TBD, Transition, Ballad, 
                and Closer. You can also watch movement preview videos when available.
              </p>
            </div>

            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <SkipForward className="w-4 h-4 mr-2" />
                3. Navigate Through Sets
              </h3>
              <p className="text-white/80 text-sm">
                Use the arrow buttons to move between sets, or swipe left/right on mobile. 
                The First/Last buttons quickly jump to the beginning or end of a movement.
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-3">Understanding Your Drill</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Left-Right Position:</span> Your location 
                relative to the yard lines (e.g., "Left: 2.0 steps Inside 45 yd ln")
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Front-Back Position:</span> Your location 
                relative to the hash marks (e.g., "4.0 steps Behind Visitor Hash")
              </div>
            </div>

            <div className="flex items-start">
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Form:</span> The type of formation 
                you're in (e.g., "Line full battery", "Concert formation")
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-3">Special Features</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <Map className="w-4 h-4 text-blue-300 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Drill Charts:</span> Tap the map icon to 
                view the full field drill chart for any set, showing all performers' positions.
              </div>
            </div>

            <div className="flex items-start">
              <Music className="w-4 h-4 text-blue-300 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Music Snippets:</span> Tap the music 
                icon on any set (except Set 1) to view the corresponding music notation.
              </div>
            </div>

            <div className="flex items-start">
              <Play className="w-4 h-4 text-green-300 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Movement Videos:</span> Watch animated 
                previews of each movement from the movement selection screen.
              </div>
            </div>

            <div className="flex items-start">
              <Lightbulb className="w-4 h-4 text-yellow-300 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Performance Tips:</span> Look for yellow 
                lightbulb icons that provide helpful reminders and movement instructions. 
                <span className="bg-yellow-600 text-black px-1 rounded font-semibold ml-1">Hold</span> indicators 
                are highlighted for visibility.
              </div>
            </div>

            <div className="flex items-start">
              <Users className="w-4 h-4 text-red-300 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Staff View:</span> Directors can select 
                "Staff View" to see all performers' positions for any given set.
              </div>
            </div>

            <div className="flex items-start">
              <WifiOff className="w-4 h-4 text-green-300 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-white/80 text-sm">
                <span className="font-semibold text-white">Works Offline:</span> Once installed, 
                Drillio works without an internet connection - perfect for outdoor rehearsals!
              </div>
            </div>
          </div>

          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mt-6">
            <p className="text-yellow-200 text-sm text-center">
              <span className="font-semibold">Pro Tip:</span> Practice your drill moves at home 
              by walking through each set while following along in the app!
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-white/60 text-xs">
            Drillio v1.0 • Made with ❤️ for Edgewood Marching Band
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;