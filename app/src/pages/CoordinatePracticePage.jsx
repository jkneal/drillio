import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crosshair, RotateCcw, Target } from 'lucide-react';

const CANVAS = {
  width: 900,
  height: 500,
  fieldLeft: 52,
  fieldRight: 848,
  fieldTop: 48,
  fieldBottom: 444
};

const FIELD_DEPTH_YARDS = 160 / 3;
const STANDARD_STEP_YARDS = 5 / 8;
const FIELD_DEPTH_STEPS = FIELD_DEPTH_YARDS / STANDARD_STEP_YARDS;
const HOME_HASH_STEPS = (160 / 9) / STANDARD_STEP_YARDS;
const VISITOR_HASH_STEPS = FIELD_DEPTH_STEPS - HOME_HASH_STEPS;
const CORRECT_TOLERANCE_STEPS = 2;
const MAGNIFIER_RADIUS = 90;
const MAGNIFIER_ZOOM = 3;
const magnifierBuffers = new WeakMap();

const LEVELS = {
  rookie: {
    label: 'Rookie',
    description: 'Whole-step coordinates',
    horizontalSteps: [0, 1, 2, 3, 4],
    verticalSteps: [0, 2, 4, 6, 8, 10]
  },
  challenge: {
    label: 'Challenge',
    description: 'Fractional coordinates',
    horizontalSteps: [0.5, 1.25, 1.5, 2.25, 2.5, 3.25, 3.5, 3.75],
    verticalSteps: [1.5, 2.25, 3.5, 4.75, 6.25, 7.5, 9.25, 10.75]
  }
};

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const stepLabel = (steps) => `${steps} ${steps === 1 ? 'step' : 'steps'}`;

const createProblem = (levelKey) => {
  const level = LEVELS[levelKey];
  const side = pick(['Left', 'Right']);
  const yardLine = pick([20, 25, 30, 35, 40, 45]);
  const horizontalSteps = pick(level.horizontalSteps);
  const horizontalDirection = pick(['inside', 'outside']);
  const horizontalOffsetYards = horizontalSteps * STANDARD_STEP_YARDS;

  let fieldYard = side === 'Left' ? yardLine : 100 - yardLine;
  if (horizontalSteps > 0) {
    if (side === 'Left') {
      fieldYard += horizontalDirection === 'inside' ? horizontalOffsetYards : -horizontalOffsetYards;
    } else {
      fieldYard += horizontalDirection === 'inside' ? -horizontalOffsetYards : horizontalOffsetYards;
    }
  }

  const reference = pick(['Home Hash', 'Visitor Hash']);
  const verticalSteps = pick(level.verticalSteps);
  const verticalDirection = pick(['in front of', 'behind']);
  const referenceSteps = reference === 'Home Hash' ? HOME_HASH_STEPS : VISITOR_HASH_STEPS;
  const depthSteps = verticalSteps === 0
    ? referenceSteps
    : referenceSteps + (verticalDirection === 'behind' ? verticalSteps : -verticalSteps);

  return {
    id: `${Date.now()}-${Math.random()}`,
    leftRight: horizontalSteps === 0
      ? `${side}: On ${yardLine} yd ln`
      : `${side}: ${stepLabel(horizontalSteps)} ${horizontalDirection} ${yardLine} yd ln`,
    frontBack: verticalSteps === 0
      ? `On ${reference}`
      : `${stepLabel(verticalSteps)} ${verticalDirection} ${reference}`,
    fieldYard,
    depthSteps
  };
};

const yardToCanvasX = (yard) => {
  const width = CANVAS.fieldRight - CANVAS.fieldLeft;
  return CANVAS.fieldLeft + (yard / 100) * width;
};

const depthToCanvasY = (depthSteps) => {
  const height = CANVAS.fieldBottom - CANVAS.fieldTop;
  return CANVAS.fieldBottom - (depthSteps / FIELD_DEPTH_STEPS) * height;
};

