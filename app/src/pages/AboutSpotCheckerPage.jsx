import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crosshair, MapPin, Users, Zap, Shield, TrendingUp, Smartphone, Radio, ChevronRight } from 'lucide-react';

const AboutSpotCheckerPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-white hover:text-red-200 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span>Back</span>
          </button>
        </div>

        <div className="bg-black/40 border-2 border-white/40 rounded-lg p-6 backdrop-blur-sm shadow-lg">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <Crosshair className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">About Spot Checker</h1>
            <p className="text-white/80">Revolutionary precision positioning for marching band</p>
          </div>

          <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4 mb-6">
            <p className="text-green-200 text-sm text-center">
              <span className="font-semibold">Beta Feature:</span> Currently in simulation mode. 
              Hardware support coming soon!
            </p>
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">What is Spot Checker?</h2>
          
          <p className="text-white/80 mb-6 leading-relaxed">
            Spot Checker uses Ultra-Wideband (UWB) technology to provide centimeter-level accuracy 
            for finding and verifying drill positions. No more coordinate tapes, no more guessing – 
            just precise, real-time position feedback right on your phone.
          </p>

          <h2 className="text-xl font-semibold text-white mb-4">Key Features</h2>
          
          <div className="space-y-4 mb-6">
            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-green-300" />
                Find Your Spot Instantly
              </h3>
              <p className="text-white/70 text-sm">
                Get real-time guidance to your exact position. The app shows your current location 
                and guides you to your target spot with 0.2 step (6 inch) accuracy.
              </p>
            </div>

            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Smartphone className="w-4 h-4 mr-2 text-green-300" />
                Haptic Feedback
              </h3>
              <p className="text-white/70 text-sm">
                Feel your way to the right spot with intelligent vibration patterns. Different 
                patterns indicate how close you are, with a success vibration when you're on spot.
              </p>
            </div>

            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-green-300" />
                Works Anywhere
              </h3>
              <p className="text-white/70 text-sm">
                Unlike GPS or visual systems, UWB works on any surface – grass fields, parking 
                lots, gym floors, or stadiums. Rain or shine, day or night.
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
          
          <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <ol className="space-y-3 text-white/80 text-sm">
              <li className="flex items-start">
                <span className="text-green-300 font-bold mr-2">1.</span>
                <span>Directors place 4-8 UWB anchors around the practice area</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 font-bold mr-2">2.</span>
                <span>One-time calibration maps the anchors to field coordinates</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 font-bold mr-2">3.</span>
                <span>Performers open Spot Checker for any set</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 font-bold mr-2">4.</span>
                <span>Real-time position tracking guides them to their exact spot</span>
              </li>
            </ol>
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">Benefits Over Traditional Methods</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <ChevronRight className="w-4 h-4 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">No More Coordinate Tapes:</span>
                <span className="text-white/70 text-sm block">
                  Eliminate the need for laying out and adjusting coordinate tapes
                </span>
              </div>
            </div>
            
            <div className="flex items-start">
              <ChevronRight className="w-4 h-4 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">Faster Learning:</span>
                <span className="text-white/70 text-sm block">
                  New members find spots instantly instead of counting steps
                </span>
              </div>
            </div>
            
            <div className="flex items-start">
              <ChevronRight className="w-4 h-4 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">Consistent Accuracy:</span>
                <span className="text-white/70 text-sm block">
                  Every performer gets the same precise positioning, every time
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">Director Tools (Coming Soon)</h2>
          
          <div className="space-y-4 mb-6">
            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2 text-blue-300" />
                Formation Checker
              </h3>
              <p className="text-white/70 text-sm">
                Instantly verify if all performers are on their spots. See who needs adjustment 
                with a real-time overhead view of the entire ensemble.
              </p>
            </div>

            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-300" />
                Progress Analytics
              </h3>
              <p className="text-white/70 text-sm">
                Track how quickly performers are hitting their spots over time. Identify 
                trouble spots in the drill that need extra attention.
              </p>
            </div>

            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-blue-300" />
                Collision Prevention
              </h3>
              <p className="text-white/70 text-sm">
                Get alerts when performer paths will intersect during transitions. 
                Prevent accidents before they happen.
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">Hardware Requirements</h2>
          
          <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-white/80 font-semibold mb-2">For Performers:</h3>
            <ul className="text-white/70 text-sm space-y-1 ml-4">
              <li>iPhone 11 or newer (with U1 chip)</li>
              <li>Select Android phones with UWB (Pixel 6+, Galaxy S21+)</li>
            </ul>
            
            <h3 className="text-white/80 font-semibold mb-2 mt-4">For Directors:</h3>
            <ul className="text-white/70 text-sm space-y-1 ml-4">
              <li>4-8 UWB anchor beacons ($30-200 each)</li>
              <li>USB battery packs for outdoor use</li>
              <li>One-time setup takes ~15 minutes</li>
            </ul>
          </div>

        </div>

        <div className="text-center mt-6">
          <p className="text-white/60 text-xs">
            Spot Checker Beta • Precision meets performance&nbsp;
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutSpotCheckerPage;