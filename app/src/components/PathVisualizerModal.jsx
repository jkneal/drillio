import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, ChevronDown, ZoomIn, ZoomOut, Maximize2, Map, Music, StickyNote, Brain, CheckCircle, XCircle, Trophy, Volume2, VolumeX } from 'lucide-react';
import { performerData } from '../data/performerData';
import { rehearsalMarks } from '../data/rehearsalMarks';
import DrillChartModal from './DrillChartModal';
import MusicModal from './MusicModal';
import NotesModal from './NotesModal';
import NicknameBadge from './NicknameBadge';
import { musicConfig } from '../data/musicConfig';
import { audioService } from '../services/audioService';

const PathVisualizerModal = ({ 
  show, 
  onClose, 
  performerData: currentPerformerData,
  movement,
  performerId,
  isStaffView = false
}) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [showPaths, setShowPaths] = useState(false);
  const [showOtherPerformers, setShowOtherPerformers] = useState(true);
  const [show4StepMarks, setShow4StepMarks] = useState(false);
  const [directorView, setDirectorView] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 1 for transition
  const [currentCount, setCurrentCount] = useState(0);
  const [stepFlashVisible, setStepFlashVisible] = useState(false);
  const [zoomToFit, setZoomToFit] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 1.0 = normal, 0.9 = 90%, 0.75 = 75%
  const animationRef = useRef(null);
  const [logoImage, setLogoImage] = useState(null);
  const [animatedCenter, setAnimatedCenter] = useState({ x: 0, y: 0 });
  const lastCenterRef = useRef({ x: 0, y: 0 });
  const currentTransformRef = useRef({ scale: 1, centerX: 0, centerY: 0 });
  // Initialize selectedPerformerId with a saved value if in staff view
  const [selectedPerformerId, setSelectedPerformerId] = useState(() => {
    if (isStaffView) {
      // Try to get saved performer for this movement from localStorage
      const savedPerformer = localStorage.getItem(`pathViz_staffPerformer_${movement}`);
      return savedPerformer || null;
    }
    return performerId;
  });

  // Update selectedPerformerId when component remounts with different props
  useEffect(() => {
    if (isStaffView && show) {
      // When modal opens in staff view, restore saved performer
      const savedPerformer = localStorage.getItem(`pathViz_staffPerformer_${movement}`);
      if (savedPerformer) {
        setSelectedPerformerId(savedPerformer);
      }
    } else if (!isStaffView && performerId !== selectedPerformerId) {
      // In non-staff view, sync with performerId prop
      setSelectedPerformerId(performerId);
    }
  }, [show, movement, isStaffView]);
  const [showDrillChart, setShowDrillChart] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
  // Quiz mode states
  const [quizMode, setQuizMode] = useState(false);
  const [quizStep, setQuizStep] = useState(null); // 'position', 'counts', 'facing', 'music'
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [quizClickPosition, setQuizClickPosition] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [previousOptions, setPreviousOptions] = useState(null); // Store options before quiz
  const [previousZoomState, setPreviousZoomState] = useState(null); // Store zoom state before animation
  const [showPerfectBadge, setShowPerfectBadge] = useState(false);
  const [trophyCount, setTrophyCount] = useState(0);
  const [quizStartIndex, setQuizStartIndex] = useState(0); // Track where quiz started
  const [crossMovementQuizCompleted, setCrossMovementQuizCompleted] = useState(false); // Track if we've done the cross-movement quiz
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [finalQuizScore, setFinalQuizScore] = useState({ correct: 0, total: 0 });
  
  // Audio states
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioInitializedRef = useRef(false);
  const [isCountingOff, setIsCountingOff] = useState(false);
  const [countOffNumber, setCountOffNumber] = useState(0);
  
  // Load trophy count when movement changes
  useEffect(() => {
    if (movement) {
      const trophyKey = `quiz_trophies_movement_${movement}`;
      const count = parseInt(localStorage.getItem(trophyKey) || '0');
      setTrophyCount(count);
    }
  }, [movement]);
  
  // Function to highlight numbers in position text
  const highlightNumbers = (text) => {
    if (!text) return null;
    
    // Split by numbers (including decimals) while keeping the delimiters
    const parts = text.split(/(\d+\.?\d*)/);
    
    return parts.map((part, index) => {
      // Check if this part is a number
      if (/^\d+\.?\d*$/.test(part)) {
        return (
          <span key={index} className="text-yellow-300 font-bold">
            {part}
          </span>
        );
      }
      return part;
    });
  };
  
  // Load logo image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoImage(img);
    img.src = '/HSlogo.png';
  }, []);

  // Save selected performer for staff view
  useEffect(() => {
    if (isStaffView && selectedPerformerId) {
      localStorage.setItem(`pathViz_staffPerformer_${movement}`, selectedPerformerId);
    }
  }, [isStaffView, selectedPerformerId, movement]);
  
  // Initialize audio when movement changes
  useEffect(() => {
    if (show && movement && (movement === '1' || movement === '2')) {
      // Get movement data to pass to audio service
      const movementData = selectedPerformerId && performerData[selectedPerformerId]?.movements[movement] 
        ? performerData[selectedPerformerId].movements[movement]
        : currentPerformerData?.movements[movement] || [];
      
      // Load audio for this movement
      const initAudio = async () => {
        // Initialize audio context first (important for mobile)
        await audioService.initialize();
        const buffer = await audioService.loadMovementAudio(movement);
        if (buffer) {
          // Set movement data for accurate marker calculation
          audioService.setMovementData(movement, movementData);
          setAudioLoaded(true);
          audioInitializedRef.current = true;
        }
      };
      initAudio();
    }
  }, [show, movement, selectedPerformerId, currentPerformerData]);
  
  // Cleanup animation and audio when modal closes
  useEffect(() => {
    if (!show) {
      // Stop animation
      setIsPlaying(false);
      // Cancel any running animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Emergency stop audio to ensure it stops completely
      audioService.emergencyStop();
      // Reset state
      setCurrentSetIndex(0);
      setAnimationProgress(0);
      setCurrentCount(0);
      setStepFlashVisible(false);
      setIsCountingOff(false);
      setCountOffNumber(0);
      // Reset zoom state
      setPreviousZoomState(null);
      // Reset smooth center tracking only when modal closes
      if (!show) {
        lastCenterRef.current = { x: 0, y: 0 };
      }
      // Don't reset zoom - preserve user's preference
      // Reset quiz mode
      setQuizMode(false);
      setQuizStep(null);
      setQuizAnswers({});
      setShowQuizFeedback(false);
      setQuizClickPosition(null);
    }
  }, [show]);
  
  // Field configuration
  const FIELD_CONFIG = 'high_school'; // 'high_school', 'college', or 'pro'
  
  // Field dimensions (in pixels for rendering)
  // Actual field: 120 yards long (with end zones) x 53.33 yards wide
  // Aspect ratio: 120/53.33 = 2.25
  const FIELD_LENGTH = 900; // 120 yards (including end zones)
  const FIELD_WIDTH = 400; // 53.33 yards 
  const PIXELS_PER_YARD_LENGTH = FIELD_LENGTH / 120; // 7.5 pixels per yard
  const PIXELS_PER_YARD_WIDTH = FIELD_WIDTH / 53.33; // ~7.5 pixels per yard
  
  // Scale factor to make circles appear round
  const ASPECT_RATIO = PIXELS_PER_YARD_WIDTH / PIXELS_PER_YARD_LENGTH; // ~1.0 (should be equal now)
  
  // 8-to-5 step: 8 steps = 5 yards, so 1 step = 5/8 yards = 0.625 yards
  const STEP_SIZE_YARDS = 0.625;
  
  // Hash mark distances from sideline (in yards)
  const HASH_DISTANCES = {
    high_school: 53.33 / 3, // ~17.78 yards from each sideline
    college: 20, // 60 feet = 20 yards from each sideline  
    pro: 23.58 // 70 feet 9 inches from each sideline
  };
  
  const HASH_FROM_SIDELINE = HASH_DISTANCES[FIELD_CONFIG];
  
  // Calculate hash positions in pixels
  const HOME_HASH_Y = HASH_FROM_SIDELINE * PIXELS_PER_YARD_WIDTH;
  const VISITOR_HASH_Y = FIELD_WIDTH - (HASH_FROM_SIDELINE * PIXELS_PER_YARD_WIDTH);
  
  // Convert position string to x,y coordinates
  const parsePosition = (leftRight, frontBack) => {
    let x = 0;
    let y = 0;
    
    // Add safety check for undefined inputs
    if (!leftRight || !frontBack) {
      console.error('parsePosition called with invalid inputs:', { leftRight, frontBack });
      return { x: 0, y: 0 };
    }
    
    // Parse left-right position
    // Format examples:
    // "Left: 4 steps Inside 30 yd ln"
    // "Right: 2 steps Outside 45 yd ln"
    // "Left: On 35 yd ln"
    // "Right: 3.5 steps Inside 50 yd ln"
    
    // Special case for "On" positions
    const onMatch = leftRight.match(/^(Left|Right):\s*On\s*(\d+)\s*yd ln$/i);
    if (onMatch) {
      const [, direction, yardLine] = onMatch;
      const yardLineNum = parseInt(yardLine);
      
      // STEP 1: Map Left/Right to screen coordinates
      // Left in coordinates → Right on screen
      // Right in coordinates → Left on screen
      if (direction === 'Left') {
        // Left = right side of screen (home side)
        x = FIELD_LENGTH / 2 + (50 - yardLineNum) * PIXELS_PER_YARD_LENGTH;
      } else {
        // Right = left side of screen (visitor side)
        x = FIELD_LENGTH / 2 - (50 - yardLineNum) * PIXELS_PER_YARD_LENGTH;
      }
    } else {
      // Regular position with steps
      const leftRightMatch = leftRight.match(/^(Left|Right):\s*([\d.]+)\s*steps?\s*(Inside|Outside)?\s*(\d+)\s*yd ln$/i);
      if (leftRightMatch) {
        const [, direction, steps, inOut, yardLine] = leftRightMatch;
        const stepsNum = parseFloat(steps);
        const yardLineNum = parseInt(yardLine);
        
        // STEP 1: Map Left/Right to screen coordinates
        // Left in coordinates → Right on screen
        // Right in coordinates → Left on screen
        if (direction === 'Left') {
          // Left = right side of screen (home side)
          x = FIELD_LENGTH / 2 + (50 - yardLineNum) * PIXELS_PER_YARD_LENGTH;
        } else {
          // Right = left side of screen (visitor side)
          x = FIELD_LENGTH / 2 - (50 - yardLineNum) * PIXELS_PER_YARD_LENGTH;
        }
        
        // Apply step offset
        const stepOffsetPixels = stepsNum * STEP_SIZE_YARDS * PIXELS_PER_YARD_LENGTH;
        
        // STEP 2: Apply Inside/Outside offsets
        // Inside always means toward the 50
        // Outside always means away from the 50 (toward the end zone)
        
        if (inOut && inOut.toLowerCase() === 'inside') {
          if (direction === 'Left') {
            // Left = on RIGHT side of screen
            // On right side: Inside goes left (toward 50)
            x -= stepOffsetPixels;
          } else {
            // Right = on LEFT side of screen
            // On left side: Inside goes right (toward 50)
            x += stepOffsetPixels;
          }
        } else if (inOut && inOut.toLowerCase() === 'outside') {
          if (direction === 'Left') {
            // Left = on RIGHT side of screen
            // On right side: Outside goes right (away from 50)
            x += stepOffsetPixels;
          } else {
            // Right = on LEFT side of screen
            // On left side: Outside goes left (away from 50)
            x -= stepOffsetPixels;
          }
        } else {
          // No Inside/Outside specified
          // This shouldn't happen in marching band drill, but handle it gracefully
          // Just place at the yard line without offset
        }
      }
    }
    
    // Parse front-back position
    // Format examples:
    // "8 steps behind Home side line"
    // "4 steps in front of Home Hash (HS)"
    // "12 steps behind Front side line"
    // "On Back Hash (HS)"
    
    // Special case for "On" positions
    const fbOnMatch = frontBack.match(/^On\s+(.+)$/i);
    if (fbOnMatch) {
      const reference = fbOnMatch[1].toLowerCase();
      if (reference.includes('home hash')) {
        y = HOME_HASH_Y;
      } else if (reference.includes('visitor hash') || reference.includes('vis hash')) {
        y = VISITOR_HASH_Y;
      } else if (reference.includes('home side')) {
        y = 0; // Top of field
      } else if (reference.includes('visitor side') || reference.includes('vis side')) {
        y = FIELD_WIDTH; // Bottom of field
      } else if (reference.includes('front side')) {
        y = 0;
      } else if (reference.includes('back side')) {
        y = FIELD_WIDTH;
      }
    } else {
      // Regular position with steps
      const frontBackMatch = frontBack.match(/^([\d.]+)\s*steps?\s*(in front of|behind|In Front|Behind)\s+(.+)$/i);
      if (frontBackMatch) {
        const [, steps, direction, reference] = frontBackMatch;
        const stepsNum = parseFloat(steps);
        const stepOffsetPixels = stepsNum * STEP_SIZE_YARDS * PIXELS_PER_YARD_WIDTH;
        const isBehind = direction.toLowerCase().includes('behind');
        const ref = reference.toLowerCase();
        
        // Determine base position
        if (ref.includes('home hash')) {
          y = HOME_HASH_Y;
        } else if (ref.includes('visitor hash') || ref.includes('vis hash')) {
          y = VISITOR_HASH_Y;
        } else if (ref.includes('home side')) {
          y = 0;
        } else if (ref.includes('visitor side') || ref.includes('vis side')) {
          y = FIELD_WIDTH;
        } else if (ref.includes('front side')) {
          y = 0;
        } else if (ref.includes('back side')) {
          y = FIELD_WIDTH;
        }
        
        // Apply offset
        // "Behind" means toward back field (larger y)
        // "In front of" means toward front field (smaller y)
        if (isBehind) {
          y += stepOffsetPixels;
        } else {
          y -= stepOffsetPixels;
        }
      }
    }
    
    return { x, y };
  };
  
  // Get the quiz "to" set index
  const getQuizToSetIndex = () => {
    if (quizMode && movement !== '1' && currentSetIndex === 0 && !crossMovementQuizCompleted) {
      return 0; // First set of the movement (for cross-movement quiz)
    }
    return currentSetIndex + 1; // Normal case
  };
  
  // Get the quiz "from" set when at the first set of a movement
  const getQuizFromSet = () => {
    const movementData = getMovementData();
    
    // If we're in quiz mode and at the first set of a non-first movement AND haven't completed the cross-movement quiz yet
    if (quizMode && movement !== '1' && currentSetIndex === 0 && !crossMovementQuizCompleted) {
      // Get the last set of the previous movement
      const prevMovement = (parseInt(movement) - 1).toString();
      const currentPerformerId = isStaffView ? selectedPerformerId : performerId;
      
      if (currentPerformerId && performerData[currentPerformerId]?.movements?.[prevMovement]) {
        const prevMovementSets = performerData[currentPerformerId].movements[prevMovement];
        return prevMovementSets[prevMovementSets.length - 1] || null;
      }
    }
    
    // Normal case - use current set from current movement
    return movementData[currentSetIndex];
  };
  
  // Get all positions for the current movement
  const getMovementData = () => {
    let movementData = [];
    
    // In staff view, use selected performer if available
    if (isStaffView && selectedPerformerId && performerData[selectedPerformerId]) {
      const performer = performerData[selectedPerformerId];
      if (performer.movements) {
        if (movement === '2' && performer.movements['1']) {
          // For movement 2, prepend set 13 from movement 1 as the starting position
          const movement1Data = performer.movements['1'];
          const set13 = movement1Data[movement1Data.length - 1]; // Last set of movement 1
          if (set13 && set13.set === 13) {
            movementData = [set13, ...(performer.movements[movement] || [])];
          } else {
            movementData = performer.movements[movement] || [];
          }
        } else {
          movementData = performer.movements[movement] || [];
        }
      }
    } else {
      // Otherwise use passed performer data
      if (!currentPerformerData?.movements) return [];
      
      if (movement === '2' && currentPerformerData.movements['1']) {
        // For movement 2, prepend set 13 from movement 1 as the starting position
        const movement1Data = currentPerformerData.movements['1'];
        const set13 = movement1Data[movement1Data.length - 1]; // Last set of movement 1
        if (set13 && set13.set === 13) {
          movementData = [set13, ...(currentPerformerData.movements[movement] || [])];
        } else {
          movementData = currentPerformerData.movements[movement] || [];
        }
      } else {
        movementData = currentPerformerData.movements[movement] || [];
      }
    }
    
    return movementData;
  };
  
  // Check if music is available for the current set
  const getMusicAvailability = (setNumber) => {
    if (!movement || !musicConfig[movement]) return false;
    
    // Use selectedPerformerId for staff view
    const currentPerformerId = isStaffView ? selectedPerformerId : performerId;
    
    // If in staff view without a selected performer, use Staff prefix
    let prefix = 'Staff';
    
    if (currentPerformerId) {
      if (currentPerformerId.startsWith('SD')) {
        prefix = 'SD';
      } else if (currentPerformerId.startsWith('TD')) {
        prefix = 'TD';
      } else if (currentPerformerId.startsWith('BD')) {
        prefix = 'BD';
      }
    }
    
    // Check if music is available for this specific set
    return musicConfig[movement]?.[prefix]?.[String(setNumber)] || false;
  };

  // Check if there's a note for the current set
  const checkHasNote = (setNumber) => {
    const currentPerformerId = isStaffView ? selectedPerformerId : performerId;
    if (!currentPerformerId || currentPerformerId === 'Staff') return false;
    
    const key = `note_${currentPerformerId}_${movement}_${setNumber}`;
    return localStorage.getItem(key) !== null;
  };
  
  // Calculate bounding box for zoom to fit - includes current and next positions for smooth transitions
  const calculateBoundingBox = (currentSetNumber, includeNext = true) => {
    const positions = [];
    const movementData = getMovementData();
    
    // Add current performer position
    let currentSet = movementData.find(s => s.set === currentSetNumber);
    
    // If not found in current movement and we're in quiz mode at first set of non-first movement
    if (!currentSet && quizMode && movement !== '1' && currentSetIndex === 0) {
      // Look for the set in the previous movement (this is the "from" set in quiz)
      const prevMovement = (parseInt(movement) - 1).toString();
      const currentPerformerId = isStaffView ? selectedPerformerId : performerId;
      if (currentPerformerId && performerData[currentPerformerId]?.movements?.[prevMovement]) {
        const prevMovementSets = performerData[currentPerformerId].movements[prevMovement];
        currentSet = prevMovementSets[prevMovementSets.length - 1];
      }
    }
    
    if (currentSet) {
      const posRaw = parsePosition(currentSet.leftRight, currentSet.homeVisitor);
      const pos = transformForDirectorView(posRaw.x, posRaw.y);
      positions.push(pos);
    }
    
    // Add next set position to smooth transitions
    if (includeNext && currentSetNumber < movementData.length) {
      const nextSet = movementData.find(s => s.set === currentSetNumber + 1);
      if (nextSet) {
        const posRaw = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
        const pos = transformForDirectorView(posRaw.x, posRaw.y);
        positions.push(pos);
      }
    }
    
    // Add other performers if shown
    if (showOtherPerformers) {
      Object.keys(performerData).forEach(otherPerformerId => {
        if (otherPerformerId === selectedPerformerId || otherPerformerId === 'Staff') return;
        
        const otherPerformer = performerData[otherPerformerId];
        let otherSet = null;
        
        if (otherPerformer.movements && otherPerformer.movements[movement]) {
          otherSet = otherPerformer.movements[movement].find(s => s.set === currentSetNumber);
        }
        
        // If not found and we're in quiz mode at first set of non-first movement
        if (!otherSet && quizMode && movement !== '1' && currentSetIndex === 0) {
          const prevMovement = (parseInt(movement) - 1).toString();
          if (otherPerformer.movements && otherPerformer.movements[prevMovement]) {
            const prevMovementSets = otherPerformer.movements[prevMovement];
            otherSet = prevMovementSets[prevMovementSets.length - 1];
          }
        }
        
        if (otherSet) {
          const posRaw = parsePosition(otherSet.leftRight, otherSet.homeVisitor);
          const pos = transformForDirectorView(posRaw.x, posRaw.y);
          positions.push(pos);
        }
        
        // Include next positions for other performers too
        if (includeNext && currentSetNumber < movementData.length) {
          const nextSet = otherPerformer.movements[movement].find(s => s.set === currentSetNumber + 1);
          if (nextSet) {
            const posRaw = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
            const pos = transformForDirectorView(posRaw.x, posRaw.y);
            positions.push(pos);
          }
        }
      });
    }
    
    if (positions.length === 0) return null;
    
    // Find min/max coordinates
    let minX = positions[0].x;
    let maxX = positions[0].x;
    let minY = positions[0].y;
    let maxY = positions[0].y;
    
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });
    
    // Add padding around performers
    const paddingYards = 6; // yards of padding - balanced for good zoom
    const paddingPixels = paddingYards * PIXELS_PER_YARD_LENGTH; // Use same scale for both dimensions
    
    // Calculate the bounding box dimensions
    let width = maxX - minX + (paddingPixels * 2);
    let height = maxY - minY + (paddingPixels * 2); // Use same padding pixels for both dimensions
    
    // Ensure minimum size - can be smaller now since yard markers are drawn separately
    const minWidthYards = 30; // Balanced for good zoom
    const minWidthPixels = minWidthYards * PIXELS_PER_YARD_LENGTH;
    if (width < minWidthPixels) {
      const extraPadding = (minWidthPixels - width) / 2;
      minX -= extraPadding;
      width = minWidthPixels;
    }
    
    // Ensure minimum height - can be smaller now since yard markers are drawn separately
    const minHeightYards = 25; // Further increased for less zoom
    const minHeightPixels = minHeightYards * PIXELS_PER_YARD_LENGTH; // Use same scale as width
    if (height < minHeightPixels) {
      const extraPadding = (minHeightPixels - height) / 2;
      minY -= extraPadding;
      height = minHeightPixels;
    }
    
    return {
      x: minX - paddingPixels,
      y: minY - paddingPixels, // Use same padding pixels for both dimensions
      width: width,
      height: height
    };
  };
  
  
  // Transform coordinates for director view
  const transformForDirectorView = (x, y) => {
    if (!directorView) return { x, y };
    return {
      x: FIELD_LENGTH - x,
      y: FIELD_WIDTH - y
    };
  };
  
  // Draw the visualization
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const movementData = getMovementData();
    
    // Color mapping for performer types based on first letter
    const getPerformerColor = (performerId) => {
      const firstLetter = performerId.charAt(0).toUpperCase();
      const colors = {
        'S': '#60a5fa', // Blue for Snare
        'T': '#a78bfa', // Purple for Tenor
        'B': '#f59e0b', // Orange for Bass
      };
      return colors[firstLetter] || '#94a3b8'; // Default gray
    };
    
    // Clear canvas and reset context state
    ctx.clearRect(0, 0, FIELD_LENGTH, FIELD_WIDTH);
    ctx.globalAlpha = 1;
    
    if (movementData.length === 0) return;
    
    // Save the current context state
    ctx.save();
    
    // Apply zoom transformation if enabled
    let currentScale = 1;
    let zoomCenterX = 0;
    let zoomCenterY = 0;
    
    // Reset transform parameters when not zoomed
    if (!zoomToFit) {
      currentTransformRef.current = {
        scale: 1,
        centerX: 0,
        centerY: 0
      };
    }
    
    if (zoomToFit && movementData[currentSetIndex]) {
      // In quiz mode, use the display set (which shows the "from" position)
      const quizFromSet = getQuizFromSet();
      const setForZoom = quizMode && quizFromSet ? quizFromSet : movementData[currentSetIndex];
      const currentBbox = calculateBoundingBox(setForZoom.set, false); // Don't include next position
      
      // If animating, interpolate between current and next bounding boxes
      let targetCenterX = 0;
      let targetCenterY = 0;
      
      if (currentBbox) {
        targetCenterX = currentBbox.x + currentBbox.width / 2;
        targetCenterY = currentBbox.y + currentBbox.height / 2;
        
        // During animation, follow the actual movement path
        if (isPlaying && animationProgress > 0 && currentSetIndex < movementData.length - 1) {
          const nextSet = movementData[currentSetIndex + 1];
          if (nextSet) {
            // Get actual positions for interpolation
            const currentPosRaw = parsePosition(setForZoom.leftRight, setForZoom.homeVisitor);
            const nextPosRaw = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
            const currentPos = transformForDirectorView(currentPosRaw.x, currentPosRaw.y);
            const nextPos = transformForDirectorView(nextPosRaw.x, nextPosRaw.y);
            
            // Interpolate along the actual movement path
            const interpolatedX = currentPos.x + (nextPos.x - currentPos.x) * animationProgress;
            const interpolatedY = currentPos.y + (nextPos.y - currentPos.y) * animationProgress;
            
            // Center view on the interpolated position
            targetCenterX = interpolatedX;
            targetCenterY = interpolatedY;
          }
        }
        
        // Check if we're currently in a hold by parsing the tip
        let isInHold = false;
        if (isPlaying && currentSetIndex < movementData.length - 1) {
          const nextSet = movementData[currentSetIndex + 1];
          if (nextSet && nextSet.tip) {
            // Parse components from tip to determine if we're in a hold
            const tipComponents = [];
            const moveMatches = nextSet.tip.match(/move[^,]+?for\s+(\d+)\s+counts?/gi) || [];
            const holdMatches = nextSet.tip.match(/hold(?:\s+for)?\s+(\d+)\s+counts?/gi) || [];
            
            // Process move matches
            moveMatches.forEach(matchStr => {
              const countMatch = matchStr.match(/for\s+(\d+)\s+counts?/i);
              if (countMatch) {
                const index = nextSet.tip.indexOf(matchStr);
                tipComponents.push({
                  type: 'move',
                  counts: parseInt(countMatch[1]),
                  index: index
                });
              }
            });
            
            // Process hold matches
            holdMatches.forEach(matchStr => {
              const countMatch = matchStr.match(/(\d+)\s+counts?/i);
              if (countMatch) {
                const index = nextSet.tip.indexOf(matchStr);
                tipComponents.push({
                  type: 'hold',
                  counts: parseInt(countMatch[1]),
                  index: index
                });
              }
            });
            
            // Sort by index to get order
            tipComponents.sort((a, b) => a.index - b.index);
            
            // If no components found but there's a tip mentioning hold, it's likely a simple hold
            if (tipComponents.length === 0 && nextSet.tip.toLowerCase().includes('hold')) {
              isInHold = true;
            } else if (tipComponents.length > 0) {
              // Determine which component we're in based on currentCount
              let accumulatedCounts = 0;
              for (const comp of tipComponents) {
                if (currentCount <= accumulatedCounts + comp.counts) {
                  isInHold = comp.type === 'hold';
                  break;
                }
                accumulatedCounts += comp.counts;
              }
            }
          }
        }
        
        // Smooth the center position to prevent jarring movements
        if (lastCenterRef.current.x === 0 && lastCenterRef.current.y === 0) {
          // First frame, set directly
          lastCenterRef.current = { x: targetCenterX, y: targetCenterY };
        } else if (isInHold) {
          // During holds, keep the exact same center without any recalculation
          targetCenterX = lastCenterRef.current.x;
          targetCenterY = lastCenterRef.current.y;
        } else {
          // Calculate distance to target
          const deltaX = targetCenterX - lastCenterRef.current.x;
          const deltaY = targetCenterY - lastCenterRef.current.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          // Adaptive smoothing based on distance
          // Larger distances get more aggressive smoothing to prevent jumps
          let smoothingFactor;
          if (distance > 100) {
            // Large jump detected (like when changing sets)
            smoothingFactor = 0.95; // Very smooth
          } else if (distance > 50) {
            smoothingFactor = 0.92; // Moderate smoothing
          } else {
            smoothingFactor = isPlaying ? 0.88 : 0.85; // Normal smoothing
          }
          
          // Apply spring-like physics for more natural movement
          const springStrength = 1 - smoothingFactor;
          const velocityX = deltaX * springStrength;
          const velocityY = deltaY * springStrength;
          
          // Limit maximum velocity to prevent too fast movements
          const maxVelocity = 15;
          const currentVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
          if (currentVelocity > maxVelocity) {
            const scale = maxVelocity / currentVelocity;
            targetCenterX = lastCenterRef.current.x + velocityX * scale;
            targetCenterY = lastCenterRef.current.y + velocityY * scale;
          } else {
            targetCenterX = lastCenterRef.current.x + velocityX;
            targetCenterY = lastCenterRef.current.y + velocityY;
          }
          
          lastCenterRef.current = { x: targetCenterX, y: targetCenterY };
        }
        
        // Use a fixed bounding box size based on all performers to avoid scale jumping
        const fixedWidth = 40 * PIXELS_PER_YARD_LENGTH; // 40 yards wide view
        const fixedHeight = 30 * PIXELS_PER_YARD_LENGTH; // 30 yards tall view
        
        // Calculate scale based on fixed size
        const scaleX = FIELD_LENGTH / fixedWidth;
        const scaleY = FIELD_WIDTH / fixedHeight;
        let scale = Math.min(scaleX, scaleY) * 0.85;
        
        // Limit maximum zoom - increased to allow more detailed viewing
        const maxScale = 5.0;
        scale = Math.min(scale, maxScale);
        currentScale = scale;
        
        zoomCenterX = targetCenterX;
        zoomCenterY = targetCenterY;
        
        // Store the actual transformation parameters for click handling
        currentTransformRef.current = {
          scale: scale,
          centerX: zoomCenterX,
          centerY: zoomCenterY
        };
        
        // Apply transformations - use same scale for both dimensions
        ctx.translate(FIELD_LENGTH / 2, FIELD_WIDTH / 2);
        ctx.scale(scale, scale); // Same scale for X and Y maintains aspect ratio
        ctx.translate(-zoomCenterX, -zoomCenterY);
        
      }
    }
    
    // Draw field background - extend beyond canvas when zoomed to ensure full coverage
    ctx.fillStyle = '#0f5132';
    if (zoomToFit) {
      // Draw a much larger area to ensure full coverage when zoomed
      ctx.fillRect(-FIELD_LENGTH, -FIELD_WIDTH, FIELD_LENGTH * 3, FIELD_WIDTH * 3);
    } else {
      ctx.fillRect(0, 0, FIELD_LENGTH, FIELD_WIDTH);
    }
    
    // Draw end zones
    ctx.fillStyle = '#0d4429';
    ctx.fillRect(0, 0, FIELD_LENGTH / 12, FIELD_WIDTH);
    ctx.fillRect(FIELD_LENGTH * 11/12, 0, FIELD_LENGTH / 12, FIELD_WIDTH);
    
    
    // Draw basic field representation
    // Make lines more visible when zoomed
    ctx.strokeStyle = zoomToFit ? '#ffffff60' : '#ffffff40';
    ctx.lineWidth = zoomToFit ? 3 : 2;
    
    // Draw yard lines every 5 yards
    // When zoomed, the transformation matrix will handle which lines are visible
    
    // Draw right side (home side) yard lines: 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0
    for (let yard = 50; yard >= 0; yard -= 5) {
      let x = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
      // In director view, flip the x coordinate
      if (directorView) {
        x = FIELD_LENGTH - x;
      }
      
      // Make 50 yard line thicker
      if (yard === 50) {
        ctx.save();
        ctx.lineWidth = zoomToFit ? 5 : 4;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_WIDTH);
      ctx.stroke();
      
      if (yard === 50) {
        ctx.restore();
      }
      
      // Draw yard numbers (all except 0) - but not when zoomed (they're drawn in screen space)
      if (yard !== 0 && !zoomToFit) {
        ctx.save();
        // Add background to prevent line showing through
        ctx.fillStyle = '#0f5132';
        const textWidth = yard === 50 ? 30 : 25;
        ctx.fillRect(x - textWidth/2, 20, textWidth, 20);
        ctx.fillRect(x - textWidth/2, FIELD_WIDTH - 40, textWidth, 20);
        
        ctx.fillStyle = '#ffffff80';
        ctx.font = yard === 50 ? 'bold 20px sans-serif' : 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(yard.toString(), x, 30);
        ctx.fillText(yard.toString(), x, FIELD_WIDTH - 30);
        ctx.restore();
      }
    }
    
    // Draw left side (visitor side) yard lines: 45, 40, 35, 30, 25, 20, 15, 10, 5, 0
    for (let yard = 45; yard >= 0; yard -= 5) {
      let x = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
      // In director view, flip the x coordinate
      if (directorView) {
        x = FIELD_LENGTH - x;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_WIDTH);
      ctx.stroke();
      
      // Draw yard numbers (all except 0) - but not when zoomed (they're drawn in screen space)
      if (yard !== 0 && !zoomToFit) {
        ctx.save();
        // Add background to prevent line showing through
        ctx.fillStyle = '#0f5132';
        const textWidth = yard === 50 ? 30 : 25;
        ctx.fillRect(x - textWidth/2, 20, textWidth, 20);
        ctx.fillRect(x - textWidth/2, FIELD_WIDTH - 40, textWidth, 20);
        
        ctx.fillStyle = '#ffffff80';
        ctx.font = yard === 50 ? 'bold 20px sans-serif' : 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(yard.toString(), x, 30);
        ctx.fillText(yard.toString(), x, FIELD_WIDTH - 30);
        ctx.restore();
      }
    }
    
    // Draw hash marks as vertical ticks every yard (not in end zones)
    ctx.strokeStyle = '#ffffff30';
    ctx.lineWidth = 1;
    const hashTickHeight = 4; // Height of each hash tick in pixels
    
    // Start at goal line (not in end zone) and go to other goal line
    const startX = FIELD_LENGTH / 12; // Start at 0 yard line
    const endX = FIELD_LENGTH * 11/12; // End at opposite 0 yard line
    
    // Draw hash ticks every yard
    for (let x = startX; x <= endX; x += PIXELS_PER_YARD_LENGTH) {
      // Home hash ticks
      ctx.beginPath();
      ctx.moveTo(x, HOME_HASH_Y - hashTickHeight/2);
      ctx.lineTo(x, HOME_HASH_Y + hashTickHeight/2);
      ctx.stroke();
      
      // Visitor hash ticks
      ctx.beginPath();
      ctx.moveTo(x, VISITOR_HASH_Y - hashTickHeight/2);
      ctx.lineTo(x, VISITOR_HASH_Y + hashTickHeight/2);
      ctx.stroke();
    }
    
    // Draw 4-step interval marks on yard lines
    // 8 steps = 5 yards, so 4 steps = 2.5 yards
    const fourStepsInPixels = 2.5 * PIXELS_PER_YARD_WIDTH; // 2.5 yards
    const stepMarkWidth = 6; // Width of the horizontal dash
    
    if (show4StepMarks) {
      ctx.strokeStyle = '#facc15B0'; // Yellow with good opacity
      ctx.lineWidth = 1;
      
      // Draw marks on each 5-yard line (except 0 yard lines)
      // Right side (home side) yard lines
      for (let yard = 50; yard >= 0; yard -= 5) {
        if (yard === 0) continue; // Skip 0 yard line
        const x = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
      // Draw 4 marks from home hash upward
      for (let i = 1; i <= 4; i++) {
        const y = HOME_HASH_Y - (fourStepsInPixels * i);
        if (y > 0) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
      
      // Draw 4 marks from home hash downward
      for (let i = 1; i <= 4; i++) {
        const y = HOME_HASH_Y + (fourStepsInPixels * i);
        if (y < VISITOR_HASH_Y) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
      
      // Draw 4 marks from visitor hash upward
      for (let i = 1; i <= 4; i++) {
        const y = VISITOR_HASH_Y - (fourStepsInPixels * i);
        if (y > HOME_HASH_Y) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
      
      // Draw 4 marks from visitor hash downward
      for (let i = 1; i <= 4; i++) {
        const y = VISITOR_HASH_Y + (fourStepsInPixels * i);
        if (y < FIELD_WIDTH) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
    }
    
    // Left side (visitor side) yard lines
    for (let yard = 45; yard >= 0; yard -= 5) {
      if (yard === 0) continue; // Skip 0 yard line
      const x = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
      // Draw 4 marks from home hash upward
      for (let i = 1; i <= 4; i++) {
        const y = HOME_HASH_Y - (fourStepsInPixels * i);
        if (y > 0) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
      
      // Draw 4 marks from home hash downward
      for (let i = 1; i <= 4; i++) {
        const y = HOME_HASH_Y + (fourStepsInPixels * i);
        if (y < VISITOR_HASH_Y) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
      
      // Draw 4 marks from visitor hash upward
      for (let i = 1; i <= 4; i++) {
        const y = VISITOR_HASH_Y - (fourStepsInPixels * i);
        if (y > HOME_HASH_Y) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
      
      // Draw 4 marks from visitor hash downward
      for (let i = 1; i <= 4; i++) {
        const y = VISITOR_HASH_Y + (fourStepsInPixels * i);
        if (y < FIELD_WIDTH) {
          ctx.beginPath();
          ctx.moveTo(x - stepMarkWidth/2, y);
          ctx.lineTo(x + stepMarkWidth/2, y);
          ctx.stroke();
        }
      }
    }
    } // End of show4StepMarks condition
    
    // Draw hash mark labels when not zoomed
    if (!zoomToFit) {
      ctx.save();
      // Home hash label - moved slightly right
      const labelX = FIELD_LENGTH * 0.105; // Slightly right from 0.1
      
      // In director view, just swap the labels (not the positions)
      const homeHashLabel = directorView ? 'VH' : 'HH';
      const visitorHashLabel = directorView ? 'HH' : 'VH';
      
      
      // Home hash label
      ctx.fillStyle = '#0f5132'; // Background
      ctx.fillRect(labelX - 15, HOME_HASH_Y - 10, 30, 20);
      ctx.fillStyle = '#ffffff70';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(homeHashLabel, labelX, HOME_HASH_Y);
      
      // Visitor hash label
      ctx.fillStyle = '#0f5132'; // Background
      ctx.fillRect(labelX - 15, VISITOR_HASH_Y - 10, 30, 20);
      ctx.fillStyle = '#ffffff70';
      ctx.fillText(visitorHashLabel, labelX, VISITOR_HASH_Y);
      ctx.restore();
    }
    
    // Draw center field logo (after yard lines so it appears on top)
    if (logoImage) {
      ctx.save();
      
      // Position at center of field
      const centerX = FIELD_LENGTH / 2;
      const centerY = FIELD_WIDTH / 2;
      
      // Logo size - smaller
      const logoSize = 50; // pixels
      
      // Add transparency to the logo
      ctx.globalAlpha = 0.7; // 70% opacity for subtle appearance
      
      // Translate to center
      ctx.translate(centerX, centerY);
      
      if (directorView) {
        // In director view, no transformation (show logo as-is)
        // This will show the logo in its original orientation
      } else {
        // Normal view: rotate 180 degrees to point up
        ctx.rotate(Math.PI);
      }
      
      ctx.drawImage(logoImage, -logoSize/2, -logoSize/2, logoSize, logoSize);
      
      ctx.restore();
    }
    
    // Draw side labels only when not zoomed (they interfere with yard numbers when zoomed)
    if (!zoomToFit) {
      ctx.fillStyle = '#ffffff90';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add background for sideline labels
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(FIELD_LENGTH/2 - 80, 0, 160, 20);
      ctx.fillRect(FIELD_LENGTH/2 - 80, FIELD_WIDTH - 20, 160, 20);
      
      // Add background for LEFT and RIGHT labels
      ctx.fillRect(FIELD_LENGTH * 0.15 - 30, 0, 60, 20);
      ctx.fillRect(FIELD_LENGTH * 0.85 - 30, 0, 60, 20);
      
      ctx.fillStyle = '#ffffff90';
      // In director view, swap the sideline labels
      const frontLabel = directorView ? 'BACK (VISITOR) SIDELINE' : 'FRONT (HOME) SIDELINE';
      const backLabel = directorView ? 'FRONT (HOME) SIDELINE' : 'BACK (VISITOR) SIDELINE';
      ctx.fillText(frontLabel, FIELD_LENGTH / 2, 10);
      ctx.fillText(backLabel, FIELD_LENGTH / 2, FIELD_WIDTH - 10);
      
      // Draw LEFT and RIGHT labels at the top
      // In director view, swap left and right
      const leftLabel = directorView ? 'RIGHT' : 'LEFT';
      const rightLabel = directorView ? 'LEFT' : 'RIGHT';
      ctx.fillText(rightLabel, FIELD_LENGTH * 0.15, 10);
      ctx.fillText(leftLabel, FIELD_LENGTH * 0.85, 10);
      
      // Draw end zone labels
      ctx.fillStyle = '#ffffffa0';
      ctx.font = 'bold 18px sans-serif';
      ctx.save();
      ctx.translate(FIELD_LENGTH / 24, FIELD_WIDTH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('END ZONE', 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(FIELD_LENGTH * 23/24, FIELD_WIDTH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('END ZONE', 0, 0);
      ctx.restore();
    }
    
    // Draw paths if enabled
    if (showPaths && movementData.length > 1) {
      // Group consecutive sets at the same position
      const groupedSets = [];
      let currentGroup = null;
      
      for (let i = 0; i < movementData.length; i++) {
        const set = movementData[i];
        const pos = parsePosition(set.leftRight, set.homeVisitor);
        const { x, y } = transformForDirectorView(pos.x, pos.y);
        
        if (currentGroup && Math.abs(currentGroup.x - x) < 0.1 && Math.abs(currentGroup.y - y) < 0.1) {
          // Same position, add to current group
          currentGroup.sets.push(set.set);
          currentGroup.endIndex = i;
          // Update orientation to the last set's orientation in the group
          if (set.orientation) {
            currentGroup.orientation = set.orientation;
          }
        } else {
          // New position, create new group
          currentGroup = {
            x,
            y,
            sets: [set.set],
            startIndex: i,
            endIndex: i,
            orientation: set.orientation || 'Front'
          };
          groupedSets.push(currentGroup);
        }
      }
      
      // Draw dashed lines connecting positions
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.5;
      
      ctx.beginPath();
      for (let i = 0; i < groupedSets.length; i++) {
        const group = groupedSets[i];
        if (i === 0) {
          ctx.moveTo(group.x, group.y);
        } else {
          ctx.lineTo(group.x, group.y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw white-bordered circles with set numbers
      for (let i = 0; i < groupedSets.length; i++) {
        const group = groupedSets[i];
        const isCurrentPosition = group.startIndex <= currentSetIndex && currentSetIndex <= group.endIndex;
        
        // Draw white circle border
        ctx.globalAlpha = isCurrentPosition ? 1 : 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.save();
        ctx.scale(1, ASPECT_RATIO);
        ctx.arc(group.x, group.y / ASPECT_RATIO, 8, 0, 2 * Math.PI);
        ctx.restore();
        ctx.stroke();
        
        // Fill circle
        ctx.fillStyle = isCurrentPosition ? '#60a5fa' : '#374151';
        ctx.beginPath();
        ctx.save();
        ctx.scale(1, ASPECT_RATIO);
        ctx.arc(group.x, group.y / ASPECT_RATIO, 8, 0, 2 * Math.PI);
        ctx.restore();
        ctx.fill();
        
        // Draw orientation arrow
        if (group.orientation) {
          ctx.save();
          ctx.translate(group.x, group.y);
          
          // Map orientation to angle
          // Note: 0 radians points right, PI/2 points down, PI points left, -PI/2 points up
          let angle = 0;
          switch (group.orientation) {
            case 'Front':
              angle = -Math.PI / 2; // Points up (toward front/home sideline)
              break;
            case 'Back':
              angle = Math.PI / 2; // Points down (toward back/visitor sideline)
              break;
            case 'Left End Zone':
              angle = Math.PI; // Points left (facing left end zone)
              break;
            case 'Right End Zone':
              angle = 0; // Points right (facing right end zone)
              break;
          }
          
          // In director view, flip all arrows 180 degrees
          if (directorView) {
            angle += Math.PI;
          }
          
          ctx.rotate(angle);
          
          // Remove or comment out the black background
          // ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          // ctx.fillRect(-2, -10, 20, 20);
          
          // Draw arrow pointing right before rotation
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.globalAlpha = isCurrentPosition ? 1 : 0.7;
          ctx.beginPath();
          // Arrow pointing right (positive x direction)
          ctx.moveTo(12, 0);
          ctx.lineTo(8, -4);
          ctx.moveTo(12, 0);
          ctx.lineTo(8, 4);
          ctx.moveTo(12, 0);
          ctx.lineTo(4, 0);
          ctx.stroke();
          
          ctx.restore();
        }
        
        // Draw set number(s)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Format set numbers (e.g., "1-5" for consecutive sets)
        let label;
        if (group.sets.length === 1) {
          label = group.sets[0].toString();
        } else if (group.sets.length === 2) {
          label = `${group.sets[0]},${group.sets[1]}`;
        } else {
          // Check if consecutive
          let consecutive = true;
          for (let j = 1; j < group.sets.length; j++) {
            if (group.sets[j] !== group.sets[j-1] + 1) {
              consecutive = false;
              break;
            }
          }
          if (consecutive) {
            label = `${group.sets[0]}-${group.sets[group.sets.length - 1]}`;
          } else {
            label = group.sets.join(',');
          }
        }
        
        ctx.fillText(label, group.x, group.y);
      }
      ctx.globalAlpha = 1; // Reset alpha
    }
    
    // Draw current position (with animation if in progress)
    // In quiz mode, show the "from" position
    const displaySet = quizMode ? getQuizFromSet() : movementData[currentSetIndex];
    const currentSet = movementData[currentSetIndex];
    const nextSet = movementData[currentSetIndex + 1];
    
    if (displaySet) {
      const pos = parsePosition(displaySet.leftRight, displaySet.homeVisitor);
      const { x: currentX, y: currentY } = transformForDirectorView(pos.x, pos.y);
      
      let drawX = currentX;
      let drawY = currentY;
      
      // If animating to next set, interpolate position
      if (animationProgress > 0 && nextSet) {
        const nextPos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
        const { x: nextX, y: nextY } = transformForDirectorView(nextPos.x, nextPos.y);
        drawX = currentX + (nextX - currentX) * animationProgress;
        drawY = currentY + (nextY - currentY) * animationProgress;
        
        // Draw motion trail
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(drawX, drawY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Draw performer dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.save();
      ctx.scale(1, ASPECT_RATIO);
      ctx.arc(drawX, drawY / ASPECT_RATIO, 3, 0, 2 * Math.PI);
      ctx.restore();
      ctx.fill();
    }
    
    // Draw other performers if enabled
    if (showOtherPerformers && displaySet) {
      const displaySetNumber = displaySet.set;
      
      Object.keys(performerData).forEach(otherPerformerId => {
        if (otherPerformerId === selectedPerformerId || otherPerformerId === 'Staff') return;
        
        const otherPerformer = performerData[otherPerformerId];
        
        // In quiz mode at first set of non-first movement, get from previous movement
        let otherPerformerDisplaySet = null;
        if (quizMode && movement !== '1' && currentSetIndex === 0 && !crossMovementQuizCompleted) {
          const prevMovement = (parseInt(movement) - 1).toString();
          if (otherPerformer.movements && otherPerformer.movements[prevMovement]) {
            const prevMovementSets = otherPerformer.movements[prevMovement];
            otherPerformerDisplaySet = prevMovementSets[prevMovementSets.length - 1];
          }
        } else if (movement === '2' && displaySetNumber === 13) {
          // Special case: Movement 2 showing set 13 from movement 1
          if (otherPerformer.movements && otherPerformer.movements['1']) {
            const movement1Sets = otherPerformer.movements['1'];
            otherPerformerDisplaySet = movement1Sets[movement1Sets.length - 1]; // Get last set (set 13) from movement 1
          }
        } else if (otherPerformer.movements && otherPerformer.movements[movement]) {
          otherPerformerDisplaySet = otherPerformer.movements[movement].find(s => s.set === displaySetNumber);
        }
        
        if (otherPerformerDisplaySet) {
          let otherPerformerNextSet = null;
          
          // Handle transition from set 13 to 14 in movement 2
          if (movement === '2' && displaySetNumber === 13 && nextSet) {
            // Next set is set 14, which is the first set in movement 2
            if (otherPerformer.movements && otherPerformer.movements['2']) {
              otherPerformerNextSet = otherPerformer.movements['2'].find(s => s.set === 14);
            }
          } else if (nextSet && otherPerformer.movements[movement]) {
            otherPerformerNextSet = otherPerformer.movements[movement].find(s => s.set === displaySet.set + 1);
          }
          
          const pos = parsePosition(otherPerformerDisplaySet.leftRight, otherPerformerDisplaySet.homeVisitor);
            const { x: currentX, y: currentY } = transformForDirectorView(pos.x, pos.y);
            
            let drawX = currentX;
            let drawY = currentY;
            
            // If animating and next set exists for this performer, interpolate their position too
            if (animationProgress > 0 && otherPerformerNextSet) {
              const nextPos = parsePosition(otherPerformerNextSet.leftRight, otherPerformerNextSet.homeVisitor);
              const { x: nextX, y: nextY } = transformForDirectorView(nextPos.x, nextPos.y);
              drawX = currentX + (nextX - currentX) * animationProgress;
              drawY = currentY + (nextY - currentY) * animationProgress;
            }
            
            // Draw other performer dot with enhanced visibility
            ctx.save();
            
            // Draw outer glow/shadow for depth
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.save();
            ctx.scale(1, ASPECT_RATIO);
            ctx.arc(drawX, drawY / ASPECT_RATIO, 3, 0, 2 * Math.PI);
            ctx.restore();
            ctx.fill();
            
            // Draw white background circle for contrast
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.save();
            ctx.scale(1, ASPECT_RATIO);
            ctx.arc(drawX, drawY / ASPECT_RATIO, 2.5, 0, 2 * Math.PI);
            ctx.restore();
            ctx.fill();
            
            // Draw main performer dot
            ctx.globalAlpha = 1;
            ctx.fillStyle = getPerformerColor(otherPerformerId);
            ctx.beginPath();
            ctx.save();
            ctx.scale(1, ASPECT_RATIO);
            ctx.arc(drawX, drawY / ASPECT_RATIO, 2, 0, 2 * Math.PI);
            ctx.restore();
            ctx.fill();
            
            // Add inner highlight for 3D effect
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.save();
            ctx.scale(1, ASPECT_RATIO);
            ctx.arc(drawX - 0.5, (drawY - 0.5) / ASPECT_RATIO, 0.8, 0, 2 * Math.PI);
            ctx.restore();
            ctx.fill();
            
            ctx.restore();
          }
      });
    }
    
    // Draw quiz indicators inside the transform (like dots are drawn) - MUST be before ctx.restore()
    if (quizMode && quizClickPosition && (quizStep === 'position' || showQuizFeedback)) {
      // Draw user's clicked position at field coordinates
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(quizClickPosition.x - 10, quizClickPosition.y);
      ctx.lineTo(quizClickPosition.x + 10, quizClickPosition.y);
      ctx.moveTo(quizClickPosition.x, quizClickPosition.y - 10);
      ctx.lineTo(quizClickPosition.x, quizClickPosition.y + 10);
      ctx.stroke();
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(quizClickPosition.x, quizClickPosition.y, 5, 0, 2 * Math.PI);
      ctx.stroke();
      
      // If showing feedback and position was incorrect, also show the actual position
      if (showQuizFeedback && quizAnswers.position) {
        const movementData = getMovementData();
        const toSetIndex = getQuizToSetIndex();
        const nextSet = movementData[toSetIndex];
        if (nextSet) {
          const actualPos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
          const { x: actualX, y: actualY } = transformForDirectorView(actualPos.x, actualPos.y);
          
          // Compare in field coordinates (both are now in field space)
          const distance = Math.sqrt(
            Math.pow(quizAnswers.position.x - actualX, 2) + 
            Math.pow(quizAnswers.position.y - actualY, 2)
          );
          const tolerance = FIELD_WIDTH * 0.05; // 20 pixels (5% of 400)
          const isCorrect = distance < tolerance;
          
          if (!isCorrect) {
            // Draw actual position in green (inside the transform like dots)
            ctx.strokeStyle = '#00ff00';
            ctx.fillStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.9;
            
            // Draw crosshair for actual position at field coordinates
            ctx.beginPath();
            ctx.moveTo(actualX - 12, actualY);
            ctx.lineTo(actualX + 12, actualY);
            ctx.moveTo(actualX, actualY - 12);
            ctx.lineTo(actualX, actualY + 12);
            ctx.stroke();
            
            // Draw filled circle for actual position
            ctx.beginPath();
            ctx.arc(actualX, actualY, 6, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw connecting line
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(quizClickPosition.x, quizClickPosition.y);
            ctx.lineTo(actualX, actualY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
    
    // Restore the context state before drawing UI elements
    ctx.restore();
    
    // Draw yard markers in screen space when zoomed (so they're always visible)
    if (zoomToFit && currentScale > 0) {
      // Use the stored transformation parameters
      const limitedScale = currentScale;
      const centerX = zoomCenterX;
      const centerY = zoomCenterY;
        
        // Draw yard markers that are visible in the current view
        ctx.save();
        ctx.strokeStyle = '#ffffff60';
        ctx.lineWidth = 1; // Thinner lines for zoomed view
        // Solid lines - no dash pattern
        
        // Calculate visible yard lines
        const visibleLeft = centerX - (FIELD_LENGTH / 2) / limitedScale;
        const visibleRight = centerX + (FIELD_LENGTH / 2) / limitedScale;
        
        // Find leftmost and rightmost performer positions
        let leftmostX = Infinity;
        let rightmostX = -Infinity;
        
        const movementData = getMovementData();
        const displaySet = quizMode ? getQuizFromSet() : movementData[currentSetIndex];
        const currentSet = movementData[currentSetIndex];
        
        if (displaySet) {
          // Check current performer
          const performerPos = parsePosition(displaySet.leftRight, displaySet.homeVisitor);
          leftmostX = Math.min(leftmostX, performerPos.x);
          rightmostX = Math.max(rightmostX, performerPos.x);
          
          // Check other performers if shown
          if (showOtherPerformers) {
            Object.keys(performerData).forEach(otherPerformerId => {
              if (otherPerformerId === performerId || otherPerformerId === 'Staff') return;
              const otherPerformer = performerData[otherPerformerId];
              if (otherPerformer.movements && otherPerformer.movements[movement]) {
                const otherSet = otherPerformer.movements[movement].find(s => s.set === displaySet.set);
                if (otherSet) {
                  const otherPos = parsePosition(otherSet.leftRight, otherSet.homeVisitor);
                  leftmostX = Math.min(leftmostX, otherPos.x);
                  rightmostX = Math.max(rightmostX, otherPos.x);
                }
              }
            });
          }
        }
        
        // Find the yard lines just outside the performer range
        let leftYardLine = null;
        let leftYardValue = null;
        let rightYardLine = null;
        let rightYardValue = null;
        
        // Check all possible yard lines to find the ones just outside performer positions
        for (let yard = 0; yard <= 50; yard += 5) {
          if (yard === 0) continue;
          
          // Right side yard lines
          const xRight = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
          if (xRight < leftmostX && (leftYardLine === null || xRight > leftYardLine)) {
            leftYardLine = xRight;
            leftYardValue = yard;
          }
          if (xRight > rightmostX && (rightYardLine === null || xRight < rightYardLine)) {
            rightYardLine = xRight;
            rightYardValue = yard;
          }
          
          // Left side yard lines
          if (yard <= 45) {
            const xLeft = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
            if (xLeft < leftmostX && (leftYardLine === null || xLeft > leftYardLine)) {
              leftYardLine = xLeft;
              leftYardValue = yard;
            }
            if (xLeft > rightmostX && (rightYardLine === null || xLeft < rightYardLine)) {
              rightYardLine = xLeft;
              rightYardValue = yard;
            }
          }
        }
        
        // Draw yard lines and numbers
        for (let yard = 0; yard <= 50; yard += 5) {
          if (yard === 0) continue; // Skip 0 yard line
          
          // Right side (home side) yard line
          const xRight = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
          if (xRight >= visibleLeft && xRight <= visibleRight) {
            // Draw if this yard line is between or at the boundaries
            if (leftYardLine !== null && rightYardLine !== null && 
                xRight >= leftYardLine && xRight <= rightYardLine) {
              // Transform to screen coordinates
              const screenX = (xRight - centerX) * limitedScale + FIELD_LENGTH / 2;
              
              // Make 50 yard line slightly thicker
              if (yard === 50) {
                ctx.save();
                ctx.lineWidth = 1.5; // Just slightly thicker than regular lines
              }
              
              // Draw line - extend beyond canvas to ensure full coverage
              ctx.beginPath();
              ctx.moveTo(screenX, 0);
              ctx.lineTo(screenX, FIELD_WIDTH);
              ctx.stroke();
              
              if (yard === 50) {
                ctx.restore();
              }
              
              // Draw yard number on bottom
              ctx.save();
              // Add background to prevent line showing through
              ctx.fillStyle = '#0f5132';
              const textWidth = yard === 50 ? 30 : 25;
              ctx.fillRect(screenX - textWidth/2, FIELD_WIDTH - 60, textWidth, 20);
              
              ctx.fillStyle = '#ffffff90';
              ctx.font = yard === 50 ? 'bold 20px sans-serif' : 'bold 16px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(yard.toString(), screenX, FIELD_WIDTH - 50);
              ctx.restore();
            }
          }
          
          // Left side (visitor side) yard line
          if (yard <= 45) {
            const xLeft = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
            if (xLeft >= visibleLeft && xLeft <= visibleRight) {
              // Draw if this yard line is between or at the boundaries
              if (leftYardLine !== null && rightYardLine !== null && 
                  xLeft >= leftYardLine && xLeft <= rightYardLine) {
                // Transform to screen coordinates
                const screenX = (xLeft - centerX) * limitedScale + FIELD_LENGTH / 2;
                
                // Draw line
                ctx.beginPath();
                ctx.moveTo(screenX, 0);
                ctx.lineTo(screenX, FIELD_WIDTH);
                ctx.stroke();
                
                // Draw yard number on bottom
                ctx.save();
                // Add background to prevent line showing through
                ctx.fillStyle = '#0f5132';
                const textWidth = 25;
                ctx.fillRect(screenX - textWidth/2, FIELD_WIDTH - 60, textWidth, 20);
                
                ctx.fillStyle = '#ffffff90';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(yard.toString(), screenX, FIELD_WIDTH - 50);
                ctx.restore();
              }
            }
          }
        }
        
        // Draw hash marks in zoomed view as vertical ticks
        ctx.strokeStyle = '#ffffff40';
        ctx.lineWidth = 1;
        const hashTickHeight = 6; // Slightly larger in zoomed view
        
        // Transform hash Y positions to screen coordinates
        const homeHashScreenY = (HOME_HASH_Y - centerY) * limitedScale + FIELD_WIDTH / 2;
        const visitorHashScreenY = (VISITOR_HASH_Y - centerY) * limitedScale + FIELD_WIDTH / 2;
        
        // Draw hash ticks every yard within visible area (not in end zones)
        const startFieldX = FIELD_LENGTH / 12; // Start at 0 yard line
        const endFieldX = FIELD_LENGTH * 11/12; // End at opposite 0 yard line
        
        for (let fieldX = startFieldX; fieldX <= endFieldX; fieldX += PIXELS_PER_YARD_LENGTH) {
          if (fieldX >= visibleLeft && fieldX <= visibleRight) {
            const screenX = (fieldX - centerX) * limitedScale + FIELD_LENGTH / 2;
            
            // Draw home hash tick if visible
            if (homeHashScreenY >= 0 && homeHashScreenY <= FIELD_WIDTH) {
              ctx.beginPath();
              ctx.moveTo(screenX, homeHashScreenY - hashTickHeight/2);
              ctx.lineTo(screenX, homeHashScreenY + hashTickHeight/2);
              ctx.stroke();
            }
            
            // Draw visitor hash tick if visible
            if (visitorHashScreenY >= 0 && visitorHashScreenY <= FIELD_WIDTH) {
              ctx.beginPath();
              ctx.moveTo(screenX, visitorHashScreenY - hashTickHeight/2);
              ctx.lineTo(screenX, visitorHashScreenY + hashTickHeight/2);
              ctx.stroke();
            }
          }
        }
        
        // Add hash labels if hashes are visible
        // In director view, swap the labels
        const homeHashLabel = directorView ? 'VH' : 'HH';
        const visitorHashLabel = directorView ? 'HH' : 'VH';
        
        if (homeHashScreenY >= 0 && homeHashScreenY <= FIELD_WIDTH) {
          ctx.save();
          ctx.fillStyle = '#0f5132'; // Background
          ctx.fillRect(50, homeHashScreenY - 10, 30, 20);
          ctx.fillStyle = '#ffffff70';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(homeHashLabel, 65, homeHashScreenY);
          ctx.restore();
        }
        
        if (visitorHashScreenY >= 0 && visitorHashScreenY <= FIELD_WIDTH) {
          ctx.save();
          ctx.fillStyle = '#0f5132'; // Background
          ctx.fillRect(50, visitorHashScreenY - 10, 30, 20);
          ctx.fillStyle = '#ffffff70';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(visitorHashLabel, 65, visitorHashScreenY);
          ctx.restore();
        }
        
        // Draw 4-step interval marks in zoomed view
        if (show4StepMarks) {
          ctx.strokeStyle = '#facc15B0'; // Yellow with good opacity
          ctx.lineWidth = 1;
          const stepMarkWidth = 6; // Width of the horizontal dash
          
          // Draw marks on visible yard lines
          for (let yard = 0; yard <= 50; yard += 5) {
          if (yard === 0) continue;
          
          // Right side (home side) yard line
          const xRight = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
          if (xRight >= visibleLeft && xRight <= visibleRight && 
              leftYardLine !== null && rightYardLine !== null && 
              xRight >= leftYardLine && xRight <= rightYardLine) {
            const screenX = (xRight - centerX) * limitedScale + FIELD_LENGTH / 2;
            
            // Draw 4 marks from home hash upward
            for (let i = 1; i <= 4; i++) {
              const fieldY = HOME_HASH_Y - (fourStepsInPixels * i);
              if (fieldY > 0) {
                const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                  ctx.beginPath();
                  ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                  ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                  ctx.stroke();
                }
              }
            }
            
            // Draw 4 marks from home hash downward
            for (let i = 1; i <= 4; i++) {
              const fieldY = HOME_HASH_Y + (fourStepsInPixels * i);
              if (fieldY < VISITOR_HASH_Y) {
                const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                  ctx.beginPath();
                  ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                  ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                  ctx.stroke();
                }
              }
            }
            
            // Draw 4 marks from visitor hash upward
            for (let i = 1; i <= 4; i++) {
              const fieldY = VISITOR_HASH_Y - (fourStepsInPixels * i);
              if (fieldY > HOME_HASH_Y) {
                const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                  ctx.beginPath();
                  ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                  ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                  ctx.stroke();
                }
              }
            }
            
            // Draw 4 marks from visitor hash downward
            for (let i = 1; i <= 4; i++) {
              const fieldY = VISITOR_HASH_Y + (fourStepsInPixels * i);
              if (fieldY < FIELD_WIDTH) {
                const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                  ctx.beginPath();
                  ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                  ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                  ctx.stroke();
                }
              }
            }
          }
          
          // Left side (visitor side) yard line
          if (yard <= 45) {
            const xLeft = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
            if (xLeft >= visibleLeft && xLeft <= visibleRight && 
                leftYardLine !== null && rightYardLine !== null && 
                xLeft >= leftYardLine && xLeft <= rightYardLine) {
              const screenX = (xLeft - centerX) * limitedScale + FIELD_LENGTH / 2;
              
              // Draw 4 marks from home hash upward
              for (let i = 1; i <= 4; i++) {
                const fieldY = HOME_HASH_Y - (fourStepsInPixels * i);
                if (fieldY > 0) {
                  const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                  if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                    ctx.beginPath();
                    ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                    ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                    ctx.stroke();
                  }
                }
              }
              
              // Draw 4 marks from home hash downward
              for (let i = 1; i <= 4; i++) {
                const fieldY = HOME_HASH_Y + (fourStepsInPixels * i);
                if (fieldY < VISITOR_HASH_Y) {
                  const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                  if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                    ctx.beginPath();
                    ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                    ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                    ctx.stroke();
                  }
                }
              }
              
              // Draw 4 marks from visitor hash upward
              for (let i = 1; i <= 4; i++) {
                const fieldY = VISITOR_HASH_Y - (fourStepsInPixels * i);
                if (fieldY > HOME_HASH_Y) {
                  const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                  if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                    ctx.beginPath();
                    ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                    ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                    ctx.stroke();
                  }
                }
              }
              
              // Draw 4 marks from visitor hash downward
              for (let i = 1; i <= 4; i++) {
                const fieldY = VISITOR_HASH_Y + (fourStepsInPixels * i);
                if (fieldY < FIELD_WIDTH) {
                  const screenY = (fieldY - centerY) * limitedScale + FIELD_WIDTH / 2;
                  if (screenY >= 0 && screenY <= FIELD_WIDTH) {
                    ctx.beginPath();
                    ctx.moveTo(screenX - stepMarkWidth/2, screenY);
                    ctx.lineTo(screenX + stepMarkWidth/2, screenY);
                    ctx.stroke();
                  }
                }
              }
            }
          }
        }
        } // End of show4StepMarks condition
        
        ctx.restore();
    }
    
    // Draw count-off overlay
    if (isCountingOff && countOffNumber > 0) {
      ctx.save();
      
      // Semi-transparent background covering more of the screen
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, FIELD_LENGTH, FIELD_WIDTH);
      
      // Large count number in center
      ctx.font = 'bold 120px sans-serif';
      ctx.fillStyle = countOffNumber === 1 || countOffNumber === 5 ? '#FFD700' : 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countOffNumber.toString(), FIELD_LENGTH / 2, FIELD_WIDTH / 2);
      
      // "COUNT OFF" text above
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = 'white';
      ctx.fillText('COUNT OFF', FIELD_LENGTH / 2, FIELD_WIDTH / 2 - 100);
      
      ctx.restore();
    }
    
    // Draw count overlay during animation (after zoom transformation)
    if (isPlaying && currentCount > 0 && movementData[currentSetIndex + 1] && !isCountingOff) {
      const nextSet = movementData[currentSetIndex + 1];
      const totalCounts = parseInt(nextSet.counts) || 8;
      
      // Save context for UI drawing
      ctx.save();
      
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // More transparency
      ctx.fillRect(20, 20, 120, 80);
      
      // Count text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentCount.toString(), 80, 50);
      
      // "of X counts" text
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`of ${totalCounts} counts`, 80, 80);
      
      ctx.restore();
    }
    
    // Final reset of global alpha
    ctx.globalAlpha = 1;
  }, [show, currentSetIndex, showPaths, showOtherPerformers, show4StepMarks, movement, currentPerformerData, performerId, selectedPerformerId, animationProgress, isPlaying, currentCount, zoomToFit, directorView, quizMode, quizClickPosition, showQuizFeedback, isCountingOff, countOffNumber]);
  
  // Animation loop with smooth transitions and audio sync
  useEffect(() => {
    if (!isPlaying) return;
    
    const movementData = getMovementData();
    
    if (currentSetIndex >= movementData.length - 1) {
      setIsPlaying(false);
      setAnimationProgress(0);
      setCurrentCount(0);
      setStepFlashVisible(false);
      // Restore previous zoom state when animation ends
      if (previousZoomState !== null) {
        setZoomToFit(previousZoomState);
        setPreviousZoomState(null);
      }
      // Stop audio when animation ends
      if (audioEnabled) {
        audioService.stop();
      }
      return;
    }
    
    const nextSet = movementData[currentSetIndex + 1];
    const totalCounts = parseInt(nextSet?.counts) || 8;
    
    // Calculate timing based on movement tempo and playback speed
    const baseTempo = movement === '1' ? 140 : movement === '2' ? 170 : 120;
    const adjustedTempo = baseTempo * playbackSpeed; // Adjust tempo for playback speed
    const msPerBeat = 60000 / adjustedTempo; // milliseconds per beat
    const msPerCount = msPerBeat; // Assuming 1 count = 1 beat
    const totalDuration = totalCounts * msPerCount;
    
    // Parse all movement components from tip
    const tip = nextSet?.tip || '';
    const components = parseTipComponents(tip);
    
    // Sort components by their order in the tip
    components.sort((a, b) => a.index - b.index);
    
    // If no components found, assume simple move
    if (components.length === 0) {
      components.push({ type: 'move', counts: totalCounts, index: 0 });
    }
    
    // Use audio context time if audio is playing, otherwise use performance.now()
    let startTime;
    let useAudioClock = false;
    
    if (audioEnabled && audioLoaded && audioService.getIsPlaying()) {
      // Use audio context for timing to prevent drift
      const audioContext = audioService.getAudioContext();
      if (audioContext) {
        startTime = audioContext.currentTime;
        useAudioClock = true;
      }
    }
    
    if (!useAudioClock) {
      startTime = performance.now();
    }
    
    const animate = () => {
      let elapsed;
      
      if (useAudioClock && audioService.getIsPlaying()) {
        // Get elapsed time from audio context to stay in sync
        const audioContext = audioService.getAudioContext();
        if (audioContext) {
          elapsed = (audioContext.currentTime - startTime) * 1000; // Convert to milliseconds
        } else {
          // Fallback if audio context is lost
          elapsed = performance.now() - startTime;
        }
      } else {
        elapsed = performance.now() - startTime;
      }
      
      const currentCountProgress = elapsed / msPerCount;
      
      // Calculate movement progress based on components
      let movementProgress = 0;
      let accumulatedCounts = 0;
      let currentComponentIndex = 0;
      
      // Find which component we're in
      for (let i = 0; i < components.length; i++) {
        if (currentCountProgress <= accumulatedCounts + components[i].counts) {
          currentComponentIndex = i;
          break;
        }
        accumulatedCounts += components[i].counts;
      }
      
      // Calculate total move distance
      let totalMoveDistance = 0;
      for (const comp of components) {
        if (comp.type === 'move') {
          totalMoveDistance += comp.counts;
        }
      }
      
      // Calculate current progress through all components
      let currentMoveProgress = 0;
      for (let i = 0; i <= currentComponentIndex; i++) {
        const comp = components[i];
        if (i < currentComponentIndex) {
          // Completed component
          if (comp.type === 'move') {
            currentMoveProgress += comp.counts;
          }
        } else {
          // Current component
          const componentStartCount = accumulatedCounts;
          const progressInComponent = currentCountProgress - componentStartCount;
          if (comp.type === 'move') {
            currentMoveProgress += Math.min(progressInComponent, comp.counts);
          }
        }
      }
      
      // Movement progress is ratio of move progress to total move distance
      movementProgress = totalMoveDistance > 0 ? Math.min(currentMoveProgress / totalMoveDistance, 1) : 0;
      
      setAnimationProgress(movementProgress);
      
      // Update count based on elapsed time - starts at 1 and counts up
      // When using audio clock, no offset needed as we're synced to audio time
      const countOffset = useAudioClock ? 0 : 25; // Only offset when not using audio clock
      const adjustedElapsed = elapsed + countOffset;
      const newCount = Math.min(Math.floor(adjustedElapsed / msPerCount) + 1, totalCounts);
      setCurrentCount(newCount);
      
      // Control step flash visibility based on raw elapsed time (not adjusted)
      // This ensures the flash is perfectly synchronized with the beat
      const elapsedInCurrentCount = elapsed % msPerCount;
      const flashDuration = msPerCount * 0.5; // Show for 50% of the beat
      
      // Only show step flash if we're currently in a "move" component
      let isInMoveComponent = false;
      const currentCountForComponent = elapsed / msPerCount;
      let componentAccumulated = 0;
      for (const comp of components) {
        if (currentCountForComponent <= componentAccumulated + comp.counts) {
          isInMoveComponent = comp.type === 'move';
          break;
        }
        componentAccumulated += comp.counts;
      }
      
      setStepFlashVisible(isInMoveComponent && elapsedInCurrentCount < flashDuration);
      
      // Audio sync removed - was causing restart issues
      // The audio and animation will stay in sync based on tempo calculations
      
      const timeProgress = Math.min(elapsed / totalDuration, 1);
      if (timeProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Move to next set
        setCurrentSetIndex(prev => prev + 1);
        setAnimationProgress(0);
        setCurrentCount(0);
        setStepFlashVisible(false);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentSetIndex, movement, audioEnabled, audioLoaded, isStaffView, selectedPerformerId, currentPerformerData, playbackSpeed]);
  
  const handlePlayPause = async () => {
    const movementData = getMovementData();
    let startingSetIndex = currentSetIndex;
    
    if (currentSetIndex >= movementData.length - 1) {
      startingSetIndex = 0;
      setCurrentSetIndex(0);
    }
    
    // If already counting off, ignore
    if (isCountingOff) return;
    
    const newPlayingState = !isPlaying;
    
    // If starting to play, save zoom state and enable zoom
    if (newPlayingState) {
      // Save current zoom state before changing it
      setPreviousZoomState(zoomToFit);
      // Enable zoom for animation
      setZoomToFit(true);
    } else {
      // Stopping - restore previous zoom state
      if (previousZoomState !== null) {
        setZoomToFit(previousZoomState);
        setPreviousZoomState(null);
      }
    }
    
    // If starting to play, do count-off first
    if (newPlayingState && audioEnabled && (movement === '1' || movement === '2')) {
      setIsCountingOff(true);
      
      // Start metronome count-off with current playback speed
      const countOffDuration = await audioService.playCountOff(movement, 8, playbackSpeed);
      
      // Animate the count-off numbers with adjusted tempo
      const baseTempo = movement === '1' ? 140 : movement === '2' ? 170 : 120;
      const adjustedTempo = baseTempo * playbackSpeed;
      const msPerBeat = 60000 / adjustedTempo;
      
      // Prepare audio to start after count-off
      const startAudioAfterCountOff = () => {
        if (!audioLoaded) {
          audioService.loadMovementAudio(movement).then((buffer) => {
            if (buffer) {
              audioService.setMovementData(movement, movementData);
              setAudioLoaded(true);
              
              // Calculate starting position
              let totalCountsToSet = 0;
              for (let i = 1; i <= startingSetIndex; i++) {
                totalCountsToSet += parseInt(movementData[i].counts) || 8;
              }
              
              // Start audio from calculated position
              audioService.play(movement, startingSetIndex, totalCountsToSet, playbackSpeed);
            }
          });
        } else {
          // Audio already loaded, calculate position and play
          let totalCountsToSet = 0;
          for (let i = 1; i <= startingSetIndex; i++) {
            totalCountsToSet += parseInt(movementData[i].counts) || 8;
          }
          
          // Start audio from calculated position
          audioService.play(movement, startingSetIndex, totalCountsToSet, playbackSpeed);
        }
      };
      
      for (let i = 1; i <= 8; i++) {
        setTimeout(() => {
          setCountOffNumber(i);
          if (i === 8) {
            // After last count, start the actual animation and audio
            setTimeout(async () => {
              setIsCountingOff(false);
              setCountOffNumber(0);
              
              // Start audio playback after count-off
              startAudioAfterCountOff();
              
              // Add delay for Safari audio to start properly
              const startupDelay = audioService.getStartupDelay();
              if (startupDelay > 0) {
                console.log(`Delaying animation start by ${startupDelay}ms for Safari audio sync`);
                await new Promise(resolve => setTimeout(resolve, startupDelay));
              }
              
              setIsPlaying(true);
            }, msPerBeat);
          }
        }, (i - 1) * msPerBeat);
      }
      
      return; // Exit early, actual play will happen after count-off
    }
    
    setIsPlaying(newPlayingState);
    
    
    // Handle audio playback
    if (audioEnabled && (movement === '1' || movement === '2')) {
      if (newPlayingState) {
        // If audio not loaded yet, load it first
        if (!audioLoaded) {
          audioService.loadMovementAudio(movement).then((buffer) => {
            if (buffer) {
              audioService.setMovementData(movement, movementData);
              setAudioLoaded(true);
              
              // Now start playing from the correct position
              let totalCountsToSet = 0;
              
              // Add counts for all completed transitions (sets 1 through currentSetIndex)
              for (let i = 1; i <= currentSetIndex; i++) {
                totalCountsToSet += parseInt(movementData[i].counts) || 8;
              }
              
              // Add current animation progress counts if in middle of transition
              if (animationProgress > 0 && currentSetIndex < movementData.length - 1) {
                const nextSet = movementData[currentSetIndex + 1];
                totalCountsToSet += animationProgress * (parseInt(nextSet?.counts) || 8);
              }
              
              // Start audio from calculated position
              audioService.play(movement, currentSetIndex, totalCountsToSet, playbackSpeed);
            }
          });
        } else {
          // Audio already loaded, calculate position and play
          let totalCountsToSet = 0;
          
          // Add counts for all completed transitions (sets 1 through currentSetIndex)
          for (let i = 1; i <= currentSetIndex; i++) {
            const counts = parseInt(movementData[i].counts) || 8;
            totalCountsToSet += counts;
          }
          
          // Add current animation progress counts if in middle of transition
          if (animationProgress > 0 && currentSetIndex < movementData.length - 1) {
            const nextSet = movementData[currentSetIndex + 1];
            totalCountsToSet += animationProgress * (parseInt(nextSet?.counts) || 8);
          }
          
          // Start audio from calculated position
          audioService.play(movement, currentSetIndex, totalCountsToSet, playbackSpeed);
        }
      } else {
        audioService.pause();
        setStepFlashVisible(false); // Reset flash when pausing
      }
    } else {
      // Not in countdown mode, handle normal play/pause
      setIsPlaying(newPlayingState);
    }
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentSetIndex(0);
    setAnimationProgress(0);
    setCurrentCount(0);
    setStepFlashVisible(false);
    setIsCountingOff(false);
    setCountOffNumber(0);
    // Restore previous zoom state if animation was playing
    if (previousZoomState !== null) {
      setZoomToFit(previousZoomState);
      setPreviousZoomState(null);
    }
    // Stop audio and metronome
    if (audioEnabled) {
      audioService.stopMetronome();
      audioService.stop();
    }
  };
  
  const handleNext = () => {
    const movementData = getMovementData();
    if (currentSetIndex < movementData.length - 1) {
      const newSetIndex = currentSetIndex + 1;
      setCurrentSetIndex(newSetIndex);
      setAnimationProgress(0);
      setCurrentCount(0);
      setStepFlashVisible(false);
      
      // If playing, restart audio from new position
      if (isPlaying && audioEnabled && audioLoaded && (movement === '1' || movement === '2')) {
        let totalCountsToSet = 0;
        // Add counts for all completed transitions up to the new set
        for (let i = 1; i <= newSetIndex; i++) {
          totalCountsToSet += parseInt(movementData[i].counts) || 8;
        }
        audioService.play(movement, newSetIndex, totalCountsToSet, playbackSpeed);
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentSetIndex > 0) {
      const newSetIndex = currentSetIndex - 1;
      setCurrentSetIndex(newSetIndex);
      setAnimationProgress(0);
      setCurrentCount(0);
      setStepFlashVisible(false);
      
      // If playing, restart audio from new position
      if (isPlaying && audioEnabled && audioLoaded && (movement === '1' || movement === '2')) {
        const movementData = getMovementData();
        let totalCountsToSet = 0;
        // Add counts for all completed transitions up to the new set
        for (let i = 1; i <= newSetIndex; i++) {
          totalCountsToSet += parseInt(movementData[i].counts) || 8;
        }
        audioService.play(movement, newSetIndex, totalCountsToSet, playbackSpeed);
      }
    }
  };
  
  // Quiz mode functions
  const startQuiz = () => {
    // Save current options before changing them
    setPreviousOptions({
      show4StepMarks,
      zoomToFit,
      showPaths,
      showOtherPerformers,
      directorView
    });
    
    // Determine the starting index for the quiz
    let startIndex = currentSetIndex;
    
    // Only back up if we're not at the first set of any movement
    if (currentSetIndex > 0) {
      // We can back up within this movement
      setCurrentSetIndex(currentSetIndex - 1);
      startIndex = currentSetIndex - 1;
    }
    // If currentSetIndex === 0, we stay at 0 (whether movement 1 or not)
    
    setQuizMode(true);
    setQuizStep('position');
    setQuizAnswers({});
    setShowQuizFeedback(false);
    setQuizClickPosition(null);
    setQuizScore({ correct: 0, total: 0 }); // Reset score when starting quiz
    setQuizStartIndex(startIndex); // Remember where we started
    setCrossMovementQuizCompleted(false); // Reset cross-movement quiz flag
    setIsPlaying(false);
    setShowFinalResults(false); // Reset final results modal
    setShowPerfectBadge(false); // Reset perfect badge
    // Automatically enable helpful features for quiz
    setShow4StepMarks(true);
    setZoomToFit(true);
  };
  
  const handleCanvasClick = (event) => {
    if (!quizMode || quizStep !== 'position') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate click position relative to canvas
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Scale to canvas internal coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    
    // Convert click to field coordinates for consistent storage
    let fieldX = canvasX;
    let fieldY = canvasY;
    
    // If zoomed, inverse transform to get field coordinates
    if (zoomToFit && currentTransformRef.current.scale !== 1) {
      // Use the exact transformation parameters that were used for drawing
      const { scale, centerX, centerY } = currentTransformRef.current;
      
      // Inverse transform: screen -> field coordinates
      fieldX = (canvasX - FIELD_LENGTH / 2) / scale + centerX;
      fieldY = (canvasY - FIELD_WIDTH / 2) / scale + centerY;
    }
    
    // Validate coordinates before storing
    if (isNaN(fieldX) || isNaN(fieldY)) {
      console.error('Invalid field coordinates:', { fieldX, fieldY });
      return;
    }
    
    // Store field coordinates (no need to transform for director view here since the drawing already handles it)
    const newPosition = { x: fieldX, y: fieldY };
    setQuizClickPosition(newPosition);
    
    
    // Automatically move to next quiz step
    setTimeout(() => {
      setQuizAnswers(prev => ({ ...prev, position: newPosition }));
      setQuizStep('counts');
    }, 500);
  };
  
  // Helper function to parse tip components
  const parseTipComponents = (tip) => {
    const moveMatches = tip.match(/move[^,]+?for\s+(\d+)\s+counts?/gi) || [];
    const holdMatches = tip.match(/hold(?:\s+for)?\s+(\d+)\s+counts?/gi) || [];
    
    const allMatches = [];
    
    // Process move matches
    moveMatches.forEach(matchStr => {
      const countMatch = matchStr.match(/for\s+(\d+)\s+counts?/i);
      if (countMatch) {
        const index = tip.indexOf(matchStr);
        allMatches.push({
          type: 'move',
          counts: parseInt(countMatch[1]),
          index: index
        });
      }
    });
    
    // Process hold matches
    holdMatches.forEach(matchStr => {
      const countMatch = matchStr.match(/(\d+)\s+counts?/i);
      if (countMatch) {
        const index = tip.indexOf(matchStr);
        allMatches.push({
          type: 'hold',
          counts: parseInt(countMatch[1]),
          index: index
        });
      }
    });
    
    // Sort by position in string to get correct order
    allMatches.sort((a, b) => a.index - b.index);
    
    return allMatches;
  };
  
  // Generate count options for quiz
  const generateCountOptions = (correctCount, hasHoldMove = false) => {
    const options = new Set();
    
    // Add the correct count (whether odd or even)
    options.add(correctCount);
    
    // Check if correct count is even
    const isCorrectEven = correctCount % 2 === 0;
    
    // Generate 3 incorrect options (all even)
    let attempts = 0;
    const maxAttempts = 50;
    
    while (options.size < 4 && attempts < maxAttempts) {
      attempts++;
      let wrongCount;
      
      // Base the generation on the correct count value
      if (correctCount <= 4) {
        // For small counts, use nearby even values (+/- 2 or 4)
        const offset = 2 * (Math.floor(Math.random() * 2) + 1);
        wrongCount = correctCount + (Math.random() < 0.5 ? -offset : offset);
      } else if (correctCount <= 8) {
        // For medium counts, use +/- 2, 4, or 6
        const offset = 2 * (Math.floor(Math.random() * 3) + 1);
        wrongCount = correctCount + (Math.random() < 0.5 ? -offset : offset);
      } else if (correctCount <= 32) {
        // For larger counts, use +/- 4, 6, or 8
        const offset = 2 * (Math.floor(Math.random() * 3) + 2);
        wrongCount = correctCount + (Math.random() < 0.5 ? -offset : offset);
      } else {
        // For very large counts (>32), use larger offsets
        const offset = 2 * (Math.floor(Math.random() * 5) + 2); // 4, 6, 8, 10, or 12
        wrongCount = correctCount + (Math.random() < 0.5 ? -offset : offset);
      }
      
      // Make sure wrong count is even
      wrongCount = Math.round(wrongCount / 2) * 2;
      
      // Ensure count is at least 2 and different from correct
      // Remove upper limit for very large counts
      if (wrongCount >= 2 && wrongCount !== correctCount) {
        options.add(wrongCount);
      }
    }
    
    // If we still don't have enough options (shouldn't happen), add some defaults
    if (options.size < 4) {
      const defaults = [correctCount - 8, correctCount - 4, correctCount + 4, correctCount + 8]
        .map(n => Math.max(2, Math.round(n / 2) * 2))
        .filter(n => n !== correctCount);
      
      for (const defaultOpt of defaults) {
        if (options.size < 4) {
          options.add(defaultOpt);
        }
      }
    }
    
    // Convert to array and shuffle using Fisher-Yates algorithm for better randomization
    const optionsArray = Array.from(options);
    for (let i = optionsArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionsArray[i], optionsArray[j]] = [optionsArray[j], optionsArray[i]];
    }
    return optionsArray;
  };
  
  // Helper function to get music image path
  const getMusicImagePath = (movement, setNumber) => {
    const currentPerformerId = isStaffView ? selectedPerformerId : performerId;
    let prefix = 'Staff';
    
    if (currentPerformerId) {
      if (currentPerformerId.startsWith('SD')) {
        prefix = 'SD';
      } else if (currentPerformerId.startsWith('TD')) {
        prefix = 'TD';
      } else if (currentPerformerId.startsWith('BD')) {
        prefix = 'BD';
      }
    }
    
    return `/music/${prefix}${movement}-${setNumber}.png`;
  };

  // Memoize count options for quiz - must be at component level, not in conditional
  const quizCountOptions = useMemo(() => {
    if (!quizMode || quizStep !== 'counts') return null;
    
    const movementData = getMovementData();
    const toSetIndex = getQuizToSetIndex();
    const nextSet = movementData[toSetIndex];
    if (!nextSet) return null;
    
    const actualCounts = parseInt(nextSet.counts) || 8;
    const tip = nextSet.tip || '';
    
    // Parse components from tip
    const components = [];
    const allMatches = parseTipComponents(tip);
    
    // Build components array
    allMatches.forEach(match => {
      components.push({
        type: match.type,
        counts: match.counts
      });
    });
    
    // If no components found in tip, create a single component
    if (components.length === 0) {
      components.push({
        type: null, // User must choose
        counts: actualCounts
      });
    }
    
    // Generate count options for each component
    const countOptions = {};
    components.forEach((comp, idx) => {
      countOptions[idx] = generateCountOptions(comp.counts);
    });
    
    return { components, countOptions, actualCounts, tip };
  }, [quizMode, quizStep, currentSetIndex, movement, performerId, selectedPerformerId, isStaffView]); // Dependencies
  
  // Memoize music options for quiz
  const quizMusicOptions = useMemo(() => {
    if (!quizMode || quizStep !== 'music') return null;
    
    const movementData = getMovementData();
    const toSetIndex = getQuizToSetIndex();
    const nextSet = movementData[toSetIndex];
    if (!nextSet) return null;
    
    const nextSetNumber = nextSet.set;
    const hasMusic = getMusicAvailability(nextSetNumber);
    
    // Create options array
    const options = [];
    
    // Add the correct option
    if (hasMusic) {
      options.push({
        setNumber: nextSetNumber,
        isCorrect: true,
        isRest: false,
        imagePath: getMusicImagePath(movement, nextSetNumber)
      });
    } else {
      options.push({
        setNumber: nextSetNumber,
        isCorrect: true,
        isRest: true,
        imagePath: null
      });
    }
    
    // Generate 3 incorrect options
    const allSets = movementData.map(s => s.set);
    const usedSets = new Set([nextSetNumber]);
    let hasRestOption = hasMusic ? false : true; // Track if we already have a Rest option
    
    while (options.length < 4) {
      // Find available sets with music that haven't been used
      const availableSets = allSets.filter(s => 
        !usedSets.has(s) && getMusicAvailability(s)
      );
      
      // Decide whether to add a Rest option or a music option
      const shouldAddRest = !hasRestOption && (
        availableSets.length === 0 || // No more music options available
        (Math.random() < 0.3 && options.length === 3) // 30% chance on last option
      );
      
      if (shouldAddRest) {
        options.push({
          setNumber: null,
          isCorrect: false,
          isRest: true,
          imagePath: null
        });
        hasRestOption = true;
      } else if (availableSets.length > 0) {
        // Add a music option
        const randomSet = availableSets[Math.floor(Math.random() * availableSets.length)];
        usedSets.add(randomSet);
        options.push({
          setNumber: randomSet,
          isCorrect: false,
          isRest: false,
          imagePath: getMusicImagePath(movement, randomSet)
        });
      } else {
        // No more music options and we already have a rest option
        // Find any set we haven't used yet, even if it doesn't have music
        const unusedSets = allSets.filter(s => !usedSets.has(s));
        if (unusedSets.length > 0) {
          const randomSet = unusedSets[Math.floor(Math.random() * unusedSets.length)];
          usedSets.add(randomSet);
          if (!hasRestOption) {
            // Add as Rest since it doesn't have music
            options.push({
              setNumber: null,
              isCorrect: false,
              isRest: true,
              imagePath: null
            });
            hasRestOption = true;
          } else {
            // Skip this iteration to avoid duplicate rest options
            continue;
          }
        } else {
          // Fallback: duplicate a music option if we can't fill 4 options
          const musicOptions = options.filter(o => !o.isRest && !o.isCorrect);
          if (musicOptions.length > 0) {
            const randomOption = musicOptions[Math.floor(Math.random() * musicOptions.length)];
            options.push({...randomOption, isCorrect: false});
          }
        }
      }
    }
    
    // Shuffle options using Fisher-Yates
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return options;
  }, [quizMode, quizStep, currentSetIndex, movement]);

  const checkQuizAnswer = (answersToCheck = null) => {
    const movementData = getMovementData();
    const toSetIndex = getQuizToSetIndex();
    const nextSet = movementData[toSetIndex];
    if (!nextSet) return;
    
    // Use passed answers or fall back to state
    const answers = answersToCheck || quizAnswers;
    
    let correct = 0;
    let total = 0;
    
    
    // Check position
    if (answers.position) {
      total++;
      const actualPos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
      const { x: actualX, y: actualY } = transformForDirectorView(actualPos.x, actualPos.y);
      
      // Compare in field coordinates (both are now in field space)
      const distance = Math.sqrt(
        Math.pow(answers.position.x - actualX, 2) + 
        Math.pow(answers.position.y - actualY, 2)
      );
      // Use relative tolerance
      const tolerance = FIELD_WIDTH * 0.05; // 20 pixels (5% of 400) - more precise
      if (distance < tolerance) correct++;
    }
    
    // Check counts
    if (answers.counts !== undefined && answers.counts !== '') {
      total++;
      const userCounts = parseInt(answers.counts);
      const actualCounts = parseInt(nextSet.counts) || 8;
      
      // For components, check both total and individual components
      if (answers.components && answers.components.length > 0) {
        // First check if total is correct
        if (userCounts === actualCounts) {
          // Now check components if tip exists
          const tip = nextSet.tip || '';
          if (tip) {
            // Parse actual components from tip
            const actualComponents = [];
            const allMatches = parseTipComponents(tip);
            
            // Check if user's components match
            let componentsCorrect = true;
            if (allMatches.length === answers.components.length) {
              for (let i = 0; i < allMatches.length; i++) {
                if (allMatches[i].type !== answers.components[i].type ||
                    allMatches[i].counts !== answers.components[i].counts) {
                  componentsCorrect = false;
                  break;
                }
              }
            } else if (allMatches.length === 0 && answers.components.length === 1) {
              // No components in tip, just check total
              componentsCorrect = true;
            } else {
              componentsCorrect = false;
            }
            
            if (componentsCorrect) correct++;
          } else {
            // No tip, just total counts matter
            correct++;
          }
        }
      } else {
        // Simple counts check
        if (userCounts === actualCounts) correct++;
      }
    }
    
    // Check facing
    if (answers.facing) {
      total++;
      const actualOrientation = nextSet.orientation || 'Front';
      
      // For quiz purposes, flip Left/Right End Zone due to field orientation
      let expectedAnswer = actualOrientation;
      if (actualOrientation === 'Left End Zone') {
        expectedAnswer = 'Right End Zone';
      } else if (actualOrientation === 'Right End Zone') {
        expectedAnswer = 'Left End Zone';
      }
      
      if (answers.facing === expectedAnswer) correct++;
    }
    
    // Check music
    if (answers.music) {
      total++;
      const hasMusic = getMusicAvailability(nextSet.set);
      if (answers.music.isCorrect) {
        correct++;
      }
    }
    
    
    setQuizScore(prev => ({
      correct: prev.correct + correct,
      total: prev.total + total
    }));
    
    setShowQuizFeedback(true);
  };
  
  const exitQuizMode = () => {
    setQuizMode(false);
    setQuizStep(null);
    setQuizAnswers({});
    setShowQuizFeedback(false);
    setQuizClickPosition(null);
    setShowPerfectBadge(false);
    setCrossMovementQuizCompleted(false);
    
    // Restore previous options if they were saved
    if (previousOptions) {
      setShow4StepMarks(previousOptions.show4StepMarks);
      setZoomToFit(previousOptions.zoomToFit);
      setShowPaths(previousOptions.showPaths);
      setShowOtherPerformers(previousOptions.showOtherPerformers);
      setDirectorView(previousOptions.directorView);
      setPreviousOptions(null);
    }
  };
  
  const nextQuizSet = () => {
    const movementData = getMovementData();
    
    // Special handling for first set of non-first movement
    // If we're at index 0 and haven't completed the cross-movement quiz yet
    if (movement !== '1' && currentSetIndex === 0 && !crossMovementQuizCompleted) {
      // We just completed the cross-movement quiz, mark it as done
      setCrossMovementQuizCompleted(true);
      setQuizStep('position');
      setQuizAnswers({});
      setShowQuizFeedback(false);
      setQuizClickPosition(null);
      // Don't increment currentSetIndex - stay at 0 for the next quiz (set 14 → set 15)
    } else if (currentSetIndex < movementData.length - 2) {
      // Only increment if we're not on the second-to-last set
      // (movementData.length - 2 means we can still ask about one more transition)
      setCurrentSetIndex(prev => prev + 1);
      setQuizStep('position');
      setQuizAnswers({}); // This clears all answers including holdCounts/moveCounts
      setShowQuizFeedback(false);
      setQuizClickPosition(null);
    } else {
      // Quiz completed - save final score and show results
      // This triggers when currentSetIndex >= movementData.length - 2
      // (i.e., we just completed the last possible quiz)
      setFinalQuizScore({ ...quizScore });
      setShowFinalResults(true);
      
      // Check if perfect score AND started from beginning
      const isPerfectScore = quizScore.correct === quizScore.total && quizScore.total > 0;
      const isCompleteMovement = quizStartIndex === 0;
      
      if (isPerfectScore && isCompleteMovement) {
        // Save trophy to localStorage only for complete movement
        const trophyKey = `quiz_trophies_movement_${movement}`;
        const currentTrophies = parseInt(localStorage.getItem(trophyKey) || '0');
        const newTrophyCount = currentTrophies + 1;
        localStorage.setItem(trophyKey, newTrophyCount.toString());
        setTrophyCount(newTrophyCount);
        
        // Show trophy badge after a short delay
        setTimeout(() => {
          setShowPerfectBadge(true);
        }, 500);
      }
    }
  };
  
  if (!show) return null;
  
  const movementData = getMovementData();
  const currentSet = movementData[currentSetIndex];
  
  // Calculate the minimum and maximum set numbers in the current movement
  const minSetNumber = Math.min(...movementData.map(s => s.set));
  const maxSetNumber = Math.max(...movementData.map(s => s.set));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">
            Path Visualization{selectedPerformerId ? ` - ${selectedPerformerId}` : ''}
          </h3>
          <button
            onClick={() => {
              // Stop any running animation before closing
              if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
              }
              // Stop audio when closing modal
              if (audioService) {
                audioService.emergencyStop();
              }
              setIsPlaying(false);
              onClose();
            }}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Performer selector for staff view */}
        {isStaffView && (
          <div className="mb-4 bg-red-700/20 border border-red-500/30 rounded-lg p-3">
            <label className="text-white text-sm mb-2 block">Select a performer to visualize:</label>
            <select
              value={selectedPerformerId || ''}
              onChange={(e) => setSelectedPerformerId(e.target.value || null)}
              className="w-full bg-red-800/50 text-white border border-red-500/30 rounded-lg px-3 py-2"
            >
              <option value="">-- Select a performer --</option>
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
                .map(id => (
                  <option key={id} value={id}>
                    {id} - {performerData[id].name} (#{performerData[id].number})
                  </option>
                ))}
            </select>
          </div>
        )}
        
        {/* Show canvas only if we have a performer selected (or not in staff view) */}
        {(!isStaffView || selectedPerformerId) ? (
          <>
            <div className="relative mb-4">
              <div className="relative bg-green-900/20 rounded-lg overflow-hidden">
                {/* Canvas */}
                <canvas
                  ref={canvasRef}
                  width={FIELD_LENGTH}
                  height={FIELD_WIDTH}
                  className="w-full h-auto"
                  onClick={quizMode && quizStep === 'position' ? handleCanvasClick : undefined}
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    aspectRatio: `${FIELD_LENGTH}/${FIELD_WIDTH}`,
                    objectFit: 'contain',
                    cursor: quizMode && quizStep === 'position' ? 'crosshair' : 'default'
                  }}
                />
              </div>
              
              {/* Position indicator legend when showing incorrect quiz feedback */}
              {quizMode && showQuizFeedback && quizAnswers.position && (() => {
                const toSetIndex = getQuizToSetIndex();
                const nextSet = movementData[toSetIndex];
                if (!nextSet) return null;
                const actualPos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
                const { x: actualX, y: actualY } = transformForDirectorView(actualPos.x, actualPos.y);
                
                const distance = Math.sqrt(
                  Math.pow(quizAnswers.position.x - actualX, 2) + 
                  Math.pow(quizAnswers.position.y - actualY, 2)
                );
                const tolerance = FIELD_WIDTH * 0.05; // 20 pixels (5% of 400)
                const isCorrect = distance < tolerance;
                
                if (!isCorrect) {
                  return (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 p-2 bg-black/60 rounded text-xs">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffff00' }}></div>
                          <span className="text-white/80">Your selection</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00ff00' }}></div>
                          <span className="text-white/80">Actual position</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            
              {/* Zoom button overlay - positioned above end zone, between front sideline and home hash */}
              <button
            onClick={() => setZoomToFit(!zoomToFit)}
            className={`absolute ${
              zoomToFit 
                ? 'bg-blue-600/80 hover:bg-blue-700' 
                : 'bg-red-600/60 hover:bg-red-700'
            } text-white border border-white/40 rounded-lg p-1.5 shadow-md transition-all duration-200`}
            style={{
              // Position in the center of the left end zone
              left: '3%', // Slightly right in the end zone
              // Position to avoid both count display and end zone label
              top: '27%', // Slightly lower, between count display and end zone label
            }}
            title={zoomToFit ? "Show full field" : "Zoom to performers"}
          >
            {zoomToFit ? (
              <ZoomOut className="w-4 h-4" />
            ) : (
              <ZoomIn className="w-4 h-4" />
            )}
          </button>
          </div>
          
          {/* Current set info - different during animation */}
          {currentSet && !quizMode && !isCountingOff && (
            <>
              {isPlaying && movementData[currentSetIndex + 1] ? (
                // Animation mode display
                <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-3 mb-4">
                  <div className="text-white">
                    {/* Destination set info */}
                    <div className="text-xl font-bold mb-2">
                      To Set {movementData[currentSetIndex + 1].set}
                      {rehearsalMarks[movement]?.[String(movementData[currentSetIndex + 1].set)] && (
                        <span className="ml-2 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-purple-300 text-base font-bold">
                          {rehearsalMarks[movement][String(movementData[currentSetIndex + 1].set)]}
                        </span>
                      )}
                    </div>
                    {/* Tip for the transition */}
                    {movementData[currentSetIndex + 1]?.tip && (
                      <div className="text-yellow-300 text-sm flex items-start">
                        <span className="mr-1">💡</span>
                        <span>{movementData[currentSetIndex + 1].tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Normal (not animating) display
                <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-3 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-white text-sm">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold">Set {currentSet.set}:</span>
                        {rehearsalMarks[movement]?.[String(currentSet.set)] && (
                          <span className="px-2 py-0.5 bg-purple-600/20 border border-purple-500/30 rounded text-purple-300 text-xs font-bold">
                            {rehearsalMarks[movement][String(currentSet.set)]}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        {highlightNumbers(currentSet.leftRight)} | {highlightNumbers(currentSet.homeVisitor)}
                        {currentSet.counts && <span className="ml-2">({currentSet.counts} counts)</span>}
                      </div>
                    </div>
                    {(!isStaffView || selectedPerformerId) && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowDrillChart(true)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon-sm transition-all duration-200"
                          title="View drill chart"
                        >
                          <Map className="w-5 h-5 text-blue-300" />
                        </button>
                        {getMusicAvailability(currentSet.set) && currentSet.set > 1 && (
                          <button
                            onClick={() => setShowMusic(true)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon-sm transition-all duration-200"
                            title="View music snippet"
                          >
                            <Music className="w-5 h-5 text-blue-300" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotes(true)}
                          className={`${checkHasNote(currentSet.set) ? 'bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30' : 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30'} rounded-lg p-icon-sm transition-all duration-200 relative`}
                          title="Personal notes"
                        >
                          <StickyNote className={`w-5 h-5 ${checkHasNote(currentSet.set) ? 'text-yellow-300' : 'text-blue-300'}`} />
                          {checkHasNote(currentSet.set) && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {currentSet.tip && (
                    <div className="text-yellow-300 text-sm flex items-start mt-2">
                      <span className="mr-1">💡</span>
                      <span>{currentSet.tip}</span>
                    </div>
                  )}
                  {/* Nickname badge */}
                  <div className="flex justify-end mt-2">
                    <NicknameBadge movement={movement} setNumber={currentSet.set} />
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Quiz UI */}
          {quizMode && !showQuizFeedback && (() => {
            const fromSet = getQuizFromSet();
            const toSetIndex = getQuizToSetIndex();
            const toSet = movementData[toSetIndex];
            if (!fromSet || !toSet) return null;
            return (
              <div className="bg-purple-700/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="w-5 h-5 text-purple-300 mr-2" />
                    <h4 className="text-white font-semibold" style={{"marginTop": ".3rem", "marginBottom" : ".3rem"}}>Quiz Mode Set {fromSet.set} → Set {toSet.set}</h4>
                  </div>
                {trophyCount > 0 && (
                  <div className="flex items-center bg-yellow-600/20 px-2 py-1 rounded-lg">
                    <Trophy className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-yellow-300 text-sm font-semibold">{trophyCount}</span>
                  </div>
                )}
              </div>
              
              {quizStep === 'position' && (
                <div className="text-white/80">
                  <p className="mb-2">Touch on the field where you'll be for Set {toSet.set}</p>
                  <p className="text-sm text-white/60">Tip: You can pinch to zoom for more precision</p>
                </div>
              )}
              
              {quizStep === 'counts' && quizCountOptions && (
                <div>
                  <p className="text-white/80 mb-3">
                    How do you get to Set {toSet.set}?
                  </p>
                        
                  <div className="space-y-4">
                    {quizCountOptions.components.map((component, idx) => (
                      <div key={idx} className="border border-purple-500/30 rounded-lg p-3 bg-purple-700/10">
                        <p className="text-white/70 text-sm mb-2">
                          Component {idx + 1}{quizCountOptions.components.length > 1 ? ` of ${quizCountOptions.components.length}` : ''}:
                        </p>
                              
                              {/* Action type selection */}
                              <div className="mb-3">
                                <p className="text-white/60 text-xs mb-2">Action type:</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setQuizAnswers(prev => ({ 
                                      ...prev, 
                                      [`component${idx}_type`]: 'move'
                                    }))}
                                    className={`px-3 py-1 rounded text-white ${
                                      quizAnswers[`component${idx}_type`] === 'move'
                                        ? 'bg-blue-600/40 border-blue-400'
                                        : 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30'
                                    } border`}
                                  >
                                    Move
                                  </button>
                                  <button
                                    onClick={() => setQuizAnswers(prev => ({ 
                                      ...prev, 
                                      [`component${idx}_type`]: 'hold'
                                    }))}
                                    className={`px-3 py-1 rounded text-white ${
                                      quizAnswers[`component${idx}_type`] === 'hold'
                                        ? 'bg-blue-600/40 border-blue-400'
                                        : 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30'
                                    } border`}
                                  >
                                    Hold
                                  </button>
                                </div>
                              </div>
                              
                        {/* Count selection */}
                        <div>
                          <p className="text-white/60 text-xs mb-2">Counts:</p>
                          <div className="flex flex-wrap gap-2">
                            {quizCountOptions.countOptions[idx].map(count => (
                              <button
                                key={`comp${idx}-${count}`}
                                onClick={() => setQuizAnswers(prev => ({ 
                                  ...prev, 
                                  [`component${idx}_counts`]: count.toString()
                                }))}
                                className={`px-3 py-1 rounded text-white ${
                                  quizAnswers[`component${idx}_counts`] === count.toString()
                                    ? 'bg-purple-600/40 border-purple-400'
                                    : 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30'
                                } border`}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                        
                        <button
                          onClick={() => {
                            // Calculate total and store components info
                            let total = 0;
                            const componentData = [];
                            
                            quizCountOptions.components.forEach((comp, idx) => {
                              const counts = parseInt(quizAnswers[`component${idx}_counts`] || 0);
                              total += counts;
                              componentData.push({
                                type: quizAnswers[`component${idx}_type`],
                                counts: counts
                              });
                            });
                            
                            setQuizAnswers(prev => ({ 
                              ...prev, 
                              counts: total.toString(),
                              components: componentData,
                              componentCount: quizCountOptions.components.length
                            }));
                            setQuizStep('facing');
                          }}
                          disabled={(() => {
                            // Check if all components have both type and counts selected
                            for (let i = 0; i < quizCountOptions.components.length; i++) {
                              if (!quizAnswers[`component${i}_type`] || !quizAnswers[`component${i}_counts`]) {
                                return true;
                              }
                            }
                            return false;
                          })()}
                          className="mt-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                </div>
              )}
              
              
              {quizStep === 'facing' && (
                <div>
                  <p className="text-white/80 mb-2">What direction will you be facing in Set {toSet.set}?</p>
                  <div className="flex flex-wrap gap-2">
                    {['Front', 'Back', 'Left End Zone', 'Right End Zone'].map(dir => (
                      <button
                        key={dir}
                        onClick={() => {
                          setQuizAnswers(prev => ({ ...prev, facing: dir }));
                          setQuizStep('music');
                        }}
                        className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-white text-sm"
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {quizStep === 'music' && quizMusicOptions && (
                <div>
                  <p className="text-white/80 mb-3">What music plays during Set {toSet.set}?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {quizMusicOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const updatedAnswers = { ...quizAnswers, music: option };
                          setQuizAnswers(updatedAnswers);
                          // Check all answers after music selection
                          checkQuizAnswer(updatedAnswers);
                        }}
                        className="relative overflow-hidden bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg p-2 transition-all duration-200"
                      >
                        {option.isRest ? (
                          <div className="flex flex-col items-center justify-center h-24">
                            <div className="text-white/60 text-2xl mb-1">𝄽</div>
                            <span className="text-white/80 text-sm">Rest</span>
                          </div>
                        ) : (
                          <img
                            src={option.imagePath}
                            alt={`Music for Set ${option.setNumber}`}
                            className="w-full h-24 object-contain"
                            onError={(e) => {
                              // If image fails to load, show placeholder
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="flex flex-col items-center justify-center h-24">
                                  <div class="text-white/60 text-sm">Set ${option.setNumber}</div>
                                </div>
                              `;
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })()}
          
          {/* Quiz Feedback */}
          {quizMode && showQuizFeedback && (() => {
            const fromSet = getQuizFromSet();
            const toSetIndex = getQuizToSetIndex();
            const toSet = movementData[toSetIndex];
            if (!fromSet || !toSet) return null;
            return (
            <div className="bg-blue-700/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-300 mr-2" />
                  Quiz Results
                </h4>
                {trophyCount > 0 && (
                  <div className="flex items-center bg-yellow-600/20 px-2 py-1 rounded-lg">
                    <Trophy className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-yellow-300 text-sm font-semibold">{trophyCount}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                {quizAnswers.position && (
                  <div className="flex items-center">
                    {(() => {
                      const nextSet = toSet;
                      const actualPos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
                      const { x: actualX, y: actualY } = transformForDirectorView(actualPos.x, actualPos.y);
                      
                      // Compare in field coordinates
                      const distance = Math.sqrt(
                        Math.pow(quizAnswers.position.x - actualX, 2) + 
                        Math.pow(quizAnswers.position.y - actualY, 2)
                      );
                      const tolerance = FIELD_WIDTH * 0.05; // 20 pixels (5% of 400)
                      const isCorrect = distance < tolerance;
                      return (
                        <>
                          {isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-300 mr-2" />
                          )}
                          <span className="text-white/80">
                            Position: {isCorrect ? 'Correct!' : (
                              <>
                                <span className="text-red-300">Incorrect</span>
                                <span className="text-white/60 ml-2">→ Actual: {nextSet.leftRight} | {nextSet.homeVisitor}</span>
                              </>
                            )}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {quizAnswers.counts !== undefined && (
                  <div>
                    {(() => {
                      const nextSet = toSet;
                      const actualCounts = parseInt(nextSet.counts) || 8;
                      const userCounts = parseInt(quizAnswers.counts);
                      const tip = nextSet.tip || '';
                      
                      // Check if this was a components question
                      if (quizAnswers.components && quizAnswers.components.length > 0) {
                        // Parse actual components from tip for comparison
                        const actualComponents = [];
                        const allMatches = parseTipComponents(tip);
                        
                        let componentsCorrect = userCounts === actualCounts;
                        if (componentsCorrect && allMatches.length > 0) {
                          // Check individual components
                          for (let i = 0; i < Math.max(allMatches.length, quizAnswers.components.length); i++) {
                            if (!allMatches[i] || !quizAnswers.components[i] ||
                                allMatches[i].type !== quizAnswers.components[i].type ||
                                allMatches[i].counts !== quizAnswers.components[i].counts) {
                              componentsCorrect = false;
                              break;
                            }
                          }
                        }
                        
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              {componentsCorrect ? (
                                <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-300 mr-2" />
                              )}
                              <span className="text-white/80">
                                Total Counts: {actualCounts} {userCounts !== actualCounts && <span className="text-red-300">(You: {userCounts})</span>}
                              </span>
                            </div>
                            <div className="ml-6 text-sm space-y-1">
                              {quizAnswers.components.map((comp, idx) => (
                                <div key={idx} className="text-white/60">
                                  Component {idx + 1}: {comp.type} {comp.counts} counts
                                </div>
                              ))}
                              {tip && (
                                <div className="text-yellow-300 text-xs mt-1">
                                  Tip: {tip}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        // Simple counts display
                        const isCorrect = userCounts === actualCounts;
                        return (
                          <div className="flex items-center">
                            {isCorrect ? (
                              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-300 mr-2" />
                            )}
                            <span className="text-white/80">
                              Counts: {actualCounts}
                            </span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
                
                {quizAnswers.facing && (
                  <div className="flex items-center">
                    {(() => {
                      const actualOrientation = toSet.orientation || 'Front';
                      let expectedAnswer = actualOrientation;
                      if (actualOrientation === 'Left End Zone') {
                        expectedAnswer = 'Right End Zone';
                      } else if (actualOrientation === 'Right End Zone') {
                        expectedAnswer = 'Left End Zone';
                      }
                      const isCorrect = quizAnswers.facing === expectedAnswer;
                      
                      return (
                        <>
                          {isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-300 mr-2" />
                          )}
                          <span className="text-white/80">
                            Facing: {expectedAnswer}
                            {!isCorrect && (
                              <span className="text-red-300 ml-2">
                                (You answered: {quizAnswers.facing})
                              </span>
                            )}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {quizAnswers.music && (
                  <div className="flex items-start">
                    <div className="mt-1">
                      {quizAnswers.music.isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-300 mr-2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-white/80 text-sm">Music:</span>
                      <div className="mt-1">
                        {getMusicAvailability(toSet.set) ? (
                          <img
                            src={getMusicImagePath(movement, toSet.set)}
                            alt={`Music for Set ${toSet.set}`}
                            className="w-full max-w-[150px] rounded border border-white/20"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="text-white/60 text-sm">Music image not available</div>';
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-white/60 text-2xl">𝄽</div>
                            <span className="text-white/80 text-sm">Rest</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-white/80 mb-2">
                  Overall Score: {quizScore.correct}/{quizScore.total} ({quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0}%)
                </p>
                {(() => {
                  // Check if this is the last possible quiz
                  // The last quiz is when we're going from the second-to-last set to the last set
                  const isLastQuiz = toSet.set === movementData[movementData.length - 1].set;
                  
                  if (!isLastQuiz) {
                    return (
                      <button
                        onClick={nextQuizSet}
                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded text-white"
                      >
                        Next Set
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={() => {
                          // For the last set, show results
                          nextQuizSet(); // This will handle trophy logic
                        }}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-white"
                      >
                        Show Results
                      </button>
                    );
                  }
                })()}
              </div>
            </div>
            );
          })()}
          
          {/* Playback controls */}
          {!quizMode && !isCountingOff && (
            <>
              {isPlaying ? (
                // Simplified controls during animation - just pause button
                <div className="flex items-center justify-center">
                  <button
                    onClick={handlePlayPause}
                    className="bg-red-600/30 hover:bg-red-600/40 border border-red-500/30 rounded-lg p-3 transition-all duration-200"
                  >
                    <Pause className="w-6 h-6 text-white" />
                  </button>
                </div>
              ) : (
                // Full controls when not playing
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {/* Main playback controls group */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleReset}
                      className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200"
                    >
                      <SkipBack className="w-5 h-5 text-white" />
                    </button>
                    
                    <button
                      onClick={handlePrevious}
                      disabled={currentSetIndex === 0}
                      className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    
                    <button
                      onClick={handlePlayPause}
                      className="bg-red-600/30 hover:bg-red-600/40 border border-red-500/30 rounded-lg p-3 transition-all duration-200"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </button>
                    
                    <button
                      onClick={handleNext}
                      disabled={currentSetIndex >= movementData.length - 1}
                      className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                    
                    <div className="bg-red-600/20 border border-red-500/30 rounded-lg px-3 py-1">
                      <span className="text-white text-sm font-semibold">
                        {currentSetIndex + 1} / {movementData.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Audio controls group - wraps to new line on mobile */}
                  {(movement === '1' || movement === '2') && (
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block w-px h-8 bg-white/20" />
                      
                      <button
                        onClick={() => {
                          const newAudioEnabled = !audioEnabled;
                          setAudioEnabled(newAudioEnabled);
                          // Set volume based on mute state
                          if (audioService) {
                            audioService.setVolume(newAudioEnabled ? 1.0 : 0);
                          }
                        }}
                        className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon-sm transition-all duration-200"
                        title={audioEnabled ? "Mute audio" : "Enable audio"}
                      >
                        {audioEnabled ? (
                          <Volume2 className="w-5 h-5 text-white" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-white" />
                        )}
                      </button>
                      
                      {/* Speed control dropdown with inline styles for consistent padding */}
                      <select
                        value={playbackSpeed}
                        onChange={(e) => {
                          const newSpeed = parseFloat(e.target.value);
                          setPlaybackSpeed(newSpeed);
                          if (isPlaying && audioService) {
                            audioService.setPlaybackRate(newSpeed);
                          }
                        }}
                        className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-white text-sm cursor-pointer"
                        style={{ 
                          padding: '6px 12px',
                          minWidth: '85px'
                        }}
                        title="Playback speed"
                      >
                        <option value="1.0">100%</option>
                        <option value="0.95">95%</option>
                        <option value="0.9">90%</option>
                        <option value="0.85">85%</option>
                        <option value="0.8">80%</option>
                        <option value="0.75">75%</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          </>
        ) : (
          /* Show message when no performer is selected in staff view */
          <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 mb-4 text-center">
            <div className="text-white/60 text-lg">
              Please select a performer from the dropdown above to view their movement path.
            </div>
          </div>
        )}
        
        {/* Animation display OR Options - hidden during quiz mode */}
        {!quizMode && (
          <>
            {isCountingOff ? (
              // Countdown display
              <div className="mt-8 text-center">
                <div className="text-6xl font-bold text-yellow-400 animate-pulse">
                  Get Ready!
                </div>
              </div>
            ) : isPlaying && movementData[currentSetIndex + 1] ? (
              // Animation mode display
              <div className="mt-4 space-y-4">
                {/* Step/Hold display */}
                <div className="flex justify-center" style={{ minHeight: '120px' }}>
                  <div className="text-8xl font-bold">
                    {(() => {
                      const nextSet = movementData[currentSetIndex + 1];
                      const tip = nextSet?.tip || '';
                      
                      // Parse components to determine current action
                      const components = parseTipComponents(tip);
                      components.sort((a, b) => a.index - b.index);
                      
                      if (components.length === 0) {
                        components.push({ type: 'move', counts: parseInt(nextSet?.counts) || 8, index: 0 });
                      }
                      
                      // Find which component we're in
                      let accumulatedCounts = 0;
                      let currentComponent = null;
                      
                      for (const comp of components) {
                        if (currentCount <= accumulatedCounts + comp.counts) {
                          currentComponent = comp;
                          break;
                        }
                        accumulatedCounts += comp.counts;
                      }
                      
                      const isHolding = currentComponent?.type === 'hold';
                      
                      if (isHolding) {
                        return (
                          <span className="text-yellow-400">
                            HOLD
                          </span>
                        );
                      } else if (stepFlashVisible) {
                        return (
                          <span className="text-green-400">
                            STEP
                          </span>
                        );
                      } else {
                        return <span className="opacity-0">STEP</span>; // Keep space but invisible
                      }
                    })()}
                  </div>
                </div>
                
                {/* Music image for destination set */}
                <div className="flex justify-center">
                  {(() => {
                    const nextSet = movementData[currentSetIndex + 1];
                    const hasMusic = getMusicAvailability(nextSet?.set);
                    
                    if (hasMusic) {
                      // Use the same getMusicImagePath function for consistency
                      const imagePath = getMusicImagePath(movement, nextSet.set);
                      
                      return (
                        <div className="bg-blue-700/20 border border-blue-500/30 rounded-lg p-4">
                          <img 
                            src={imagePath}
                            alt={`Music for Set ${nextSet.set}`}
                            className="max-w-full h-auto rounded"
                            style={{ maxHeight: '200px' }}
                            onError={(e) => {
                              // Fallback to Staff version if performer-specific version not found
                              if (!e.target.src.includes('Staff')) {
                                e.target.src = `/music/Staff${movement}-${nextSet.set}.png`;
                              }
                            }}
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-gray-700/20 border border-gray-500/30 rounded-lg p-8">
                          <div className="text-center">
                            <div className="text-white/60 text-4xl mb-2">𝄽</div>
                            <span className="text-white/80 text-lg">Rest</span>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              // Normal options display when not animating
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pb-4 max-w-md mx-auto">
                <label className="flex items-center text-white/80 text-sm justify-center md:justify-start">
                  <input
                    type="checkbox"
                    checked={showPaths}
                    onChange={(e) => setShowPaths(e.target.checked)}
                    className="mr-2"
                  />
                  Show movement paths
                </label>
                <label className="flex items-center text-white/80 text-sm justify-center md:justify-start">
                  <input
                    type="checkbox"
                    checked={showOtherPerformers}
                    onChange={(e) => setShowOtherPerformers(e.target.checked)}
                    className="mr-2"
                  />
                  Show other performers
                </label>
                <label className="flex items-center text-white/80 text-sm justify-center md:justify-start">
                  <input
                    type="checkbox"
                    checked={show4StepMarks}
                    onChange={(e) => setShow4StepMarks(e.target.checked)}
                    className="mr-2"
                  />
                  Show 4-step ticks
                </label>
                <label className="flex items-center text-white/80 text-sm justify-center md:justify-start">
                  <input
                    type="checkbox"
                    checked={directorView}
                    onChange={(e) => setDirectorView(e.target.checked)}
                    className="mr-2"
                  />
                  Director's view
                </label>
              </div>
            )}
          </>
        )}
        
        {/* Quiz Mode Toggle - hidden during animation and countdown */}
        {!isPlaying && !isCountingOff && (
          <div className="flex justify-center mt-2 pb-4">
            <button
            onClick={() => {
              if (quizMode) {
                exitQuizMode();
              } else {
                startQuiz();
              }
            }}
            disabled={currentSetIndex >= movementData.length - 1}
            className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
              quizMode 
                ? 'bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30' 
                : 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30'
            } ${currentSetIndex >= movementData.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Brain className="w-5 h-5 text-purple-300 mr-2" />
            <span className="text-white">
              {quizMode ? 'Exit Quiz Mode' : 'Start Quiz Mode'}
            </span>
          </button>
          </div>
        )}
        
        {/* Legend when showing other performers - outside grid */}
        {showOtherPerformers && !quizMode && !isPlaying && !isCountingOff && (
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 mt-3 text-xs pb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-1 ml-1" style={{ backgroundColor: '#ef4444' }}></div>
              <span className="text-white/80">Current</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-1 ml-2" style={{ backgroundColor: '#60a5fa' }}></div>
              <span className="text-white/60">Snare</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-1 ml-2" style={{ backgroundColor: '#a78bfa' }}></div>
              <span className="text-white/60">Tenor</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-1 ml-2" style={{ backgroundColor: '#f59e0b' }}></div>
              <span className="text-white/60">Bass</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Drill Chart Modal */}
      <DrillChartModal
        show={showDrillChart}
        onClose={() => setShowDrillChart(false)}
        imagePath={`/drill/${movement}-${currentSet?.set || 1}.png`}
        movement={movement}
        setNumber={currentSet?.set || 1}
        totalSets={movementData.length}
        minSetNumber={minSetNumber}
        maxSetNumber={maxSetNumber}
      />
      
      {/* Music Modal */}
      <MusicModal
        show={showMusic}
        onClose={() => setShowMusic(false)}
        movement={movement}
        setNumber={currentSet?.set || 1}
        isStaffView={isStaffView}
        performerKey={isStaffView ? 'Staff' : performerId}
        totalSets={movementData.length}
        maxSetNumber={maxSetNumber}
      />
      
      {/* Notes Modal */}
      {showNotes && currentSet && (
        <NotesModal
          show={showNotes}
          onClose={() => setShowNotes(false)}
          performerId={isStaffView ? selectedPerformerId : performerId}
          movement={movement}
          setNumber={currentSet.set}
        />
      )}
      
      {/* Final Results Modal */}
      {showFinalResults && !showPerfectBadge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Quiz Complete!</h3>
              <button
                onClick={() => {
                  setShowFinalResults(false);
                  exitQuizMode();
                }}
                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg p-icon transition-all duration-200"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">
                    {Math.round((finalQuizScore.correct / finalQuizScore.total) * 100)}%
                  </div>
                  <div className="text-white/80 text-lg">
                    {finalQuizScore.correct} out of {finalQuizScore.total} correct
                  </div>
                </div>
              </div>
              
              <div className="text-center text-white/80">
                {finalQuizScore.correct === finalQuizScore.total ? (
                  <div>
                    <p className="text-green-400 font-semibold mb-2">Perfect Score! 🎉</p>
                    {quizStartIndex === 0 ? (
                      <p>You've earned a trophy for completing the entire movement!</p>
                    ) : (
                      <p>Great job! Complete the entire movement from the beginning to earn a trophy.</p>
                    )}
                  </div>
                ) : (
                  <p>Keep practicing to improve your score!</p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFinalResults(false);
                    setCurrentSetIndex(0);
                    startQuiz();
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-white"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setShowFinalResults(false);
                    exitQuizMode();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 rounded text-white"
                >
                  Exit Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Perfect Score Badge */}
      {showPerfectBadge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-600 p-1 rounded-xl animate-pulse">
            <div className="bg-yellow-900/90 backdrop-blur-sm rounded-xl p-8 text-center relative">
              <button
                onClick={() => {
                  setShowPerfectBadge(false);
                  setShowFinalResults(false);
                  exitQuizMode();
                }}
                className="absolute top-2 right-2 text-white/60 hover:text-white bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg p-icon transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-yellow-400 mb-2">Perfect Score!</h3>
              <p className="text-white text-lg mb-1">100% Accuracy</p>
              <p className="text-white/80">Movement {movement} Complete</p>
              <div className="mt-4 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="text-yellow-400 text-2xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                    ⭐
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowPerfectBadge(false);
                  setShowFinalResults(false);
                  exitQuizMode();
                }}
                className="mt-6 px-6 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathVisualizerModal;