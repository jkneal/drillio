import { useEffect, useRef } from 'react';

const MovementVector = ({ tip, size = 'normal' }) => {
  const canvasRef = useRef(null);
  
  // Parse movement information from tip
  const parseMovementData = (tipText) => {
    if (!tipText) return null;
    
    // Look for direction immediately before the step pattern (X-to-5)
    const directionPattern = /(left forward|right forward|left backward|right backward|forward|backward|left|right)\s*\((\d+)-to-5\)/i;
    
    const match = tipText.match(directionPattern);
    if (match) {
      const [, direction, stepSize] = match;
      const isCrab = tipText.toLowerCase().includes('crab');
      
      return {
        type: isCrab ? 'crab' : 'simple',
        direction: direction.toLowerCase(),
        stepSize: parseInt(stepSize)
      };
    }
    
    return null;
  };
  
  // Convert direction to canvas angle
  const getCanvasAngle = (movement) => {
    if (!movement) return 0;
    
    // Canvas angles: 0 = right, 90 = down, 180 = left, 270 = up
    const directionAngles = {
      'forward': 270,
      'backward': 90,
      'left': 180,
      'right': 0,
      'left forward': 225,
      'right forward': 315,
      'left backward': 135,
      'right backward': 45
    };
    
    return directionAngles[movement.direction] || 0;
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const movement = parseMovementData(tip);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!movement || movement.stepSize === 0) return;
    
    // Set canvas size based on size prop
    const canvasSize = size === 'small' ? 30 : 40;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    
    // Use fixed vector length (larger proportion of canvas)
    const vectorLength = canvasSize * 0.45;
    
    // Get angle in radians
    const angle = (getCanvasAngle(movement) * Math.PI) / 180;
    
    // Calculate end point
    const endX = centerX + Math.cos(angle) * vectorLength;
    const endY = centerY + Math.sin(angle) * vectorLength;
    
    // Draw vector line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = movement.type === 'crab' ? '#fbbf24' : '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Draw arrowhead
    const arrowLength = 8;
    const arrowAngle = Math.PI / 5;
    
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - arrowAngle),
      endY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + arrowAngle),
      endY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
    
  }, [tip, size]);
  
  // Only render if tip contains movement information
  const movement = parseMovementData(tip);
  if (!movement || movement.stepSize === 0) return null;
  
  return (
    <canvas 
      ref={canvasRef}
      className="ml-2 flex-shrink-0"
      style={{ width: size === 'small' ? '30px' : '40px', height: size === 'small' ? '30px' : '40px' }}
    />
  );
};

export default MovementVector;