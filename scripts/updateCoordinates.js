const fs = require('fs');
const path = require('path');

// Helper function to parse yard line position to numeric value
function parseYardLineToPosition(leftRight) {
  const match = leftRight.match(/^(Left|Right):\s*(?:(\d+(?:\.\d+)?)\s*steps?\s*(Inside|Outside))?\s*(?:On\s+)?(\d+)\s*yd\s*ln$/i);
  if (!match) return null;
  
  const [, side, steps = '0', inOut, yardLine] = match;
  const yardLineNum = parseInt(yardLine);
  const stepsNum = parseFloat(steps);
  
  // Use the same coordinate system as PathVisualizerModal
  // Field center = 60, range 0-120 
  // "Left" coordinates = higher x values (right side of screen in visualizer)
  // "Right" coordinates = lower x values (left side of screen in visualizer)
  let position;
  
  if (side === 'Left') {
    // Left = right side of screen in visualizer
    position = 60 + (50 - yardLineNum) * 1.6;
  } else {
    // Right = left side of screen in visualizer  
    position = 60 - (50 - yardLineNum) * 1.6;
  }
  
  // Apply step offset - convert steps to coordinate units (0.625 yards per step * 1.6 steps per yard = 1.0)
  const stepOffsetCoords = stepsNum * 0.625 * 1.6; // 1 step = 0.625 yards, 1 yard = 1.6 coord units
  
  if (inOut === 'Inside') {
    // Inside means toward the 50
    if (side === 'Left') {
      // Left side: Inside goes toward center (smaller x)
      position -= stepOffsetCoords;
    } else {
      // Right side: Inside goes toward center (larger x)
      position += stepOffsetCoords;
    }
  } else if (inOut === 'Outside') {
    // Outside means away from the 50
    if (side === 'Left') {
      // Left side: Outside goes away from center (larger x)
      position += stepOffsetCoords;
    } else {
      // Right side: Outside goes away from center (smaller x)
      position -= stepOffsetCoords;
    }
  }
  
  return position;
}

// Helper function to parse front-back position to numeric value
function parseFrontBackToPosition(homeVisitor) {
  // Remove (HS) suffix
  const cleaned = homeVisitor.replace(/\s*\(HS\)$/, '');
  
  const match = cleaned.match(/^(?:(\d+(?:\.\d+)?)\s*steps?\s*)?(In Front Of|Behind|On)\s+(.+)$/i);
  if (!match) return null;
  
  const [, steps = '0', direction, reference] = match;
  const stepsNum = parseFloat(steps);
  
  // Define reference positions (in steps from front sideline)
  // Using same coordinate system as PathVisualizerModal: smaller y = front, larger y = back
  const references = {
    'Front side line': 0,
    'Front Sideline': 0,
    'Home Hash': 28.48, // ~17.8 yards for high school
    'Visitor Hash': 56.96, // ~35.6 yards for high school
    'Back side line': 85.44, // 53.4 yards
    'Back Sideline': 85.44,
    'Visitor side line': 85.44,
    'Visitor Sideline': 85.44
  };
  
  // Find matching reference
  let basePosition = null;
  for (const [key, value] of Object.entries(references)) {
    if (reference.toLowerCase().includes(key.toLowerCase())) {
      basePosition = value;
      break;
    }
  }
  
  if (basePosition === null) return null;
  
  // Apply offset
  // "Behind" means toward back field (larger y)
  // "In front of" means toward front field (smaller y)
  if (direction.toLowerCase() === 'behind') {
    return basePosition + stepsNum;
  } else if (direction.toLowerCase().includes('front')) {
    return basePosition - stepsNum;
  } else {
    return basePosition;
  }
}

