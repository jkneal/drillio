import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { performerData } from '../data/performerData';

const PathVisualizerModal = ({ 
  show, 
  onClose, 
  performerData: currentPerformerData,
  movement,
  performerId
}) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [showPaths, setShowPaths] = useState(true);
  const [showOtherPerformers, setShowOtherPerformers] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 1 for transition
  const [currentCount, setCurrentCount] = useState(0);
  const animationRef = useRef(null);
  
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
      
      // Calculate x position (horizontal on field)
      // 50 yard line is at center
      // Since we're viewing from BACK sideline (front is at top):
      // Lower yard numbers (0-49) are on the LEFT side of screen
      // Higher yard numbers (51-100) are on the RIGHT side of screen
      x = FIELD_LENGTH / 2 - (50 - yardLineNum) * PIXELS_PER_YARD_LENGTH;
    } else {
      // Regular position with steps
      const leftRightMatch = leftRight.match(/^(Left|Right):\s*([\d.]+)\s*steps?\s*(Inside|Outside)?\s*(\d+)\s*yd ln$/i);
      if (leftRightMatch) {
        const [, direction, steps, inOut, yardLine] = leftRightMatch;
        const stepsNum = parseFloat(steps);
        const yardLineNum = parseInt(yardLine);
        
        // Start at the yard line
        // Same calculation: viewing from back, so lower yards on left, higher yards on right
        x = FIELD_LENGTH / 2 - (50 - yardLineNum) * PIXELS_PER_YARD_LENGTH;
        
        // Apply step offset
        const stepOffsetPixels = stepsNum * STEP_SIZE_YARDS * PIXELS_PER_YARD_LENGTH;
        
        // Inside always means toward the 50
        // Outside always means away from the 50 (toward the end zone)
        
        if (inOut === 'Inside') {
          // Move toward the 50 (viewing from back, so directions are reversed)
          if (yardLineNum < 50) {
            x += stepOffsetPixels; // 50 is to the right from lower yards
          } else if (yardLineNum > 50) {
            x -= stepOffsetPixels; // 50 is to the left from higher yards
          }
          // If on the 50, inside doesn't move horizontally
        } else if (inOut === 'Outside') {
          // Move away from the 50 (toward the end zone)
          if (yardLineNum < 50) {
            x -= stepOffsetPixels; // Away from 50 is to the left (toward 0)
          } else if (yardLineNum > 50) {
            x += stepOffsetPixels; // Away from 50 is to the right (toward 100)
          }
          // If on the 50, outside would mean toward either end zone
        } else {
          // No Inside/Outside specified, use Left/Right
          // Viewing from BACK sideline:
          // "Left" (performer's left) should appear on RIGHT side of our screen
          // "Right" (performer's right) should appear on LEFT side of our screen
          if (direction === 'Left') {
            x += stepOffsetPixels; // Left appears on right side of screen
          } else if (direction === 'Right') {
            x -= stepOffsetPixels; // Right appears on left side of screen
          }
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
  
  // Get all positions for the current movement
  const getMovementData = () => {
    if (!currentPerformerData?.movements?.[movement]) return [];
    return currentPerformerData.movements[movement];
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
    
    // Draw field background
    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, FIELD_LENGTH, FIELD_WIDTH);
    
    // Draw end zones
    ctx.fillStyle = '#0d4429';
    ctx.fillRect(0, 0, FIELD_LENGTH / 12, FIELD_WIDTH);
    ctx.fillRect(FIELD_LENGTH * 11/12, 0, FIELD_LENGTH / 12, FIELD_WIDTH);
    
    // Draw basic field representation
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 2;
    
    // Draw yard lines every 5 yards
    for (let yard = 0; yard <= 100; yard += 5) {
      const x = (FIELD_LENGTH / 2) - (50 - yard) * PIXELS_PER_YARD_LENGTH;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_WIDTH);
      ctx.stroke();
      
      // Draw yard numbers
      if (yard % 10 === 0 && yard !== 0 && yard !== 100) {
        ctx.fillStyle = '#ffffff80';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const yardNum = yard <= 50 ? yard : 100 - yard;
        ctx.fillText(yardNum.toString(), x, 30);
        ctx.fillText(yardNum.toString(), x, FIELD_WIDTH - 30);
      }
    }
    
    // Draw hash marks
    ctx.strokeStyle = '#ffffff30';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, HOME_HASH_Y);
    ctx.lineTo(FIELD_LENGTH, HOME_HASH_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, VISITOR_HASH_Y);
    ctx.lineTo(FIELD_LENGTH, VISITOR_HASH_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw side labels
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
    
    // Draw paths if enabled
    if (showPaths && movementData.length > 1) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      
      ctx.beginPath();
      
      for (let i = 0; i < movementData.length; i++) {
        const set = movementData[i];
        const { x, y } = parsePosition(set.leftRight, set.homeVisitor);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw set markers
        ctx.fillStyle = i <= currentSetIndex ? '#60a5fa' : '#374151';
        ctx.globalAlpha = i === currentSetIndex ? 1 : 0.3;
        ctx.beginPath();
        ctx.save();
        ctx.scale(1, ASPECT_RATIO);
        ctx.arc(x, y / ASPECT_RATIO, 2, 0, 2 * Math.PI);
        ctx.restore();
        ctx.fill();
        
        // Draw set numbers - positioned to avoid dots and made bigger
        if (i % 5 === 0 || i === currentSetIndex) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          // Position above the dot with more clearance
          ctx.fillText(set.set.toString(), x, y - 12);
        }
      }
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1; // Reset alpha after drawing paths
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
        if (otherPerformerId === performerId || otherPerformerId === 'Staff') return;
        
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
            
            // Draw other performer dot with color coding
            // Fade more during animation for better visibility of current performer
            ctx.globalAlpha = (isPlaying && animationProgress > 0) ? 0.4 : 0.8;
            ctx.fillStyle = getPerformerColor(otherPerformerId);
            ctx.beginPath();
            ctx.save();
            ctx.scale(1, ASPECT_RATIO);
            ctx.arc(drawX, drawY / ASPECT_RATIO, 2, 0, 2 * Math.PI);
            ctx.restore();
            ctx.fill();
            
            // Add a white border for better visibility
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = (isPlaying && animationProgress > 0) ? 0.3 : 0.5;
            ctx.beginPath();
            ctx.save();
            ctx.scale(1, ASPECT_RATIO);
            ctx.arc(drawX, drawY / ASPECT_RATIO, 2, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
          }
        }
      });
    }
    
    // Draw count overlay during animation
    if (isPlaying && currentCount > 0 && movementData[currentSetIndex + 1]) {
      const nextSet = movementData[currentSetIndex + 1];
      const totalCounts = nextSet.counts || 8;
      
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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
    }
    
    // Final reset of global alpha
    ctx.globalAlpha = 1;
  }, [show, currentSetIndex, showPaths, showOtherPerformers, movement, currentPerformerData, performerId, animationProgress, isPlaying, currentCount]);
  
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
            Path Visualization - {performerId}
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
        
        <div className="relative mb-4 bg-green-900/20 rounded-lg overflow-hidden">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={FIELD_LENGTH}
            height={FIELD_WIDTH}
            className="relative z-10 w-full h-auto"
            style={{ 
              maxWidth: '100%',
              maxHeight: '60vh',
              aspectRatio: `${FIELD_LENGTH}/${FIELD_WIDTH}`,
              objectFit: 'contain'
            }}
          />
        </div>
        
        {/* Current set info */}
        {currentSet && (
          <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="text-white text-sm">
              <span className="font-semibold">Set {currentSet.set}:</span>{' '}
              {currentSet.leftRight} | {currentSet.homeVisitor}
              {currentSet.counts && <span className="ml-2">({currentSet.counts} counts)</span>}
            </div>
            {/* Show current tip normally, or next tip during animation */}
            {(isPlaying && movementData[currentSetIndex + 1]?.tip) ? (
              <div className="mt-2 text-yellow-300 text-sm flex items-start">
                <span className="mr-1">💡</span>
                <span className="ml-1">{movementData[currentSetIndex + 1].tip}</span>
              </div>
            ) : (
              currentSet.tip && (
                <div className="mt-2 text-yellow-300 text-sm flex items-start">
                  <span className="mr-1">💡</span>
                  <span>{currentSet.tip}</span>
                </div>
              )
            )}
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
    </div>
  );
};

export default PathVisualizerModal;