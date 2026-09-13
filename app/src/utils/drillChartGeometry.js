// Calibrated against all 66 current 2200 × 1700 Pyware chart exports.
// These charts use director viewpoint: performer Left is screen-left,
// and Behind is up. Use the printed hash positions, not an assumed field ratio.
export const CHART = {
  width: 2200, height: 1700,
  left: 89.5, right: 2113.5,
  front: 1269, back: 208,
  homeHash: 916, visitorHash: 562.5,
};
export const PIXELS_PER_STEP = (CHART.right - CHART.left) / 160;
export const PERFORMER_HIT_RADIUS = 22;
export const MAX_ZOOM = 16;

export function parseChartCoordinate(leftRight = '', homeVisitor = '') {
  const center = (CHART.left + CHART.right) / 2;
  let yardX = center;
  let x = center;
  let yardSteps = 0;
  let yardLabel = '50 yd line';
  if (!/^On 50 yd ln$/i.test(leftRight)) {
    const match = leftRight.match(/^(Left|Right):\s*(?:(\d+(?:\.\d+)?)\s*steps?\s*(Inside|Outside)\s*|On\s+)(\d+)\s*yd ln$/i);
    if (!match) return null;
    const [, side, steps, direction, yard] = match;
    const sideSign = side.toLowerCase() === 'left' ? -1 : 1;
    yardSteps = Number(steps || 0);
    yardX = center + sideSign * (50 - Number(yard)) * 1.6 * PIXELS_PER_STEP;
    x = yardX + sideSign * (direction?.toLowerCase() === 'inside' ? -1 : 1) * yardSteps * PIXELS_PER_STEP;
    yardLabel = `${side} ${yard} yd line`;
  }
  const depth = homeVisitor.match(/^(?:(\d+(?:\.\d+)?)\s*steps?\s*)?(In Front Of|Behind|On)\s+(.+?)(?:\s*\(HS\))?$/i);
  if (!depth) return null;
  const [, steps, direction, reference] = depth;
  const refs = {
    'home hash': CHART.homeHash, 'visitor hash': CHART.visitorHash,
    'home side line': CHART.front, 'home sideline': CHART.front,
    'front side line': CHART.front, 'front sideline': CHART.front,
    'visitor side line': CHART.back, 'visitor sideline': CHART.back,
    'back side line': CHART.back, 'back sideline': CHART.back,
  };
  const referenceY = refs[reference.toLowerCase()];
  if (referenceY === undefined) return null;
  const depthSteps = Number(steps || 0);
  const y = referenceY + (direction.toLowerCase() === 'behind' ? -1 : 1) * depthSteps * PIXELS_PER_STEP;
  return { x, y, yardX, referenceY, yardSteps, depthSteps, yardLabel, depthLabel: reference };
}

export function getChartPerformers(data, movement, setNumber) {
  return Object.entries(data).flatMap(([id, performer]) => {
    if (id === 'Staff') return [];
    const set = performer.movements[movement]?.find(item => item.set === setNumber);
    if (!set) return [];
    const coordinate = parseChartCoordinate(set.leftRight, set.homeVisitor);
    return coordinate ? [{ id, name: performer.name, number: performer.number, ...set, ...coordinate }] : [];
  });
}

export function nearestSpacing(performer, performers) {
  return Math.min(...performers.filter(p => p.id !== performer.id)
    .map(p => Math.hypot(p.x - performer.x, p.y - performer.y)));
}

export function hitTestPerformer(performers, point, pixelsPerChartPixel) {
  const [nearest, runnerUp] = performers.map(p => ({ performer: p, distance: Math.hypot(p.x - point.x, p.y - point.y) * pixelsPerChartPixel }))
    .sort((a, b) => a.distance - b.distance);
  if (!nearest || nearest.distance > PERFORMER_HIT_RADIUS) return null;
  // A clear nearest target can be selected even when neighboring touch areas
  // overlap. Ambiguous taps are enlarged by the viewer for another try.
  if (runnerUp && runnerUp.distance - nearest.distance < 4) return null;
  return nearest.performer;
}

export function performerBounds(performers) {
  if (!performers.length) return null;
  // Include printed symbols and their offset number labels, not only centers.
  return {
    left: Math.min(...performers.map(p => p.x)) - 42,
    right: Math.max(...performers.map(p => p.x)) + 42,
    top: Math.min(...performers.map(p => p.y)) - 42,
    bottom: Math.max(...performers.map(p => p.y)) + 42,
  };
}

export function fitFormation(bounds, size, fitScale) {
  if (!bounds) return constrainView({ zoom: 1, x: 0, y: 0 }, size, fitScale);
  const side = 20, top = size.width < 360 ? 88 : 68, bottom = 20;
  const width = Math.max(1, size.width - 2 * side);
  const height = Math.max(1, size.height - top - bottom);
  const targetScale = Math.min(width / Math.max(1, bounds.right - bounds.left), height / Math.max(1, bounds.bottom - bounds.top));
  const zoom = Math.max(1, Math.min(MAX_ZOOM, targetScale / fitScale));
  // Framing may need space beyond a page edge (especially in landscape) to
  // keep the formation below the fixed chart controls.
  return {
    zoom,
    x: side + width / 2 - (bounds.left + bounds.right) / 2 * fitScale * zoom,
    y: top + height / 2 - (bounds.top + bounds.bottom) / 2 * fitScale * zoom,
  };
}

// Resolve shared boundary sets to the movement that actually owns the chart.
export function resolveChartMovement(data, movement, setNumber) {
  const movements = data.TD1?.movements || {};
  if (movements[movement]?.some(s => s.set === setNumber)) return String(movement);
  return Object.keys(movements).find(key => movements[key].some(s => s.set === setNumber)) || String(movement);
}

export function constrainView(view, size, fitScale) {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, view.zoom));
  const width = CHART.width * fitScale * zoom;
  const height = CHART.height * fitScale * zoom;
  return {
    zoom,
    x: width <= size.width ? (size.width - width) / 2 : Math.min(0, Math.max(size.width - width, view.x)),
    y: height <= size.height ? (size.height - height) / 2 : Math.min(0, Math.max(size.height - height, view.y)),
  };
}
