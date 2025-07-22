import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, RotateCw, Crosshair, AlertCircle } from 'lucide-react';

const SlideTrackerCameraPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [stream, setStream] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [referenceFrame, setReferenceFrame] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [driftWarning, setDriftWarning] = useState(false);
  const animationRef = useRef(null);
  const processingRef = useRef(false);

  // Request camera permission and start stream
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      setErrorMessage('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', error);
    }
  };

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    
    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Process video frames for rotation detection
  const processFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isCalibrated || processingRef.current) return;
    
    processingRef.current = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    if (referenceFrame) {
      // Compare current frame with reference frame to detect rotation
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple edge detection to find vertical lines
      const edges = detectVerticalEdges(currentImageData);
      const angle = estimateRotation(edges, referenceFrame);
      
      setRotationAngle(angle);
      setDriftWarning(Math.abs(angle) > 5); // Warning if more than 5 degrees rotation
    }
    
    // Draw overlay
    drawOverlay();
    
    processingRef.current = false;
    animationRef.current = requestAnimationFrame(processFrame);
  };

  // Detect vertical edges in the image
  const detectVerticalEdges = (imageData) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edges = [];
    
    // Sample vertical lines across the image
    for (let x = 20; x < width - 20; x += 10) {
      let edgeStrength = 0;
      
      for (let y = 20; y < height - 20; y += 5) {
        const idx = (y * width + x) * 4;
        const leftIdx = (y * width + (x - 5)) * 4;
        const rightIdx = (y * width + (x + 5)) * 4;
        
        // Calculate horizontal gradient
        const gradient = Math.abs(data[idx] - data[leftIdx]) + 
                        Math.abs(data[idx] - data[rightIdx]);
        
        edgeStrength += gradient;
      }
      
      edges.push({ x, strength: edgeStrength });
    }
    
    return edges;
  };

  // Estimate rotation by comparing edge patterns
  const estimateRotation = (currentEdges, referenceEdges) => {
    if (!referenceEdges || currentEdges.length !== referenceEdges.length) return 0;
    
    let bestShift = 0;
    let minDifference = Infinity;
    
    // Try different horizontal shifts to find best match
    for (let shift = -30; shift <= 30; shift++) {
      let difference = 0;
      
      for (let i = 0; i < currentEdges.length; i++) {
        const refIndex = Math.max(0, Math.min(i + shift, currentEdges.length - 1));
        difference += Math.abs(currentEdges[i].strength - referenceEdges[refIndex].strength);
      }
      
      if (difference < minDifference) {
        minDifference = difference;
        bestShift = shift;
      }
    }
    
    // Convert pixel shift to approximate rotation angle
    const fov = 60; // Approximate field of view in degrees
    const angle = (bestShift / currentEdges.length) * fov;
    
    return angle;
  };

  // Draw overlay showing alignment guides
  const drawOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !videoRef.current) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    // Clear previous overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw vertical reference lines
    ctx.strokeStyle = isCalibrated ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    
    // Side guide lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(centerX - 100, 0);
    ctx.lineTo(centerX - 100, canvas.height);
    ctx.moveTo(centerX + 100, 0);
    ctx.lineTo(centerX + 100, canvas.height);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw rotation indicator if calibrated
    if (isCalibrated) {
      // Draw horizon line that tilts with rotation
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationAngle * Math.PI / 180);
      
      // Horizon line
      ctx.strokeStyle = driftWarning ? '#ff0000' : '#00ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-150, 0);
      ctx.lineTo(150, 0);
      ctx.stroke();
      
      // Rotation indicators
      ctx.fillStyle = driftWarning ? '#ff0000' : '#00ff00';
      ctx.beginPath();
      ctx.moveTo(150, 0);
      ctx.lineTo(140, -5);
      ctx.lineTo(140, 5);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(-150, 0);
      ctx.lineTo(-140, -5);
      ctx.lineTo(-140, 5);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
      
      // Draw angle text
      ctx.fillStyle = driftWarning ? '#ff0000' : '#00ff00';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.abs(rotationAngle).toFixed(1)}°`, centerX, 40);
      
      if (Math.abs(rotationAngle) > 1) {
        ctx.font = '16px sans-serif';
        ctx.fillText(rotationAngle > 0 ? '← Rotate Left' : 'Rotate Right →', centerX, 65);
      }
    }
    
    // Draw center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY);
    ctx.lineTo(centerX + 40, centerY);
    ctx.moveTo(centerX, centerY - 40);
    ctx.lineTo(centerX, centerY + 40);
    ctx.stroke();
  };

  // Handle calibration
  const handleCalibrate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Store reference frame edge pattern
    const edges = detectVerticalEdges(imageData);
    setReferenceFrame(edges);
    setIsCalibrated(true);
    setRotationAngle(0);
    
    // Start processing
    animationRef.current = requestAnimationFrame(processFrame);
  };

  const handleReset = () => {
    setIsCalibrated(false);
    setReferenceFrame(null);
    setRotationAngle(0);
    setDriftWarning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Calculate drift status
  const getDriftStatus = () => {
    const angle = Math.abs(rotationAngle);
    if (angle < 2) return { color: '#22c55e', text: 'ALIGNED' };
    if (angle < 5) return { color: '#eab308', text: 'SLIGHT ROTATION' };
    if (angle < 10) return { color: '#f97316', text: 'ROTATING' };
    return { color: '#ef4444', text: 'OFF ANGLE' };
  };

  const driftStatus = getDriftStatus();

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
            <Camera className="w-8 h-8 text-white mr-2" />
            <h1 className="text-2xl font-bold text-white">Slide Angle Tracker</h1>
          </div>
          <p className="text-white/60 text-sm">Maintain proper horn angle while marching</p>
        </div>

        {!hasPermission ? (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-white text-center mb-4">
              Camera access is required for visual tracking.
            </p>
            <button
              onClick={startCamera}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors font-semibold"
            >
              Enable Camera
            </button>
            {errorMessage && (
              <p className="text-red-300 text-sm mt-2 text-center">{errorMessage}</p>
            )}
          </div>
        ) : (
          <>
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg overflow-hidden backdrop-blur-sm mb-6">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full"
                  style={{ maxHeight: '300px', objectFit: 'cover' }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ maxHeight: '300px' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {isCalibrated && (
                  <div className={`absolute top-4 right-4 px-3 py-2 rounded-lg font-semibold text-sm`}
                    style={{ backgroundColor: driftStatus.color + '33', color: driftStatus.color, border: `2px solid ${driftStatus.color}` }}
                  >
                    {driftStatus.text}
                  </div>
                )}
              </div>
              
              {isCalibrated && (
                <div className="p-4 bg-black/40">
                  <div className="text-center">
                    <div className="text-white text-lg font-mono">
                      Angle: {rotationAngle > 0 ? '←' : '→'} {Math.abs(rotationAngle).toFixed(1)}°
                    </div>
                    <div className="text-white/60 text-sm">
                      {Math.abs(rotationAngle) < 2 ? 'Perfect alignment' : 'Rotate to center the horizon line'}
                    </div>
                  </div>
                </div>
              )}
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
                <li>1. Mount phone at eye level pointing forward</li>
                <li>2. Stand in correct playing position</li>
                <li>3. Tap "Lock Position" to calibrate</li>
                <li>4. The overlay will show if you rotate your shoulders</li>
                <li>5. Keep the green horizon line level while marching</li>
              </ol>
            </div>

            <div className="mt-4 bg-green-400/10 border border-green-400/30 rounded-lg p-3">
              <p className="text-green-200 text-xs">
                <span className="font-semibold">What it detects:</span> The camera tracks vertical lines in the environment. 
                When you rotate your shoulders, these lines shift horizontally in the camera view, indicating angle change.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SlideTrackerCameraPage;