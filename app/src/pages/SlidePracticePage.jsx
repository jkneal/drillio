import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock, RotateCw, Gauge } from 'lucide-react';

const SlidePracticePage = () => {
  const navigate = useNavigate();
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [calibrationAngle, setCalibrationAngle] = useState(0);
  const [relativeAngle, setRelativeAngle] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [driftWarning, setDriftWarning] = useState(false);
  const canvasRef = useRef(null);

  // Check if device orientation is supported
  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      setErrorMessage('Device orientation is not supported on this device.');
    } else if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires permission
      setHasPermission(false);
    } else {
      // Non-iOS devices or older iOS versions
      setHasPermission(true);
    }
  }, []);

  // Request permission for iOS devices
  const requestPermission = async () => {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === 'granted') {
        setHasPermission(true);
        setErrorMessage('');
      } else {
        setErrorMessage('Permission denied. Please enable motion sensors in settings.');
      }
    } catch (error) {
      setErrorMessage('Error requesting permission: ' + error.message);
    }
  };

  // Handle device orientation
  useEffect(() => {
    if (!hasPermission || !isSupported) return;

    const handleOrientation = (event) => {
      // Alpha represents the compass direction (rotation around z-axis)
      // Beta represents the front-to-back tilt in degrees
      // Gamma represents the left-to-right tilt in degrees
      
      // For horn players, we want to detect rotation (yaw) not tilt
      // Using alpha for left-right rotation detection
      const angle = event.alpha || 0;
      setCurrentAngle(angle);
      
      if (isCalibrated) {
        // Calculate relative angle from calibration point
        let relative = angle - calibrationAngle;
        
        // Handle wrap-around (e.g., 359° to 1° should be 2°, not -358°)
        if (relative > 180) relative -= 360;
        if (relative < -180) relative += 360;
        
        // Normalize to -90 to 90 range for display
        if (relative > 90) relative = 90;
        if (relative < -90) relative = -90;
        
        setRelativeAngle(relative);
        
        // Check if drifting off position
        const drift = Math.abs(relative);
        setDriftWarning(drift > 5); // Warning if more than 5 degrees off
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [hasPermission, isSupported, isCalibrated, calibrationAngle]);

  // Draw the visual indicator
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw stability indicator
    const radius = Math.min(width, height) * 0.3;
    
    if (isCalibrated) {
      // Determine status based on drift
      const drift = Math.abs(relativeAngle);
      let statusColor, statusText, bgColor;
      
      if (drift < 2) {
        statusColor = '#22c55e'; // Green
        statusText = 'LOCKED';
        bgColor = 'rgba(34, 197, 94, 0.1)';
      } else if (drift < 5) {
        statusColor = '#eab308'; // Yellow
        statusText = 'SLIGHT DRIFT';
        bgColor = 'rgba(234, 179, 8, 0.1)';
      } else if (drift < 10) {
        statusColor = '#f97316'; // Orange
        statusText = 'DRIFTING';
        bgColor = 'rgba(249, 115, 22, 0.1)';
      } else {
        statusColor = '#ef4444'; // Red
        statusText = 'OFF POSITION';
        bgColor = 'rgba(239, 68, 68, 0.1)';
      }

      // Draw background circle
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw outer ring
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw center target
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Draw crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY);
      ctx.lineTo(centerX + 20, centerY);
      ctx.moveTo(centerX, centerY - 20);
      ctx.lineTo(centerX, centerY + 20);
      ctx.stroke();

      // Draw drift indicator
      const indicatorAngle = (relativeAngle * Math.PI) / 180 - Math.PI / 2;
      const indicatorDistance = Math.min(drift * 3, radius - 20); // Scale drift for visibility
      const indicatorX = centerX + Math.cos(indicatorAngle) * indicatorDistance;
      const indicatorY = centerY + Math.sin(indicatorAngle) * indicatorDistance;

      // Draw line from center to indicator
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(indicatorX, indicatorY);
      ctx.stroke();

      // Draw indicator dot
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(indicatorX, indicatorY, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw status text
      ctx.fillStyle = statusColor;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusText, centerX, centerY + radius + 30);

      // Draw angle readout
      ctx.fillStyle = '#ffffff60';
      ctx.font = '14px monospace';
      ctx.fillText(`${drift.toFixed(1)}° drift`, centerX, centerY + radius + 50);

      // Visual warning flash for significant drift
      if (driftWarning) {
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3; // Pulsing effect
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      // Draw calibration prompt
      ctx.fillStyle = '#ffffff60';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Hold horn in playing position', centerX, centerY - 10);
      ctx.fillText('and tap "Lock Position"', centerX, centerY + 10);
    }
  }, [relativeAngle, isCalibrated, driftWarning]);

  const handleCalibrate = () => {
    setCalibrationAngle(currentAngle);
    setIsCalibrated(true);
    setRelativeAngle(0);
  };

  const handleReset = () => {
    setIsCalibrated(false);
    setRelativeAngle(0);
    setCalibrationAngle(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-white hover:text-red-200 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span>Back</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <Gauge className="w-8 h-8 text-white mr-2" />
            <h1 className="text-2xl font-bold text-white">Slide Practice</h1>
          </div>
          <p className="text-white/60 text-sm">Train your horn slide positions</p>
        </div>

        {!isSupported ? (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm">
            <p className="text-white text-center">{errorMessage}</p>
          </div>
        ) : !hasPermission ? (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm">
            <p className="text-white text-center mb-4">
              This feature requires access to your device's motion sensors.
            </p>
            <button
              onClick={requestPermission}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors font-semibold"
            >
              Enable Motion Sensors
            </button>
            {errorMessage && (
              <p className="text-red-300 text-sm mt-2 text-center">{errorMessage}</p>
            )}
          </div>
        ) : (
          <>
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm mb-6">
              <canvas
                ref={canvasRef}
                width={300}
                height={200}
                className="w-full max-w-sm mx-auto"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>

            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm mb-6">
              <div className="flex justify-center space-x-4">
                {!isCalibrated ? (
                  <button
                    onClick={handleCalibrate}
                    className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg px-6 py-3 transition-all duration-200 flex items-center"
                  >
                    <Lock className="w-5 h-5 text-green-300 mr-2" />
                    <span className="text-white font-semibold">Lock Position</span>
                  </button>
                ) : (
                  <button
                    onClick={handleReset}
                    className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg px-6 py-3 transition-all duration-200 flex items-center"
                  >
                    <RotateCw className="w-5 h-5 text-yellow-300 mr-2" />
                    <span className="text-white font-semibold">Recalibrate</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-3">How to Use</h3>
              <ol className="text-white/80 text-sm space-y-2">
                <li>Hold your horn in playing position</li>
                <li>Position your phone where you can see it while playing</li>
                <li>Tap "Lock Position" to set your reference</li>
                <li>The indicator will alert you if you drift from position</li>
                <li>Keep the indicator centered and green while playing</li>
              </ol>
            </div>

            <div className="mt-4 bg-green-400/10 border border-green-400/30 rounded-lg p-3">
              <p className="text-green-200 text-xs">
                <span className="font-semibold">Goal:</span> Maintain a stable horn position throughout your performance. 
                The visual feedback helps develop muscle memory for consistent slide positioning.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SlidePracticePage;