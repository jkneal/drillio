// UWB Simulator for POC
// Simulates Ultra-Wideband positioning with realistic noise and behavior

class UWBSimulator {
  constructor() {
    // Anchor positions in field coordinates (yards from origin)
    // Origin is front left corner of field
    this.anchors = {
      A1: { x: 0, y: 0, z: 2 },        // Front left (elevated 2 yards)
      A2: { x: 53.33, y: 0, z: 2 },    // Front right
      A3: { x: 0, y: 120, z: 2 },      // Back left
      A4: { x: 53.33, y: 120, z: 2 },  // Back right
      A5: { x: 26.67, y: 0, z: 3 },    // Front center (press box)
      A6: { x: 26.67, y: 120, z: 3 },  // Back center
    };
    
    // Simulated performer position (in yards)
    this.truePosition = { x: 26.67, y: 60 }; // Start at 50 yard line, center
    
    // Simulation parameters
    this.measurementNoise = 0.1; // yards (about 0.16 steps)
    this.updateRate = 10; // Hz
    this.lastUpdate = Date.now();
    
    // Movement simulation
    this.velocity = { x: 0, y: 0 }; // yards/second
    this.targetPosition = null;
  }
  
  // Get range measurements to all anchors
  getRanges() {
    const ranges = {};
    
    Object.entries(this.anchors).forEach(([id, anchor]) => {
      // Calculate true distance
      const dx = this.truePosition.x - anchor.x;
      const dy = this.truePosition.y - anchor.y;
      const dz = 0 - anchor.z; // Performer at ground level
      const trueDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Add realistic noise
      const noise = (Math.random() - 0.5) * 2 * this.measurementNoise;
      const measuredDistance = trueDistance + noise;
      
      // Simulate occasional measurement failures (5% chance)
      if (Math.random() > 0.05) {
        ranges[id] = {
          distance: measuredDistance,
          timestamp: Date.now(),
          quality: this.getSignalQuality(trueDistance)
        };
      }
    });
    
    return ranges;
  }
  
  // Simulate signal quality based on distance
  getSignalQuality(distance) {
    // Quality decreases with distance
    const maxRange = 150; // yards
    const quality = Math.max(0, 1 - (distance / maxRange));
    return Math.min(1, quality + (Math.random() - 0.5) * 0.1);
  }
  
  // Trilateration algorithm to compute position from ranges
  trilaterate(ranges) {
    // Need at least 4 ranges for 3D positioning (we're doing 2D + known height)
    const validRanges = Object.entries(ranges).filter(([_, r]) => r.quality > 0.3);
    
    if (validRanges.length < 4) {
      return null; // Not enough data
    }
    
    // Simplified trilateration for POC
    // In real implementation, would use least squares optimization
    let sumX = 0, sumY = 0, sumWeights = 0;
    
    // Use weighted average based on signal quality for POC
    validRanges.forEach(([anchorId, range]) => {
      const anchor = this.anchors[anchorId];
      const weight = range.quality;
      
      // Simple approximation: place performer on circle around anchor
      // Real implementation would solve system of equations
      const angle = Math.atan2(
        this.truePosition.y - anchor.y,
        this.truePosition.x - anchor.x
      );
      
      const estimatedX = anchor.x + range.distance * Math.cos(angle);
      const estimatedY = anchor.y + range.distance * Math.sin(angle);
      
      sumX += estimatedX * weight;
      sumY += estimatedY * weight;
      sumWeights += weight;
    });
    
    return {
      x: sumX / sumWeights,
      y: sumY / sumWeights,
      accuracy: this.calculateAccuracy(validRanges.length),
      anchorCount: validRanges.length
    };
  }
  
  // Calculate expected accuracy based on geometry
  calculateAccuracy(anchorCount) {
    // More anchors = better accuracy
    const baseAccuracy = 0.3; // yards (0.48 steps)
    const improvementFactor = Math.min(anchorCount / 4, 2);
    return baseAccuracy / improvementFactor;
  }
  
  // Update simulated position based on movement
  updatePosition(deltaTime) {
    if (this.targetPosition) {
      // Move towards target
      const dx = this.targetPosition.x - this.truePosition.x;
      const dy = this.targetPosition.y - this.truePosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0.1) { // More than 0.16 steps away
        // Move at walking speed (2 yards/second)
        const speed = 2;
        this.velocity.x = (dx / distance) * speed;
        this.velocity.y = (dy / distance) * speed;
      } else {
        // Close enough, stop
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.targetPosition = null;
      }
    }
    
    // Update position based on velocity
    this.truePosition.x += this.velocity.x * deltaTime;
    this.truePosition.y += this.velocity.y * deltaTime;
    
    // Clamp to field bounds
    this.truePosition.x = Math.max(0, Math.min(53.33, this.truePosition.x));
    this.truePosition.y = Math.max(0, Math.min(120, this.truePosition.y));
  }
  
  // Set target position for simulated movement
  moveToPosition(x, y) {
    this.targetPosition = { x, y };
  }
  
  // Get current estimated position
  getCurrentPosition() {
    // Update simulation
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    
    this.updatePosition(deltaTime);
    
    // Get ranges and compute position
    const ranges = this.getRanges();
    const position = this.trilaterate(ranges);
    
    if (!position) {
      // Fallback to last known position with degraded accuracy
      return {
        x: this.truePosition.x,
        y: this.truePosition.y,
        accuracy: 1.0, // 1 yard accuracy in degraded mode
        anchorCount: 0,
        degraded: true
      };
    }
    
    return position;
  }
  
  // Convert field coordinates to drill notation
  fieldToDrillCoordinates(x, y) {
    // x: 0-53.33 yards (across field)
    // y: 0-120 yards (length of field including end zones)
    
    // Determine left/right position
    const centerX = 26.67;
    const yardsFromCenter = Math.abs(x - centerX);
    const stepsFromCenter = yardsFromCenter * 1.6; // 8 steps = 5 yards
    
    // Find nearest yard line
    const yardLinePosition = (y - 10); // Subtract front end zone
    const nearestYardLine = Math.round(yardLinePosition / 5) * 5;
    const yardsFromYardLine = Math.abs(yardLinePosition - nearestYardLine);
    const stepsFromYardLine = yardsFromYardLine * 1.6;
    
    // Determine side and format position
    const side = x < centerX ? "Left" : "Right";
    const insideOutside = (yardLinePosition % 10) < 5 ? "Inside" : "Outside";
    
    let leftRight;
    if (stepsFromYardLine < 0.5) {
      leftRight = `${side}: On ${nearestYardLine} yd ln`;
    } else {
      leftRight = `${side}: ${stepsFromYardLine.toFixed(1)} steps ${insideOutside} ${nearestYardLine} yd ln`;
    }
    
    // Determine front-back position
    const homeHash = 17.78; // High school hash marks
    const visitorHash = 35.56;
    
    let frontBack;
    if (Math.abs(x - homeHash) < 0.5) {
      frontBack = "On Home Hash";
    } else if (Math.abs(x - visitorHash) < 0.5) {
      frontBack = "On Visitor Hash";
    } else if (x < homeHash) {
      const steps = (homeHash - x) * 1.6;
      frontBack = `${steps.toFixed(1)} steps Behind Home Hash`;
    } else if (x > visitorHash) {
      const steps = (x - visitorHash) * 1.6;
      frontBack = `${steps.toFixed(1)} steps Behind Visitor Hash`;
    } else {
      const stepsFromHome = (x - homeHash) * 1.6;
      const stepsFromVisitor = (visitorHash - x) * 1.6;
      if (stepsFromHome < stepsFromVisitor) {
        frontBack = `${stepsFromHome.toFixed(1)} steps In Front Of Home Hash`;
      } else {
        frontBack = `${stepsFromVisitor.toFixed(1)} steps Behind Visitor Hash`;
      }
    }
    
    return { leftRight, frontBack };
  }
}

export default UWBSimulator;