// Calculate distance between two positions
function calculateDistance(pos1, pos2) {
  const dx = (pos2.x || 0) - (pos1.x || 0);
  const dy = (pos2.y || 0) - (pos1.y || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate direction of movement in degrees (0 = forward, 90 = right, 180 = backward, 270 = left)
function calculateDirection(pos1, pos2) {
  const dx = (pos2.x || 0) - (pos1.x || 0);
  const dy = (pos2.y || 0) - (pos1.y || 0);
  
  // In the coordinate system:
  // - Decreasing y = toward front (0°)
  // - Decreasing x = toward "Left" coordinates = right on field (270°)
  // - Increasing y = toward back (180°)
  // - Increasing x = toward "Right" coordinates = left on field (90°)
  
  // We need to map our coordinate movements to field angles:
  // Movement vector (0, -1) [front] should give 0°
  // Movement vector (1, 0) [toward "Right"/left] should give 90°
  // Movement vector (0, 1) [back] should give 180°
  // Movement vector (-1, 0) [toward "Left"/right] should give 270°
  
  // Using atan2(dx, -dy) gives us:
  // (0, -1) → atan2(0, 1) = 0° ✓
  // (1, 0) → atan2(1, 0) = 90° ✓
  // (0, 1) → atan2(0, -1) = 180° ✓
  // (-1, 0) → atan2(-1, 0) = -90° → 270° ✓
  
  let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
  
  // Normalize to 0-360
  if (angle < 0) angle += 360;
  
  return angle;
}

// Convert absolute field angle to relative angle based on performer orientation
function adjustAngleForOrientation(absoluteAngle, orientationRaw = 'Front') {
  // Normalize orientation string (remove (HS) suffix and trim)
  const orientation = orientationRaw.replace(/\s*\(HS\)$/i, '').trim();
  
  // Map orientations to their facing angles in field coordinates
  // 0° = front sideline, 90° = right sideline, 180° = back sideline, 270° = left sideline
  const facingDeg = ({
    'Front': 0,
    'Right End Zone': 90,   // facing right sideline (east)
    'Back': 180,
    'Left End Zone': 270    // facing left sideline (west)
  })[orientation] ?? 0;     // default to Front if not recognized
  
  // Convert to performer-relative angle by subtracting their facing direction
  return (absoluteAngle - facingDeg + 360) % 360;
}

// Get simplified direction description
function getDirectionDescription(angle) {
  // Normalize angle to 0-360
  angle = angle % 360;
  if (angle < 0) angle += 360;
  
  // Use pure directions for angles within 10 degrees of cardinal directions
  if (angle >= 350 || angle <= 10) {
    return 'Forward';
  } else if (angle >= 80 && angle <= 100) {
    return 'Right';
  } else if (angle >= 170 && angle <= 190) {
    return 'Backward';
  } else if (angle >= 260 && angle <= 280) {
    return 'Left';
  }
  
  // For diagonal directions, use tighter ranges
  // Each diagonal gets a 30-degree range centered on the 45-degree marks
  
  if (angle > 10 && angle < 80) {
    // 10-80 degrees: Right Forward quadrant
    if (angle <= 30) {
      return 'Right Forward';  // Mostly forward with right
    } else if (angle >= 60) {
      return 'Right Forward';  // Mostly right with forward
    } else {
      return 'Right Forward';  // True diagonal
    }
  } else if (angle > 100 && angle < 170) {
    // 100-170 degrees: Right Backward quadrant
    if (angle <= 120) {
      return 'Right Backward';  // Mostly right with backward
    } else if (angle >= 150) {
      return 'Right Backward';  // Mostly backward with right
    } else {
      return 'Right Backward';  // True diagonal
    }
  } else if (angle > 190 && angle < 260) {
    // 190-260 degrees: Left Backward quadrant
    if (angle <= 210) {
      return 'Left Backward';  // Mostly backward with left
    } else if (angle >= 240) {
      return 'Left Backward';  // Mostly left with backward
    } else {
      return 'Left Backward';  // True diagonal
    }
  } else if (angle > 280 && angle < 350) {
    // 280-350 degrees: Left Forward quadrant
    if (angle <= 300) {
      return 'Left Forward';  // Mostly left with forward
    } else if (angle >= 330) {
      return 'Left Forward';  // Mostly forward with left
    } else {
      return 'Left Forward';  // True diagonal
    }
  }
  
  // Fallback (should not reach here)
  return 'Forward';
}

// Parse performer data section
function parsePerformerSection(lines) {
  const performers = {};
  let currentPerformer = null;
  let currentMovement = null;
  
  for (const line of lines) {
    // Check for performer header
    const performerMatch = line.match(/Performer:\s*Symbol:\s*(\w+)\s*Label:\s*(\d+)\s*(\d+)-(.+)/);
    if (performerMatch) {
      const [, symbol, number, movementNum, movementName] = performerMatch;
      currentPerformer = symbol;
      currentMovement = movementNum;
      
      if (!performers[currentPerformer]) {
        performers[currentPerformer] = {
          symbol: currentPerformer,
          number,
          movements: {}
        };
      }
      
      if (!performers[currentPerformer].movements[currentMovement]) {
        performers[currentPerformer].movements[currentMovement] = [];
      }
      continue;
    }
    
    // Skip header lines
    if (line.includes('Set Title Measure Left-Right Home-Visitor') || 
        line.includes('Set Measure Counts Left-Right Home-Visitor')) continue;
    
    // Parse set data - now includes optional Title column
    // First try new format with Title column - updated to handle decimal measures like "28.5" and "Opening S"
    let setMatch = line.match(/^(\d+)\s+[\w-]+\s+([\d\s\-.]+|Opening\s+S)\s+(Left|Right):\s*(.+?)\s+((?:\d+\.?\d*\s*steps?\s*.+|On\s+.+))$/);
    
    if (!setMatch) {
      // Try old format without Title column (for backward compatibility)
      // Try to match set data - the home-visitor part can start with either a number or "On"
      setMatch = line.match(/^(\d+)\s+(sub\s+\d+)\s*(\d+)\s+(Left|Right):\s*(.+?)\s+((?:\d+\.?\d*\s*steps?\s*.+|On\s+.+))$/);
      if (!setMatch) {
        // Try pattern for normal measures like "2 - 13"
        setMatch = line.match(/^(\d+)\s+([\d\s-]+)\s+(\d+)\s+(Left|Right):\s*(.+?)\s+((?:\d+\.?\d*\s*steps?\s*.+|On\s+.+))$/);
      }
      if (!setMatch) {
        // Try pattern for set 1 with no counts
        setMatch = line.match(/^(\d+)\s+(\d+)\s+(Left|Right):\s*(.+?)\s+((?:\d+\.?\d*\s*steps?\s*.+|On\s+.+))$/);
        if (setMatch) {
          // Rearrange to match expected format
          const [, setNum, measures, side, leftRight, homeVisitor] = setMatch;
          setMatch = [setMatch[0], setNum, measures, '', side, leftRight, homeVisitor];
        }
      }
    } else {
      // New format detected - extract without counts (Title format doesn't have counts column)
      const [, setNum, measures, side, leftRight, homeVisitor] = setMatch;
      setMatch = [setMatch[0], setNum, measures, '', side, leftRight, homeVisitor];
    }
    
    if (setMatch && currentPerformer && currentMovement) {
      const [, setNum, measures, counts, side, leftRight, homeVisitor] = setMatch;
      
      performers[currentPerformer].movements[currentMovement].push({
        set: parseInt(setNum),
        measures: measures.trim(),
        counts: counts || '',
        leftRight: `${side}: ${leftRight}`,
        homeVisitor: homeVisitor.replace(/\s*\(HS\)$/, '')
      });
    }
  }
  
  return performers;
}

// Parse form tables
function parseFormTables(lines) {
  const forms = {
    Snare: {},
    Tenor: {},
    'Bass Drum': {}
  };
  
  let currentTable = null;
  let currentMovement = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for form table headers
    if (line.includes('Form Snare')) {
      currentTable = 'Snare';
      continue;
    } else if (line.includes('Form Tenor')) {
      currentTable = 'Tenor';
      continue;
    } else if (line.includes('Form Bass Drum')) {
      currentTable = 'Bass Drum';
      continue;
    }
    
    // Stop parsing forms if we hit the Counts section
    if (line.includes('Counts Snare') || line.includes('Counts Tenor') || line.includes('Counts Bass Drum')) {
      break;
    }
    
    // Check for movement header
    const movementMatch = line.match(/(\d+)-/);
    if (movementMatch) {
      currentMovement = movementMatch[1];
      continue;
    }
    
    // Parse form data
    if (currentTable && currentMovement) {
      const formMatch = line.match(/^(\d+)\s+(.+)$/);
      if (formMatch) {
        const [, setNum, form] = formMatch;
        if (!forms[currentTable][currentMovement]) {
          forms[currentTable][currentMovement] = {};
        }
        forms[currentTable][currentMovement][setNum] = form.trim();
      }
    }
  }
  
  return forms;
}

// Parse count tables
function parseCountTables(lines) {
  const counts = {
    Snare: {},
    Tenor: {},
    'Bass Drum': {}
  };
  
  let currentTable = null;
  let currentMovement = null;
  
  for (const line of lines) {
    // Stop parsing if we hit orientation tables
    if (line.includes('Orientation Snare') || line.includes('Orientation Tenor') || line.includes('Orientation Bass Drum')) {
      break;
    }
    
    // Check for count table headers
    if (line.includes('Counts Snare')) {
      currentTable = 'Snare';
      continue;
    } else if (line.includes('Counts Tenor')) {
      currentTable = 'Tenor';
      continue;
    } else if (line.includes('Counts Bass Drum')) {
      currentTable = 'Bass Drum';
      continue;
    }
    
    // Check for movement header
    const movementMatch = line.match(/(\d+)-/);
    if (movementMatch) {
      currentMovement = movementMatch[1];
      continue;
    }
    
    // Parse count data
    if (currentTable && currentMovement) {
      const countMatch = line.match(/^(\d+)\s+(.+)$/);
      if (countMatch) {
        const [, setNum, countInfo] = countMatch;
        if (!counts[currentTable][currentMovement]) {
          counts[currentTable][currentMovement] = {};
        }
        counts[currentTable][currentMovement][setNum] = countInfo.trim();
      }
    }
  }
  
  return counts;
}

// Parse orientation tables
function parseOrientationTables(lines) {
  const orientations = {
    Snare: {},
    Tenor: {},
    'Bass Drum': {}
  };
  
  let currentTable = null;
  let currentMovement = null;
  
  for (const line of lines) {
    // Check for orientation table headers
    if (line.includes('Orientation Snare')) {
      currentTable = 'Snare';
      continue;
    } else if (line.includes('Orientation Tenor')) {
      currentTable = 'Tenor';
      continue;
    } else if (line.includes('Orientation Bass Drum')) {
      currentTable = 'Bass Drum';
      continue;
    }
    
    // Check for movement header
    const movementMatch = line.match(/(\d+)-/);
    if (movementMatch) {
      currentMovement = movementMatch[1];
      continue;
    }
    
    // Parse orientation data
    if (currentTable && currentMovement) {
      const orientationMatch = line.match(/^(\d+)\s+(.+)$/);
      if (orientationMatch) {
        const [, setNum, orientation] = orientationMatch;
        if (!orientations[currentTable][currentMovement]) {
          orientations[currentTable][currentMovement] = {};
        }
        orientations[currentTable][currentMovement][setNum] = orientation.trim();
      }
    }
  }
  
  return orientations;
}

// Generate tip and movement vector based on movement details
function generateTipAndVector(set, prevSet, countInfo, forms, counts, orientation) {
  // First set is always starting position
  if (set.set === 1) {
    return { tip: 'Starting position', movementVector: null };
  }
  
  // Parse positions - FROM previous TO current
  const prevPos = {
    x: parseYardLineToPosition(prevSet.leftRight),
    y: parseFrontBackToPosition(prevSet.homeVisitor)
  };
  
  const currentPos = {
    x: parseYardLineToPosition(set.leftRight),
    y: parseFrontBackToPosition(set.homeVisitor)
  };
  
  // Get count information
  const moveCounts = parseInt(countInfo.match(/Move\s+(\d+)/)?.[1] || set.counts || '0');
  const holdStartCounts = countInfo.match(/^Hold\s+(\d+)/)?.[1];
  const holdEndCounts = countInfo.match(/Move\s+\d+,\s*Hold\s+(\d+)/)?.[1];
  
  // Calculate movement details FROM previous TO current
  const distance = calculateDistance(prevPos, currentPos);
  const absoluteAngle = calculateDirection(prevPos, currentPos);
  
  // Adjust angle based on performer orientation
  const relativeAngle = adjustAngleForOrientation(absoluteAngle, orientation);
  
  // Calculate step size
  let stepSize = 8; // default
  if (moveCounts > 0 && distance > 0.1) {
    const stepsPerYard = 1.6; // 8 steps per 5 yards
    const yardsPerStep = 5 / 8;
    const totalYards = distance / stepsPerYard;
    const yardsPerCount = totalYards / moveCounts;
    stepSize = Math.round(5 / yardsPerCount);
  }
  
  // Get simplified direction description using relative angle
  const direction = getDirectionDescription(relativeAngle);
  
  // Build tip
  let tip = '';
  let movementVector = null;
  
  if (holdStartCounts) {
    tip += `Hold for ${holdStartCounts} counts`;
    if (moveCounts > 0 && distance > 0.1) {
      tip += `, then Move ${direction} (${stepSize}-to-5) for ${moveCounts} counts`;
      movementVector = Math.round(relativeAngle); // Use relative angle for performer's perspective
    }
  } else if (moveCounts > 0 && distance > 0.1) {
    tip += `Move ${direction} (${stepSize}-to-5) for ${moveCounts} counts`;
    movementVector = Math.round(relativeAngle); // Use relative angle for performer's perspective
    if (holdEndCounts) {
      tip += `, then hold for ${holdEndCounts} counts`;
    }
  } else if (holdEndCounts) {
    tip += `Hold for ${holdEndCounts} counts`;
  } else {
    tip = 'Hold';
  }
  
  return { tip, movementVector };
}


// Load existing performer data
function loadExistingPerformerData(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Extract the JS object from the export statement
    const match = content.match(/export const performerData = ({[\s\S]*});/);
    if (match) {
      return eval('(' + match[1] + ')');
    }
  } catch (error) {
    console.log('No existing performerData.js found, creating new one');
  }
  return {};
}