const canvasToField = (x, y) => {
  const width = CANVAS.fieldRight - CANVAS.fieldLeft;
  const height = CANVAS.fieldBottom - CANVAS.fieldTop;
  return {
    fieldYard: ((x - CANVAS.fieldLeft) / width) * 100,
    depthSteps: ((CANVAS.fieldBottom - y) / height) * FIELD_DEPTH_STEPS
  };
};

const drawMagnifier = (canvas, context, point) => {
  let buffer = magnifierBuffers.get(canvas);
  if (!buffer) {
    buffer = canvas.ownerDocument.createElement('canvas');
    buffer.width = CANVAS.width;
    buffer.height = CANVAS.height;
    magnifierBuffers.set(canvas, buffer);
  }
  const bufferContext = buffer.getContext('2d');
  bufferContext.clearRect(0, 0, CANVAS.width, CANVAS.height);
  bufferContext.drawImage(canvas, 0, 0);

  const sourceRadius = MAGNIFIER_RADIUS / MAGNIFIER_ZOOM;
  const isTouch = point.pointerType === 'touch';
  let lensX = point.x;
  let lensY = isTouch ? point.y - MAGNIFIER_RADIUS - 34 : point.y;

  if (isTouch && lensY - MAGNIFIER_RADIUS < 8) {
    lensY = point.y + MAGNIFIER_RADIUS + 34;
  }

  lensX = Math.max(MAGNIFIER_RADIUS + 8, Math.min(CANVAS.width - MAGNIFIER_RADIUS - 8, lensX));
  lensY = Math.max(MAGNIFIER_RADIUS + 8, Math.min(CANVAS.height - MAGNIFIER_RADIUS - 8, lensY));

  context.save();
  context.beginPath();
  context.arc(lensX, lensY, MAGNIFIER_RADIUS, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = '#07080d';
  context.fillRect(
    lensX - MAGNIFIER_RADIUS,
    lensY - MAGNIFIER_RADIUS,
    MAGNIFIER_RADIUS * 2,
    MAGNIFIER_RADIUS * 2
  );
  context.drawImage(
    buffer,
    point.x - sourceRadius,
    point.y - sourceRadius,
    sourceRadius * 2,
    sourceRadius * 2,
    lensX - MAGNIFIER_RADIUS,
    lensY - MAGNIFIER_RADIUS,
    MAGNIFIER_RADIUS * 2,
    MAGNIFIER_RADIUS * 2
  );
  context.restore();

  context.save();
  context.strokeStyle = '#facc15';
  context.lineWidth = 5;
  context.beginPath();
  context.arc(lensX, lensY, MAGNIFIER_RADIUS, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = 'rgba(255,255,255,0.96)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(lensX - 16, lensY);
  context.lineTo(lensX + 16, lensY);
  context.moveTo(lensX, lensY - 16);
  context.lineTo(lensX, lensY + 16);
  context.stroke();

  context.fillStyle = '#facc15';
  context.font = '900 14px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(`${MAGNIFIER_ZOOM}×`, lensX, lensY - MAGNIFIER_RADIUS + 20);
  context.restore();
};

const drawField = (canvas, problem, selectedPoint, result, magnifierPoint) => {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const fieldWidth = CANVAS.fieldRight - CANVAS.fieldLeft;
  const fieldHeight = CANVAS.fieldBottom - CANVAS.fieldTop;

  context.clearRect(0, 0, CANVAS.width, CANVAS.height);
  context.fillStyle = '#07080d';
  context.fillRect(0, 0, CANVAS.width, CANVAS.height);
  context.fillStyle = '#123c32';
  context.fillRect(CANVAS.fieldLeft, CANVAS.fieldTop, fieldWidth, fieldHeight);

  const homeHashY = depthToCanvasY(HOME_HASH_STEPS);
  const visitorHashY = depthToCanvasY(VISITOR_HASH_STEPS);

  for (let yard = 0; yard <= 100; yard += 5) {
    const x = yardToCanvasX(yard);
    const isFifty = yard === 50;
    context.strokeStyle = isFifty ? 'rgba(244,237,0,0.72)' : 'rgba(255,255,255,0.42)';
    context.lineWidth = isFifty ? 3 : 1.5;
    context.beginPath();
    context.moveTo(x, CANVAS.fieldTop);
    context.lineTo(x, CANVAS.fieldBottom);
    context.stroke();

    if (yard > 0 && yard < 100) {
      const number = yard <= 50 ? yard : 100 - yard;
      context.fillStyle = 'rgba(255,255,255,0.72)';
      context.font = '700 15px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(String(number), x, CANVAS.fieldTop + 22);
      context.save();
      context.translate(x, CANVAS.fieldBottom - 22);
      context.rotate(Math.PI);
      context.fillText(String(number), 0, 0);
      context.restore();
    }
  }

  // Four standard steps equal 2.5 yards. Mirror the pathway visualizer's
  // always-on reference dashes along every major yard line.
  context.strokeStyle = 'rgba(250,204,21,0.78)';
  context.lineWidth = 2;
  for (let yard = 5; yard < 100; yard += 5) {
    const x = yardToCanvasX(yard);
    [HOME_HASH_STEPS, VISITOR_HASH_STEPS].forEach((hashDepthSteps) => {
      [-1, 1].forEach((direction) => {
        for (let interval = 1; interval <= 4; interval += 1) {
          const depthSteps = hashDepthSteps + direction * 4 * interval;
          if (depthSteps <= 0 || depthSteps >= FIELD_DEPTH_STEPS) continue;
          const y = depthToCanvasY(depthSteps);
          context.beginPath();
          context.moveTo(x - 5, y);
          context.lineTo(x + 5, y);
          context.stroke();
        }
      });
    });
  }

  context.strokeStyle = 'rgba(255,255,255,0.46)';
  context.lineWidth = 1.5;
  context.setLineDash([8, 8]);
  [homeHashY, visitorHashY].forEach((hashY) => {
    context.beginPath();
    context.moveTo(CANVAS.fieldLeft, hashY);
    context.lineTo(CANVAS.fieldRight, hashY);
    context.stroke();
  });
  context.setLineDash([]);

  context.strokeStyle = 'rgba(255,255,255,0.74)';
  context.lineWidth = 2;
  for (let yard = 0; yard <= 100; yard += 1) {
    if (yard % 5 === 0) continue;
    const x = yardToCanvasX(yard);
    [homeHashY, visitorHashY].forEach((hashY) => {
      context.beginPath();
      context.moveTo(x, hashY - 5);
      context.lineTo(x, hashY + 5);
      context.stroke();
    });
  }

  context.strokeStyle = 'rgba(255,255,255,0.82)';
  context.lineWidth = 3;
  context.strokeRect(CANVAS.fieldLeft, CANVAS.fieldTop, fieldWidth, fieldHeight);

  context.fillStyle = 'rgba(255,255,255,0.72)';
  context.font = '800 13px system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillText('VH', CANVAS.fieldLeft + 8, visitorHashY - 9);
  context.fillText('HH', CANVAS.fieldLeft + 8, homeHashY - 9);

  context.textAlign = 'center';
  context.fillStyle = 'rgba(255,255,255,0.64)';
  context.font = '800 14px system-ui, sans-serif';
  context.fillText('BACK / VISITOR SIDELINE', CANVAS.width / 2, CANVAS.fieldTop - 16);
  context.fillText('FRONT / HOME SIDELINE · AUDIENCE', CANVAS.width / 2, CANVAS.fieldBottom + 27);
  context.font = '900 14px system-ui, sans-serif';
  context.fillStyle = '#fecaca';
  context.fillText('SIDE 1 · LEFT', CANVAS.fieldLeft + fieldWidth * 0.25, CANVAS.fieldBottom + 48);
  context.fillStyle = '#bfdbfe';
  context.fillText('SIDE 2 · RIGHT', CANVAS.fieldLeft + fieldWidth * 0.75, CANVAS.fieldBottom + 48);

  if (selectedPoint) {
    const x = yardToCanvasX(selectedPoint.fieldYard);
    const y = depthToCanvasY(selectedPoint.depthSteps);
    context.strokeStyle = '#ef2b2d';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x - 13, y);
    context.lineTo(x + 13, y);
    context.moveTo(x, y - 13);
    context.lineTo(x, y + 13);
    context.stroke();
    context.fillStyle = '#ef2b2d';
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
  }

  if (result) {
    const actualX = yardToCanvasX(problem.fieldYard);
    const actualY = depthToCanvasY(problem.depthSteps);
    if (selectedPoint) {
      const selectedX = yardToCanvasX(selectedPoint.fieldYard);
      const selectedY = depthToCanvasY(selectedPoint.depthSteps);
      context.strokeStyle = 'rgba(255,255,255,0.6)';
      context.lineWidth = 2;
      context.setLineDash([7, 7]);
      context.beginPath();
      context.moveTo(selectedX, selectedY);
      context.lineTo(actualX, actualY);
      context.stroke();
      context.setLineDash([]);
    }

    context.fillStyle = '#4ade80';
    context.strokeStyle = '#fff';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(actualX, actualY, 10, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  if (magnifierPoint && !result) {
    drawMagnifier(canvas, context, magnifierPoint);
  }
};

const CoordinatePracticePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const activePointerRef = useRef(null);
  const [level, setLevel] = useState('rookie');
  const [problem, setProblem] = useState(() => createProblem('rookie'));
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, attempts: 0 });
  const [magnifierPoint, setMagnifierPoint] = useState(null);

  useEffect(() => {
    drawField(canvasRef.current, problem, selectedPoint, result, magnifierPoint);
  }, [problem, selectedPoint, result, magnifierPoint]);

  const startNewProblem = (levelKey = level) => {
    setProblem(createProblem(levelKey));
    setSelectedPoint(null);
    setResult(null);
    setMagnifierPoint(null);
  };

  const changeLevel = (nextLevel) => {
    setLevel(nextLevel);
    setScore({ correct: 0, attempts: 0 });
    startNewProblem(nextLevel);
  };

  const resetSession = () => {
    setScore({ correct: 0, attempts: 0 });
    startNewProblem();
  };

  const getCanvasPoint = (event, clampToField = false) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = ((event.clientX - rect.left) / rect.width) * CANVAS.width;
    const canvasY = ((event.clientY - rect.top) / rect.height) * CANVAS.height;

    const isInsideField = canvasX >= CANVAS.fieldLeft
      && canvasX <= CANVAS.fieldRight
      && canvasY >= CANVAS.fieldTop
      && canvasY <= CANVAS.fieldBottom;
    if (!isInsideField && !clampToField) return null;

    const clampedX = Math.max(CANVAS.fieldLeft, Math.min(CANVAS.fieldRight, canvasX));
    const clampedY = Math.max(CANVAS.fieldTop, Math.min(CANVAS.fieldBottom, canvasY));
    return { x: clampedX, y: clampedY, pointerType: event.pointerType };
  };

  const handlePointerMove = (event) => {
    if (result) return;
    const point = getCanvasPoint(event, activePointerRef.current === event.pointerId);
    setMagnifierPoint(point);
  };

  const handlePointerDown = (event) => {
    if (result) return;
    event.preventDefault();
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setMagnifierPoint(getCanvasPoint(event, true));
  };

  const handlePointerUp = (event) => {
    if (result || activePointerRef.current !== event.pointerId) return;
    const point = getCanvasPoint(event, true);
    setSelectedPoint(canvasToField(point.x, point.y));
    activePointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setMagnifierPoint(event.pointerType === 'touch' ? null : point);
  };

  const handlePointerLeave = () => {
    if (activePointerRef.current === null) setMagnifierPoint(null);
  };

  const handlePointerCancel = (event) => {
    if (activePointerRef.current === event.pointerId) activePointerRef.current = null;
    setMagnifierPoint(null);
  };

  const checkAnswer = () => {
    if (!selectedPoint) return;
    const horizontalErrorSteps = (selectedPoint.fieldYard - problem.fieldYard) / STANDARD_STEP_YARDS;
    const verticalErrorSteps = selectedPoint.depthSteps - problem.depthSteps;
    const distanceSteps = Math.sqrt(horizontalErrorSteps ** 2 + verticalErrorSteps ** 2);
    const isCorrect = distanceSteps <= CORRECT_TOLERANCE_STEPS;
    setResult({ distanceSteps, isCorrect });
    setScore((current) => ({
      correct: current.correct + (isCorrect ? 1 : 0),
      attempts: current.attempts + 1
    }));
  };

  return (
    <div className="min-h-screen show-theme p-4">
      <main className="coordinate-practice-page max-w-4xl mx-auto">
        <header className="coordinate-practice-header pt-4">
          <button onClick={() => navigate('/learning-drill')}>
            <ArrowLeft className="w-5 h-5" />
            <span>Learning Drill</span>
          </button>
          <div>
            <div className="show-kicker">Rookie lab</div>
            <h1>Find the Coordinate</h1>
          </div>
          <button onClick={resetSession} title="Reset score">
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </header>

        <section className="show-card coordinate-practice-panel">
          <div className="coordinate-practice-toolbar">
            <div className="coordinate-levels" aria-label="Practice difficulty">
              {Object.entries(LEVELS).map(([key, option]) => (
                <button key={key} onClick={() => changeLevel(key)} className={level === key ? 'active' : ''}>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
            <div className="coordinate-score">
              <Target />
              <span><strong>{score.correct}</strong> / {score.attempts}</span>
            </div>
          </div>

          <div className="coordinate-prompt">
            <p>Hover to magnify, then click to place · On touch, press, drag, and release</p>
            <div>
              <span>LEFT–RIGHT</span>
              <strong>{problem.leftRight}</strong>
            </div>
            <div>
              <span>FRONT–BACK</span>
              <strong>{problem.frontBack}</strong>
            </div>
          </div>

          <div className="coordinate-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={CANVAS.width}
              height={CANVAS.height}
              className={magnifierPoint && !result ? 'coordinate-canvas--magnifying' : ''}
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onPointerCancel={handlePointerCancel}
              aria-label="Football field coordinate practice area. Hover to magnify and click to place the requested coordinate."
            />
          </div>

          <div className="coordinate-legend">
            <span><i className="coordinate-legend-user" />Your selection</span>
            <span><i className="coordinate-legend-answer" />Correct coordinate</span>
            <span><i className="coordinate-legend-four-step" />4-step guide</span>
          </div>

          {result && (
            <div className={`coordinate-feedback ${result.isCorrect ? 'coordinate-feedback--correct' : 'coordinate-feedback--try-again'}`}>
              {result.isCorrect ? <CheckCircle2 /> : <Crosshair />}
              <div>
                <strong>{result.isCorrect ? 'Nice work!' : 'Compare the two markers'}</strong>
                <p>
                  Your selection was {result.distanceSteps.toFixed(1)} standard steps from the coordinate.
                  {result.isCorrect ? ' That is within the 2-step practice target.' : ' The green dot shows the exact location.'}
                </p>
              </div>
            </div>
          )}

          <div className="coordinate-practice-actions">
            {!result ? (
              <button onClick={checkAnswer} disabled={!selectedPoint} className="show-primary-button">
                Check coordinate
              </button>
            ) : (
              <button onClick={() => startNewProblem()} className="show-primary-button">
                Next coordinate
              </button>
            )}
          </div>

          <p className="coordinate-practice-note">
            Field view is from the audience: Side 1 / Left is on the left, and the front sideline is at the bottom.
          </p>
        </section>
      </main>
    </div>
  );
};

export default CoordinatePracticePage;
