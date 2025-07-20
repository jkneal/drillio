import { useEffect, useRef } from 'react';

const FieldPositionDisplay = ({ currentPosition, targetPosition, showTarget = true }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Calculate zoom to fit bounding box
    let transform = { scale: 1, translateX: 0, translateY: 0 };
    
    if (currentPosition && targetPosition && showTarget) {
      // Create bounding box around both positions
      const minX = Math.min(currentPosition.x, targetPosition.x);
      const maxX = Math.max(currentPosition.x, targetPosition.x);
      const minY = Math.min(currentPosition.y, targetPosition.y);
      const maxY = Math.max(currentPosition.y, targetPosition.y);
      
      // Add padding (in yards)
      const padding = 5; // 5 yards padding on each side
      const boxMinX = Math.max(0, minX - padding);
      const boxMaxX = Math.min(53.33, maxX + padding);
      const boxMinY = Math.max(0, minY - padding);
      const boxMaxY = Math.min(120, maxY + padding);
      
      const boxWidth = boxMaxX - boxMinX;
      const boxHeight = boxMaxY - boxMinY;
      
      // Field dimensions for calculations
      const FIELD_LENGTH = width * 0.95;
      const FIELD_WIDTH = height * 0.85;
      const offsetX = (width - FIELD_LENGTH) / 2;
      const offsetY = (height - FIELD_WIDTH) / 2;
      
      // Convert box dimensions to pixels
      const boxWidthPixels = (boxWidth / 53.33) * FIELD_WIDTH;
      const boxHeightPixels = (boxHeight / 120) * FIELD_LENGTH;
      
      // Calculate scale to fit the box in the canvas (with some margin)
      const scaleX = (width * 0.8) / boxWidthPixels;
      const scaleY = (height * 0.8) / boxHeightPixels;
      const scale = Math.min(scaleX, scaleY, 3); // Cap at 3x zoom
      
      // Only zoom if it would be more than 1.1x
      if (scale > 1.1) {
        transform.scale = scale;
        
        // Calculate center of bounding box in field coordinates
        const boxCenterX = (boxMinX + boxMaxX) / 2;
        const boxCenterY = (boxMinY + boxMaxY) / 2;
        
        // Convert to canvas coordinates using the same system as fieldToCanvas
        const canvasCenterX = offsetX + (boxCenterY / 120) * FIELD_LENGTH;
        const canvasCenterY = offsetY + (boxCenterX / 53.33) * FIELD_WIDTH;
        
        // Calculate translation to center the box
        transform.translateX = width / 2 - canvasCenterX * scale;
        transform.translateY = height / 2 - canvasCenterY * scale;
      }
    }
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Save the context state
    ctx.save();
    
    // Apply transformation
    ctx.translate(transform.translateX, transform.translateY);
    ctx.scale(transform.scale, transform.scale);
    
    // Field dimensions
    const FIELD_LENGTH = width * 0.95;
    const FIELD_WIDTH = height * 0.85;
    const offsetX = (width - FIELD_LENGTH) / 2;
    const offsetY = (height - FIELD_WIDTH) / 2;
    
    const PIXELS_PER_YARD_LENGTH = FIELD_LENGTH / 120;
    const PIXELS_PER_YARD_WIDTH = FIELD_WIDTH / 53.33;
    
    // Field configuration
    const FIELD_CONFIG = 'high_school';
    const HASH_DISTANCES = {
      high_school: 53.33 / 3, // ~17.78 yards from each sideline
      college: 20,
      pro: 23.58
    };
    const HASH_FROM_SIDELINE = HASH_DISTANCES[FIELD_CONFIG];
    
    // Calculate hash positions
    const HOME_HASH_Y = offsetY + HASH_FROM_SIDELINE * PIXELS_PER_YARD_WIDTH;
    const VISITOR_HASH_Y = offsetY + FIELD_WIDTH - (HASH_FROM_SIDELINE * PIXELS_PER_YARD_WIDTH);
    
    // Transform and draw
    ctx.save();
    ctx.translate(offsetX, offsetY);
    
    // Draw field background
    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, FIELD_LENGTH, FIELD_WIDTH);
    
    // Draw end zones
    ctx.fillStyle = '#0a3622';
    const endZoneWidth = FIELD_LENGTH / 12; // 10 yards each
    ctx.fillRect(0, 0, endZoneWidth, FIELD_WIDTH);
    ctx.fillRect(FIELD_LENGTH - endZoneWidth, 0, endZoneWidth, FIELD_WIDTH);
    
    // Draw end zone labels only if not too zoomed
    if (transform.scale < 1.5) {
      ctx.save();
      ctx.fillStyle = '#ffffff40';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Left end zone
      ctx.save();
      ctx.translate(endZoneWidth / 2, FIELD_WIDTH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('EDGEWOOD', 0, 0);
      ctx.restore();
      
      // Right end zone
      ctx.save();
      ctx.translate(FIELD_LENGTH - endZoneWidth / 2, FIELD_WIDTH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('MUSTANGS', 0, 0);
      ctx.restore();
      ctx.restore();
    }
    
    // Draw yard lines
    ctx.strokeStyle = '#ffffff60';
    ctx.lineWidth = 1;
    
    // Right side (home side) yard lines: 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0
    for (let yard = 50; yard >= 0; yard -= 5) {
      const x = FIELD_LENGTH / 2 + (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
      // Make 50 yard line thicker
      if (yard === 50) {
        ctx.save();
        ctx.lineWidth = 3;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_WIDTH);
      ctx.stroke();
      
      if (yard === 50) {
        ctx.restore();
      }
      
      // Draw yard numbers (except 0) - only draw if zoom allows
      if (yard !== 0 && transform.scale < 2) {
        ctx.save();
        ctx.font = yard === 50 ? 'bold 8px sans-serif' : 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Measure text for background
        const metrics = ctx.measureText(yard.toString());
        const padding = 2;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 8;
        
        // Top number
        ctx.fillStyle = '#0f5132';
        ctx.fillRect(x - bgWidth/2, 10 - bgHeight/2, bgWidth, bgHeight);
        ctx.fillStyle = '#ffffff40';
        ctx.fillText(yard.toString(), x, 10);
        
        // Bottom number
        ctx.fillStyle = '#0f5132';
        ctx.fillRect(x - bgWidth/2, FIELD_WIDTH - 10 - bgHeight/2, bgWidth, bgHeight);
        ctx.fillStyle = '#ffffff40';
        ctx.fillText(yard.toString(), x, FIELD_WIDTH - 10);
        
        ctx.restore();
      }
    }
    
    // Left side (visitor side) yard lines
    for (let yard = 45; yard >= 0; yard -= 5) {
      const x = FIELD_LENGTH / 2 - (50 - yard) * PIXELS_PER_YARD_LENGTH;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_WIDTH);
      ctx.stroke();
      
      // Draw yard numbers (except 0) - only draw if zoom allows
      if (yard !== 0 && transform.scale < 2) {
        ctx.save();
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Measure text for background
        const metrics = ctx.measureText(yard.toString());
        const padding = 2;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 8;
        
        // Top number
        ctx.fillStyle = '#0f5132';
        ctx.fillRect(x - bgWidth/2, 10 - bgHeight/2, bgWidth, bgHeight);
        ctx.fillStyle = '#ffffff40';
        ctx.fillText(yard.toString(), x, 10);
        
        // Bottom number
        ctx.fillStyle = '#0f5132';
        ctx.fillRect(x - bgWidth/2, FIELD_WIDTH - 10 - bgHeight/2, bgWidth, bgHeight);
        ctx.fillStyle = '#ffffff40';
        ctx.fillText(yard.toString(), x, FIELD_WIDTH - 10);
        
        ctx.restore();
      }
    }
    
    // Draw hash marks
    ctx.strokeStyle = '#ffffff30';
    ctx.lineWidth = 0.5;
    const hashTickHeight = 2;
    
    // Draw hash marks every yard (not in end zones)
    const startX = endZoneWidth;
    const endX = FIELD_LENGTH - endZoneWidth;
    
    for (let x = startX; x <= endX; x += PIXELS_PER_YARD_LENGTH) {
      // Home hash ticks
      ctx.beginPath();
      ctx.moveTo(x, HOME_HASH_Y - offsetY - hashTickHeight/2);
      ctx.lineTo(x, HOME_HASH_Y - offsetY + hashTickHeight/2);
      ctx.stroke();
      
      // Visitor hash ticks
      ctx.beginPath();
      ctx.moveTo(x, VISITOR_HASH_Y - offsetY - hashTickHeight/2);
      ctx.lineTo(x, VISITOR_HASH_Y - offsetY + hashTickHeight/2);
      ctx.stroke();
    }
    
    // Convert field coordinates to canvas coordinates
    const fieldToCanvas = (fieldX, fieldY) => {
      // fieldX: 0-53.33 yards (across field)
      // fieldY: 0-120 yards (length of field)
      // Same coordinate system as PathVisualizerModal
      return {
        x: fieldY * PIXELS_PER_YARD_LENGTH,
        y: fieldX * PIXELS_PER_YARD_WIDTH
      };
    };
    
    // Draw target position
    if (showTarget && targetPosition) {
      const target = fieldToCanvas(targetPosition.x, targetPosition.y);
      
      // Yellow crosshair circle
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 1.5, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(target.x - 3, target.y);
      ctx.lineTo(target.x + 3, target.y);
      ctx.moveTo(target.x, target.y - 3);
      ctx.lineTo(target.x, target.y + 3);
      ctx.stroke();
      
      // Inner circle
      ctx.fillStyle = '#facc1530';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw current position
    if (currentPosition) {
      const current = fieldToCanvas(currentPosition.x, currentPosition.y);
      
      // Draw accuracy circle
      const accuracyRadius = currentPosition.accuracy * PIXELS_PER_YARD_WIDTH;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(current.x, current.y, accuracyRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw position dot with white border
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(current.x, current.y, 1, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(current.x, current.y, 0.75, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw path line between current and target
    if (currentPosition && targetPosition && showTarget) {
      const current = fieldToCanvas(currentPosition.x, currentPosition.y);
      const target = fieldToCanvas(targetPosition.x, targetPosition.y);
      
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw direction arrow at midpoint
      const midX = (current.x + target.x) / 2;
      const midY = (current.y + target.y) / 2;
      const angle = Math.atan2(target.y - current.y, target.x - current.x);
      
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-3, -1.5);
      ctx.moveTo(0, 0);
      ctx.lineTo(-3, 1.5);
      ctx.stroke();
      ctx.restore();
    }
    
    ctx.restore();
    
    // Restore the context state after field drawing
    ctx.restore();
    
    // Draw zoom indicator when zoomed in
    if (transform.scale > 1.2) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(width - 60, height - 30, 50, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${transform.scale.toFixed(1)}x`, width - 35, height - 20);
      ctx.restore();
    }
    
  }, [currentPosition, targetPosition, showTarget]);
  
  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={150}
      className="w-full border border-white/20 rounded-lg bg-black"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

export default FieldPositionDisplay;