// Main parsing function that updates existing data
function updatePerformerData(coordinatesPath, existingData) {
  const content = fs.readFileSync(coordinatesPath, 'utf-8');
  const lines = content.split('\n');
  
  // Parse different sections
  const performers = parsePerformerSection(lines);
  const forms = parseFormTables(lines);
  const counts = parseCountTables(lines);
  const orientations = parseOrientationTables(lines);
  
  // Debug: Log bass drum orientations immediately after parsing
  console.log('\n=== Bass Drum Orientation Debug ===');
  console.log('Bass Drum orientations parsed:', JSON.stringify(orientations['Bass Drum'], null, 2));
  
  // Clone existing data
  const performerData = JSON.parse(JSON.stringify(existingData));
  
  console.log('\nProcessing performers from coordinates.txt:', Object.keys(performers).join(', '));
  
  for (const [symbol, data] of Object.entries(performers)) {
    // Determine performer type
    let performerType = 'Snare';
    if (symbol.startsWith('TD')) performerType = 'Tenor';
    else if (symbol.startsWith('BD')) performerType = 'Bass Drum';
    
    // Get name
    let name = symbol;
    if (symbol.startsWith('SD')) name = `Snare Drum ${symbol.slice(2)}`;
    else if (symbol.startsWith('TD')) name = `Tenor Drum ${symbol.slice(2)}`;
    else if (symbol.startsWith('BD')) name = `Bass Drum ${symbol.slice(2)}`;
    
    // Initialize performer if doesn't exist
    if (!performerData[symbol]) {
      performerData[symbol] = {
        name,
        number: data.number,
        movements: {}
      };
    }
    
    // Update performer info
    performerData[symbol].name = name;
    performerData[symbol].number = data.number;
    
    // Process each movement
    for (const [movement, sets] of Object.entries(data.movements)) {
      // Initialize movement if doesn't exist
      if (!performerData[symbol].movements[movement]) {
        performerData[symbol].movements[movement] = [];
      }
      
      // Get existing sets for this movement
      const existingSets = performerData[symbol].movements[movement];
      
      // Process new/updated sets
      sets.forEach((set, index) => {
        // Get count information from count tables
        const countInfo = counts[performerType]?.[movement]?.[set.set] || '';
        
        
        // Calculate total counts from the count info
        let totalCounts = '';
        if (countInfo) {
          let total = 0;
          // Extract hold counts
          const holdMatches = countInfo.matchAll(/Hold\s+(\d+)/g);
          for (const match of holdMatches) {
            total += parseInt(match[1]);
          }
          // Extract move counts
          const moveMatch = countInfo.match(/Move\s+(\d+)/);
          if (moveMatch) {
            total += parseInt(moveMatch[1]);
          }
          // Only set counts if we found any
          if (total > 0) {
            totalCounts = total.toString();
          }
        }
        
        const result = {
          set: set.set,
          measures: set.measures,
          counts: totalCounts,
          leftRight: set.leftRight,
          homeVisitor: set.homeVisitor
        };
        
        // Add form
        if (forms[performerType]?.[movement]?.[set.set]) {
          result.form = forms[performerType][movement][set.set];
        }
        
        // Generate tip and movement vector
        if (index > 0) {
          const prevSet = sets[index - 1];
          // Get orientation for the PREVIOUS set (where we're moving FROM)
          const orientation = orientations[performerType]?.[movement]?.[prevSet.set] || 'Front';
          const { tip, movementVector } = generateTipAndVector(set, prevSet, countInfo, forms, counts, orientation);
          result.tip = tip;
          if (movementVector !== null) {
            result.movementVector = movementVector;
          }
        } else {
          result.tip = 'Starting position';
        }
        
        // nextSet attribute removed - app will read tip from next set directly
        
        // Find existing set index
        const existingSetIndex = existingSets.findIndex(s => s.set === set.set);
        
        if (existingSetIndex >= 0) {
          // Update existing set
          existingSets[existingSetIndex] = result;
        } else {
          // Add new set in correct position
          let insertIndex = existingSets.findIndex(s => s.set > set.set);
          if (insertIndex === -1) {
            existingSets.push(result);
          } else {
            existingSets.splice(insertIndex, 0, result);
          }
        }
      });
      
      // Sort sets by set number
      performerData[symbol].movements[movement].sort((a, b) => a.set - b.set);
    }
  }
  
  // Update Staff performer with all movements and sets
  if (!performerData.Staff) {
    performerData.Staff = {
      name: 'Staff View',
      number: 'ALL',
      movements: {}
    };
  }
  
  // Collect all movements and their sets from all performers
  const allMovementSets = {};
  
  for (const [symbol, data] of Object.entries(performers)) {
    for (const [movement, sets] of Object.entries(data.movements)) {
      if (!allMovementSets[movement]) {
        allMovementSets[movement] = new Set();
      }
      sets.forEach(set => {
        allMovementSets[movement].add(set.set);
      });
    }
  }
  
  // Update Staff movements with all discovered sets
  for (const [movement, setNumbers] of Object.entries(allMovementSets)) {
    if (!performerData.Staff.movements[movement]) {
      performerData.Staff.movements[movement] = [];
    }
    
    // Convert set numbers to sorted array and create set objects
    const sortedSets = Array.from(setNumbers).sort((a, b) => a - b);
    performerData.Staff.movements[movement] = sortedSets.map(setNum => ({ set: setNum }));
  }
  
  // Ensure Staff has all movements that exist in performerData (even empty ones)
  for (const performer of Object.values(performerData)) {
    if (performer !== performerData.Staff) {
      for (const movement of Object.keys(performer.movements)) {
        if (!performerData.Staff.movements[movement]) {
          performerData.Staff.movements[movement] = [];
        }
      }
    }
  }
  
  return performerData;
}

// Export functions for testing
module.exports = {
  parseYardLineToPosition,
  parseFrontBackToPosition,
  calculateDistance,
  calculateDirection,
  getDirectionDescription,
  generateTipAndVector,
  updatePerformerData,
  loadExistingPerformerData
};

// Run if called directly
if (require.main === module) {
  const coordinatesPath = path.join(__dirname, '..', 'coordinates.txt');
  const outputPath = path.join(__dirname, '..', 'app', 'src', 'data', 'performerData.js');
  
  try {
    // Load existing data
    const existingData = loadExistingPerformerData(outputPath);
    
    // Update with new data
    const performerData = updatePerformerData(coordinatesPath, existingData);
    
    // Generate JS file content
    let jsContent = 'export const performerData = ';
    jsContent += JSON.stringify(performerData, null, 2);
    jsContent += ';\n';
    
    // Write to file
    fs.writeFileSync(outputPath, jsContent);
    console.log('Successfully updated performerData.js with new coordinates');
    
    // Log what was updated
    const newPerformers = Object.keys(performerData).filter(p => !existingData[p]);
    if (newPerformers.length > 0) {
      console.log('New performers added:', newPerformers.join(', '));
    }
    
  } catch (error) {
    console.error('Error updating coordinates:', error);
    process.exit(1);
  }
}