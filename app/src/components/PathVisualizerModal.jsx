import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Map, Music, StickyNote } from 'lucide-react';
import { performerData } from '../data/performerData';
import DrillChartModal from './DrillChartModal';
import MusicModal from './MusicModal';
import NotesModal from './NotesModal';
import NicknameBadge from './NicknameBadge';
import { musicConfig } from '../data/musicConfig';

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
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 1 for transition
  const [currentCount, setCurrentCount] = useState(0);
  const [zoomToFit, setZoomToFit] = useState(false);
  const animationRef = useRef(null);
  const [logoImage, setLogoImage] = useState(null);
  const [animatedCenter, setAnimatedCenter] = useState({ x: 0, y: 0 });
  const [selectedPerformerId, setSelectedPerformerId] = useState(isStaffView ? null : performerId);
  const [showDrillChart, setShowDrillChart] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
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
  
  // Cleanup animation when modal closes
  useEffect(() => {
    if (!show) {
      // Stop animation
      setIsPlaying(false);
      // Cancel any running animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Reset state
      setCurrentSetIndex(0);
      setAnimationProgress(0);
      setCurrentCount(0);
      // Don't reset zoom - preserve user's preference
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
        
        // Debug log
        console.log(`Position: ${direction} ${steps} "${inOut}" ${yardLine}, base x: ${x}, offset: ${stepOffsetPixels}, inOut type: ${typeof inOut}`);
        
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
        
        console.log(`Final x: ${x}`);
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
  
  // Get all positions for the current movement
  const getMovementData = () => {
    // In staff view, use selected performer if available
    if (isStaffView && selectedPerformerId && performerData[selectedPerformerId]) {
      const performer = performerData[selectedPerformerId];
      if (performer.movements && performer.movements[movement]) {
        return performer.movements[movement];
      }
    }
    // Otherwise use passed performer data
    if (!currentPerformerData?.movements?.[movement]) return [];
    return currentPerformerData.movements[movement];
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
    const currentSet = movementData.find(s => s.set === currentSetNumber);
    if (currentSet) {
      const pos = parsePosition(currentSet.leftRight, currentSet.homeVisitor);
      positions.push(pos);
    }
    
    // Add next set position to smooth transitions
    if (includeNext && currentSetNumber < movementData.length) {
      const nextSet = movementData.find(s => s.set === currentSetNumber + 1);
      if (nextSet) {
        const pos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
        positions.push(pos);
      }
    }
    
    // Add other performers if shown
    if (showOtherPerformers) {
      Object.keys(performerData).forEach(otherPerformerId => {
        if (otherPerformerId === selectedPerformerId || otherPerformerId === 'Staff') return;
        
        const otherPerformer = performerData[otherPerformerId];
        if (otherPerformer.movements && otherPerformer.movements[movement]) {
          const otherSet = otherPerformer.movements[movement].find(s => s.set === currentSetNumber);
          if (otherSet) {
            const pos = parsePosition(otherSet.leftRight, otherSet.homeVisitor);
            positions.push(pos);
          }
          
          // Include next positions for other performers too
          if (includeNext && currentSetNumber < movementData.length) {
            const nextSet = otherPerformer.movements[movement].find(s => s.set === currentSetNumber + 1);
            if (nextSet) {
              const pos = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
              positions.push(pos);
            }
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
    if (zoomToFit && movementData[currentSetIndex]) {
      const currentSet = movementData[currentSetIndex];
      const currentBbox = calculateBoundingBox(currentSet.set, false); // Don't include next position
      
      // If animating, interpolate between current and next bounding boxes
      let targetCenterX = 0;
      let targetCenterY = 0;
      
      if (currentBbox) {
        targetCenterX = currentBbox.x + currentBbox.width / 2;
        targetCenterY = currentBbox.y + currentBbox.height / 2;
        
        // During animation, smoothly interpolate to next position
        if (isPlaying && animationProgress > 0 && currentSetIndex < movementData.length - 1) {
          const nextSet = movementData[currentSetIndex + 1];
          const nextBbox = calculateBoundingBox(nextSet.set, false);
          if (nextBbox) {
            const nextCenterX = nextBbox.x + nextBbox.width / 2;
            const nextCenterY = nextBbox.y + nextBbox.height / 2;
            
            // Smooth interpolation
            targetCenterX = targetCenterX + (nextCenterX - targetCenterX) * animationProgress;
            targetCenterY = targetCenterY + (nextCenterY - targetCenterY) * animationProgress;
          }
        }
        
        // Use a fixed bounding box size based on all performers to avoid scale jumping
        const fixedWidth = 40 * PIXELS_PER_YARD_LENGTH; // 40 yards wide view
        const fixedHeight = 30 * PIXELS_PER_YARD_LENGTH; // 30 yards tall view
        
        // Calculate scale based on fixed size
        const scaleX = FIELD_LENGTH / fixedWidth;
        const scaleY = FIELD_WIDTH / fixedHeight;
        let scale = Math.min(scaleX, scaleY) * 0.85;
        
        // Limit maximum zoom
        const maxScale = 2.5;
        scale = Math.min(scale, maxScale);
        currentScale = scale;
        
        zoomCenterX = targetCenterX;
        zoomCenterY = targetCenterY;
        
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
      const x = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
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
      const x = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
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
      ctx.fillStyle = '#0f5132'; // Background
      ctx.fillRect(labelX - 15, HOME_HASH_Y - 10, 30, 20);
      ctx.fillStyle = '#ffffff70';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HH', labelX, HOME_HASH_Y);
      
      // Visitor hash label
      ctx.fillStyle = '#0f5132'; // Background
      ctx.fillRect(labelX - 15, VISITOR_HASH_Y - 10, 30, 20);
      ctx.fillStyle = '#ffffff70';
      ctx.fillText('VH', labelX, VISITOR_HASH_Y);
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
      
      // Translate to center, rotate 180 degrees to point up, then draw
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI); // 180 degrees to flip upside down
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
      ctx.fillText('FRONT (HOME) SIDELINE', FIELD_LENGTH / 2, 10);
      ctx.fillText('BACK (VISITOR) SIDELINE', FIELD_LENGTH / 2, FIELD_WIDTH - 10);
      
      // Draw LEFT and RIGHT labels at the top
      ctx.fillText('RIGHT', FIELD_LENGTH * 0.15, 10);
      ctx.fillText('LEFT', FIELD_LENGTH * 0.85, 10);
      
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
        const { x, y } = parsePosition(set.leftRight, set.homeVisitor);
        
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
          
          ctx.rotate(angle);
          
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
    const currentSet = movementData[currentSetIndex];
    const nextSet = movementData[currentSetIndex + 1];
    
    if (currentSet) {
      const { x: currentX, y: currentY } = parsePosition(currentSet.leftRight, currentSet.homeVisitor);
      
      let drawX = currentX;
      let drawY = currentY;
      
      // If animating to next set, interpolate position
      if (animationProgress > 0 && nextSet) {
        const { x: nextX, y: nextY } = parsePosition(nextSet.leftRight, nextSet.homeVisitor);
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
    if (showOtherPerformers && currentSet) {
      const currentSetNumber = currentSet.set;
      
      Object.keys(performerData).forEach(otherPerformerId => {
        if (otherPerformerId === selectedPerformerId || otherPerformerId === 'Staff') return;
        
        const otherPerformer = performerData[otherPerformerId];
        if (otherPerformer.movements && otherPerformer.movements[movement]) {
          const otherPerformerCurrentSet = otherPerformer.movements[movement].find(s => s.set === currentSetNumber);
          const otherPerformerNextSet = nextSet ? otherPerformer.movements[movement].find(s => s.set === currentSetNumber + 1) : null;
          
          if (otherPerformerCurrentSet) {
            const { x: currentX, y: currentY } = parsePosition(otherPerformerCurrentSet.leftRight, otherPerformerCurrentSet.homeVisitor);
            
            let drawX = currentX;
            let drawY = currentY;
            
            // If animating and next set exists for this performer, interpolate their position too
            if (animationProgress > 0 && otherPerformerNextSet) {
              const { x: nextX, y: nextY } = parsePosition(otherPerformerNextSet.leftRight, otherPerformerNextSet.homeVisitor);
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
        }
      });
    }
    
    // Restore the context state before drawing UI elements
    ctx.restore();
    
    // Draw yard markers in screen space when zoomed (so they're always visible)
    if (zoomToFit && currentScale > 1) {
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
        const currentSet = movementData[currentSetIndex];
        
        if (currentSet) {
          // Check current performer
          const performerPos = parsePosition(currentSet.leftRight, currentSet.homeVisitor);
          leftmostX = Math.min(leftmostX, performerPos.x);
          rightmostX = Math.max(rightmostX, performerPos.x);
          
          // Check other performers if shown
          if (showOtherPerformers) {
            Object.keys(performerData).forEach(otherPerformerId => {
              if (otherPerformerId === performerId || otherPerformerId === 'Staff') return;
              const otherPerformer = performerData[otherPerformerId];
              if (otherPerformer.movements && otherPerformer.movements[movement]) {
                const otherSet = otherPerformer.movements[movement].find(s => s.set === currentSet.set);
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
        if (homeHashScreenY >= 0 && homeHashScreenY <= FIELD_WIDTH) {
          ctx.save();
          ctx.fillStyle = '#0f5132'; // Background
          ctx.fillRect(50, homeHashScreenY - 10, 30, 20);
          ctx.fillStyle = '#ffffff70';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HH', 65, homeHashScreenY);
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
          ctx.fillText('VH', 65, visitorHashScreenY);
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
    
    // Draw count overlay during animation (after zoom transformation)
    if (isPlaying && currentCount > 0 && movementData[currentSetIndex + 1]) {
      const nextSet = movementData[currentSetIndex + 1];
      const totalCounts = nextSet.counts || 8;
      
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
  }, [show, currentSetIndex, showPaths, showOtherPerformers, show4StepMarks, movement, currentPerformerData, performerId, selectedPerformerId, animationProgress, isPlaying, currentCount, zoomToFit]);
  
  // Animation loop with smooth transitions
  useEffect(() => {
    if (!isPlaying) return;
    
    const movementData = getMovementData();
    if (currentSetIndex >= movementData.length - 1) {
      setIsPlaying(false);
      setAnimationProgress(0);
      setCurrentCount(0);
      return;
    }
    
    const nextSet = movementData[currentSetIndex + 1];
    const totalCounts = nextSet?.counts || 8;
    const msPerCount = 500; // 500ms per count (2 counts per second)
    const totalDuration = totalCounts * msPerCount;
    
    // Parse hold and move counts from tip
    const tip = nextSet?.tip || '';
    let holdCounts = 0;
    let moveCounts = totalCounts;
    
    // Common patterns: "Hold 8", "Hold for 8 counts", "Hold 4, move 4", etc.
    const holdMatch = tip.match(/hold(?:\s+for)?\s+(\d+)(?:\s+counts?)?/i);
    const moveMatch = tip.match(/move(?:\s+for)?\s+(\d+)(?:\s+counts?)?/i);
    
    if (holdMatch) {
      holdCounts = parseInt(holdMatch[1]);
    }
    if (moveMatch) {
      moveCounts = parseInt(moveMatch[1]);
    } else if (holdCounts > 0) {
      // If only hold is specified, calculate move counts
      moveCounts = totalCounts - holdCounts;
    }
    
    
    // Determine if hold is at start or end based on order in tip
    const holdIndex = tip.toLowerCase().indexOf('hold');
    const moveIndex = tip.toLowerCase().indexOf('move');
    const holdFirst = holdIndex !== -1 && (moveIndex === -1 || holdIndex < moveIndex);
    
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const currentCountProgress = elapsed / msPerCount;
      
      // Calculate movement progress based on hold/move pattern
      let movementProgress = 0;
      if (holdFirst && holdCounts > 0) {
        // Hold at beginning, then move
        if (currentCountProgress <= holdCounts) {
          movementProgress = 0; // Stay at start during hold
        } else {
          // Move during remaining counts
          const moveProgress = (currentCountProgress - holdCounts) / moveCounts;
          movementProgress = Math.min(moveProgress, 1);
        }
      } else if (!holdFirst && holdCounts > 0) {
        // Move first, then hold
        if (currentCountProgress <= moveCounts) {
          movementProgress = currentCountProgress / moveCounts;
        } else {
          movementProgress = 1; // Stay at end during hold
        }
      } else {
        // No hold, just move
        movementProgress = Math.min(currentCountProgress / totalCounts, 1);
      }
      
      setAnimationProgress(movementProgress);
      
      // Update count based on elapsed time - starts at 1 and counts up
      const newCount = Math.min(Math.floor(elapsed / msPerCount) + 1, totalCounts);
      setCurrentCount(newCount);
      
      const timeProgress = Math.min(elapsed / totalDuration, 1);
      if (timeProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Move to next set
        setCurrentSetIndex(prev => prev + 1);
        setAnimationProgress(0);
        setCurrentCount(0);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentSetIndex, movement]);
  
  const handlePlayPause = () => {
    const movementData = getMovementData();
    if (currentSetIndex >= movementData.length - 1) {
      setCurrentSetIndex(0);
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentSetIndex(0);
    setAnimationProgress(0);
    setCurrentCount(0);
  };
  
  const handleNext = () => {
    const movementData = getMovementData();
    if (currentSetIndex < movementData.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
      setAnimationProgress(0);
      setCurrentCount(0);
    }
  };
  
  const handlePrevious = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(prev => prev - 1);
      setAnimationProgress(0);
      setCurrentCount(0);
    }
  };
  
  if (!show) return null;
  
  const movementData = getMovementData();
  const currentSet = movementData[currentSetIndex];

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
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    aspectRatio: `${FIELD_LENGTH}/${FIELD_WIDTH}`,
                    objectFit: 'contain'
                  }}
                />
              </div>
            
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
          
          {/* Current set info */}
          {currentSet && (
            <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm">
                  <span className="font-semibold">Set {currentSet.set}:</span>{' '}
                  {highlightNumbers(currentSet.leftRight)} | {highlightNumbers(currentSet.homeVisitor)}
                  {currentSet.counts && <span className="ml-2">({currentSet.counts} counts)</span>}
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
              {/* Show current tip normally, or next tip during animation */}
              <div className="flex items-center justify-between mt-2">
                {(isPlaying && movementData[currentSetIndex + 1]?.tip) ? (
                  <div className="text-yellow-300 text-sm flex items-start">
                    <span className="mr-1">💡</span>
                    <span className="ml-1">{movementData[currentSetIndex + 1].tip}</span>
                  </div>
                ) : (
                  currentSet.tip ? (
                    <div className="text-yellow-300 text-sm flex items-start">
                      <span className="mr-1">💡</span>
                      <span>{currentSet.tip}</span>
                    </div>
                  ) : (
                    <div></div>
                  )
                )}
                {/* Nickname badge */}
                <NicknameBadge movement={movement} setNumber={currentSet.set} />
              </div>
            </div>
          )}
          
          {/* Playback controls */}
          <div className="flex items-center justify-center space-x-4">
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
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
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
          </>
        ) : (
          /* Show message when no performer is selected in staff view */
          <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 mb-4 text-center">
            <div className="text-white/60 text-lg">
              Please select a performer from the dropdown above to view their movement path.
            </div>
          </div>
        )}
        
        {/* Options */}
        <div className="flex flex-col items-center space-y-2 mt-4 pb-4">
          <label className="flex items-center text-white/80 text-sm">
            <input
              type="checkbox"
              checked={showPaths}
              onChange={(e) => setShowPaths(e.target.checked)}
              className="mr-2"
            />
            Show movement paths
          </label>
          <label className="flex items-center text-white/80 text-sm">
            <input
              type="checkbox"
              checked={showOtherPerformers}
              onChange={(e) => setShowOtherPerformers(e.target.checked)}
              className="mr-2"
            />
            Show other performers
          </label>
          <label className="flex items-center text-white/80 text-sm">
            <input
              type="checkbox"
              checked={show4StepMarks}
              onChange={(e) => setShow4StepMarks(e.target.checked)}
              className="mr-2"
            />
            Show 4-step ticks
          </label>
          
          {/* Legend when showing other performers */}
          {showOtherPerformers && (
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 mt-3 text-xs">
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
      </div>
      
      {/* Drill Chart Modal */}
      <DrillChartModal
        show={showDrillChart}
        onClose={() => setShowDrillChart(false)}
        imagePath={`/drill/${movement}-${currentSet?.set || 1}.png`}
        movement={movement}
        setNumber={currentSet?.set || 1}
        totalSets={movementData.length}
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
    </div>
  );
};

export default PathVisualizerModal;