import { useEffect, useRef } from 'react';

const MovementVector = ({ tip, movementVector, size = 'normal' }) => {
  const canvasRef = useRef(null);
  
  // Parse movement information from tip to check if we should show vector
  const hasMovement = (tipText) => {
    if (!tipText) return false;
    // Check if tip contains "Move" with a direction
    return /Move\s+(Forward|Right Forward|Right|Right Backward|Backward|Left Backward|Left|Left Forward)/i.test(tipText);
  };
  
  // Convert our angle system (0=forward, 90=right, 180=backward, 270=left) to canvas angle
  const getCanvasAngle = (angle) => {
    if (angle === null || angle === undefined) return 0;
    
    // Our system: 0 = forward (north), 90 = right (east), 180 = backward (south), 270 = left (west)
    // Canvas: 0 = right, 90 = down, 180 = left, 270 = up
    // So we need to rotate by -90 degrees: canvas_angle = our_angle - 90
    let canvasAngle = angle - 90;
    if (canvasAngle < 0) canvasAngle += 360;
    return canvasAngle * Math.PI / 180;
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (movementVector === null || movementVector === undefined || !hasMovement(tip)) return;
    
    // Set canvas size based on size prop
    const canvasSize = size === 'small' ? 30 : 40;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    
    // Use fixed vector length (larger proportion of canvas)
    const vectorLength = canvasSize * 0.45;
    
    // Get angle in radians
    const angle = getCanvasAngle(movementVector);
    
    // Calculate end point
    const endX = centerX + Math.cos(angle) * vectorLength;
    const endY = centerY + Math.sin(angle) * vectorLength;
    
    // Draw vector line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#60a5fa'; // Blue color for all movements
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
    
  }, [tip, movementVector, size]);
  
  // Only render if we have a movement vector and tip contains movement
  if (movementVector === null || movementVector === undefined || !hasMovement(tip)) return null;
  
  return (
    <canvas 
      ref={canvasRef}
      className="ml-2 flex-shrink-0"
      style={{ width: size === 'small' ? '30px' : '40px', height: size === 'small' ? '30px' : '40px' }}
    />
  );
};

export default MovementVector;