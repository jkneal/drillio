import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, Signal, Navigation, AlertCircle, Check, X, Info } from 'lucide-react';
import UWBSimulator from '../utils/uwbSimulator';
import { performerData } from '../data/performerData';
import { movementsConfig } from '../data/movementsConfig';
import FieldPositionDisplay from '../components/FieldPositionDisplay';

const SpotCheckerPage = () => {
  const navigate = useNavigate();
  const { movement: urlMovement, set: urlSet } = useParams();
  const uwbRef = useRef(null);
  const updateIntervalRef = useRef(null);
  
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(urlMovement || '1');
  const [selectedSet, setSelectedSet] = useState(parseInt(urlSet) || 1);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [lastHapticDistance, setLastHapticDistance] = useState(null);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  
  // Initialize UWB simulator
  useEffect(() => {
    uwbRef.current = new UWBSimulator();
    
    // Start position updates
    updateIntervalRef.current = setInterval(() => {
      const pos = uwbRef.current.getCurrentPosition();
      setCurrentPosition(pos);
    }, 100); // 10Hz update rate
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);
  
  // Load saved performer
  useEffect(() => {
    const savedPerformer = localStorage.getItem('drillBookPerformer');
    if (savedPerformer && performerData[savedPerformer]) {
      setSelectedPerformer(savedPerformer);
    }
  }, []);
  
  // Get target position for current set
  const getTargetPosition = () => {
    if (!selectedPerformer || selectedPerformer === 'Staff') return null;
    
    const performer = performerData[selectedPerformer];
    const movement = performer?.movements?.[selectedMovement];
    const set = movement?.find(s => s.set === selectedSet);
    
    return set;
  };
  
  // Parse drill coordinates to field position
  const parseTargetPosition = () => {
    const target = getTargetPosition();
    if (!target) return null;
    
    // This is a simplified parser - in production would use the full parser
    // For now, return center of field
    return { x: 26.67, y: 60 }; // 50 yard line, center
  };
  
  // Calculate distance from current to target position
  const calculateDistance = () => {
    if (!currentPosition || !getTargetPosition()) return null;
    
    const target = getTargetPosition();
    const currentDrill = uwbRef.current.fieldToDrillCoordinates(
      currentPosition.x,
      currentPosition.y
    );
    
    // This is simplified - in real implementation would parse and compare positions
    // For now, just show if we're close to the simulated position
    const dx = currentPosition.x - 26.67; // Center of field
    const dy = currentPosition.y - 60; // 50 yard line
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = distance * 1.6; // Convert yards to steps
    
    return {
      steps: steps,
      direction: Math.atan2(dy, dx) * 180 / Math.PI
    };
  };
  
  const targetSet = getTargetPosition();
  const distance = calculateDistance();
  
  // Haptic feedback based on proximity
  useEffect(() => {
    if (!distance) return;
    
    const triggerHaptic = (pattern) => {
      if (hapticEnabled && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    };
    
    // Different haptic patterns based on distance
    if (distance.steps < 0.2) {
      // On spot - strong success vibration
      if (lastHapticDistance === null || lastHapticDistance >= 0.2) {
        triggerHaptic([100, 50, 100, 50, 200]); // Success pattern
      }
    } else if (distance.steps < 0.5) {
      // Very close - rapid pulses
      if (lastHapticDistance === null || Math.abs(lastHapticDistance - distance.steps) > 0.1) {
        triggerHaptic([30, 30, 30]); // Quick triple pulse
      }
    } else if (distance.steps < 1.0) {
      // Close - double pulse
      if (lastHapticDistance === null || Math.abs(lastHapticDistance - distance.steps) > 0.2) {
        triggerHaptic([50, 50, 50]); // Double pulse
      }
    } else if (distance.steps < 2.0) {
      // Getting closer - single pulse
      if (lastHapticDistance === null || Math.abs(lastHapticDistance - distance.steps) > 0.3) {
        triggerHaptic([50]); // Single pulse
      }
    }
    
    setLastHapticDistance(distance.steps);
  }, [distance, lastHapticDistance]);
  
  // Determine status color based on accuracy
  const getStatusColor = () => {
    if (!distance) return 'text-gray-400';
    if (distance.steps < 0.2) return 'text-green-500';
    if (distance.steps < 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getStatusIcon = () => {
    if (!distance) return <AlertCircle className="w-12 h-12" />;
    if (distance.steps < 0.2) return <Check className="w-12 h-12 text-green-500" />;
    if (distance.steps < 0.5) return <Navigation className="w-12 h-12" />;
    return <X className="w-12 h-12" />;
  };
  
  // Simulate movement to target position
  const simulateMovement = () => {
    // In real app, this would be actual movement
    // For simulation, move the virtual performer
    uwbRef.current.moveToPosition(
      Math.random() * 53.33,
      Math.random() * 100 + 10
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(`/drill/${selectedMovement}`)}
              className="flex items-center text-white hover:text-red-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <Signal className={`w-5 h-5 ${currentPosition?.anchorCount >= 4 ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className="text-white text-sm">
                {currentPosition?.anchorCount || 0} anchors
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <h1 className="text-2xl font-bold text-white">Spot Checker</h1>
              <button
                onClick={() => navigate('/about-spot-checker')}
                className="ml-3 text-white/60 hover:text-white transition-colors"
                title="About Spot Checker"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/60 text-sm">Precision positioning system</p>
          </div>
        </div>
        
        {/* Performer Selection */}
        {!selectedPerformer || selectedPerformer === 'Staff' ? (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm mb-6">
            <p className="text-white mb-4">Select your position to use Spot Checker</p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Select Position
            </button>
          </div>
        ) : (
          <>
            {/* Movement and Set Selection */}
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-white/60 text-sm">Movement</label>
                  <select
                    value={selectedMovement}
                    onChange={(e) => setSelectedMovement(e.target.value)}
                    className="w-full bg-red-700/30 text-white border border-red-500/30 rounded p-2"
                  >
                    {Object.keys(movementsConfig).map(mov => (
                      <option key={mov} value={mov}>
                        {movementsConfig[mov].displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-sm">Set</label>
                  <select
                    value={selectedSet}
                    onChange={(e) => setSelectedSet(parseInt(e.target.value))}
                    className="w-full bg-red-700/30 text-white border border-red-500/30 rounded p-2"
                  >
                    {performerData[selectedPerformer]?.movements?.[selectedMovement]?.map(set => (
                      <option key={set.set} value={set.set}>
                        Set {set.set}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Target Position Display */}
              {targetSet && (
                <div className="border-t border-red-500/30 pt-4">
                  <h3 className="text-white/60 text-sm mb-2">Target Position:</h3>
                  <div className="text-white text-sm space-y-1">
                    <div>{targetSet.leftRight}</div>
                    <div>{targetSet.homeVisitor}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Position Status */}
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm mb-6">
              <div className={`flex flex-col items-center ${getStatusColor()}`}>
                {getStatusIcon()}
                <div className="text-center">
                  {distance && distance.steps < 0.2 ? (
                    <div>
                      <p className="text-2xl font-bold">ON SPOT!</p>
                      <p className="text-sm text-white/60">Within 0.2 steps</p>
                    </div>
                  ) : distance ? (
                    <div>
                      <p className="text-2xl font-bold">{distance.steps.toFixed(1)} steps off</p>
                      <p className="text-sm text-white/60">
                        Move {distance.direction > 0 ? 'forward' : 'backward'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl">Calculating position...</p>
                      <p className="text-sm text-white/60">Waiting for UWB data</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Accuracy Indicator */}
              {currentPosition && (
                <div className="text-center text-white/60 text-sm">
                  Accuracy: ±{(currentPosition.accuracy * 1.6).toFixed(1)} steps
                  {currentPosition.degraded && (
                    <span className="text-yellow-400 ml-2">(Degraded)</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Field Position Display */}
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm mb-6">
              <h3 className="text-white/60 text-sm mb-3 text-center">Field View</h3>
              <FieldPositionDisplay
                currentPosition={currentPosition}
                targetPosition={parseTargetPosition()}
                showTarget={true}
              />
              <div className="mt-3 flex items-center justify-center space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full border border-white mr-1"></div>
                  <span className="text-white/60">Current</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="3" fill="none" stroke="#facc15" strokeWidth="1"/>
                    <line x1="5" y1="8" x2="11" y2="8" stroke="#facc15" strokeWidth="1"/>
                    <line x1="8" y1="5" x2="8" y2="11" stroke="#facc15" strokeWidth="1"/>
                  </svg>
                  <span className="text-white/60">Target</span>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                onClick={() => setHapticEnabled(!hapticEnabled)}
                className={`text-sm ${hapticEnabled ? 'text-white' : 'text-white/40'} hover:text-white`}
              >
                Haptic: {hapticEnabled ? 'ON' : 'OFF'}
              </button>
              <span className="text-white/30">|</span>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-white/60 text-sm hover:text-white"
              >
                {showDebug ? 'Hide' : 'Show'} Debug
              </button>
            </div>
            
            {showDebug && currentPosition && (
              <div className="bg-black/40 border border-white/20 rounded-lg p-4 mb-6 font-mono text-xs">
                <div className="text-white/80 space-y-1">
                  <div>Position: ({currentPosition.x.toFixed(2)}, {currentPosition.y.toFixed(2)}) yards</div>
                  <div>Anchors: {currentPosition.anchorCount}</div>
                  <div>Accuracy: ±{currentPosition.accuracy.toFixed(2)} yards</div>
                  <div>Update Rate: 10 Hz</div>
                </div>
              </div>
            )}
            
            {/* Simulation Controls (POC only) */}
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm mb-3">
                <span className="font-semibold">POC Mode:</span> This is a simulation. 
                In production, this would use real UWB hardware.
              </p>
              <button
                onClick={simulateMovement}
                className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-200 px-4 py-2 rounded border border-yellow-500/30 text-sm"
              >
                Simulate Movement
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpotCheckerPage;