import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Map as MapIcon, ChevronLeft, ChevronRight, Maximize2, Users } from 'lucide-react';
import { performerData } from '../data/performerData';
import { rehearsalMarks } from '../data/rehearsalMarks';
import drumlineSections from '../data/drumlineSections.json';
import chartFormationBounds from '../data/chartFormationBounds.json';
import {
  CHART, MAX_ZOOM, PERFORMER_HIT_RADIUS, constrainView, fitFormation, performerBounds,
  getChartPerformers, hitTestPerformer, resolveChartMovement,
} from '../utils/drillChartGeometry';
import './DrillChartModal.css';

const GuideLabel = ({ box, steps, reference, color }) => (
  <g transform={`translate(${box.x} ${box.y})`}>
    <rect width={box.width} height={box.height} rx="9" fill="#0f172a" stroke={color} strokeWidth="1.5" />
    <text x="12" y="21" fill={color} fontSize="14" fontWeight="750">{steps} steps</text>
    <text x="12" y="40" fill="#f8fafc" fontSize="12" fontWeight="500">{reference}</text>
  </g>
);

// Labels use screen pixels so they stay readable at every chart zoom. Try nearby
// positions first, then viewport corners to keep the two cards from colliding.
function placeGuideLabel(preferred, reference, size, performer, occupied = []) {
  const width = Math.min(216, Math.max(152, reference.length * 7 + 24));
  const height = 52;
  const topInset = size.width < 360 ? 88 : 64;
  const clamp = ([x, y]) => ({
    x: Math.max(8, Math.min(size.width - width - 8, x)),
    y: Math.max(topInset, Math.min(size.height - height - 8, y)),
    width, height,
  });
  const candidates = [...preferred,
    [8, topInset], [size.width - width - 8, topInset],
    [8, size.height - height - 8], [size.width - width - 8, size.height - height - 8],
  ].map(clamp);
  const overlaps = (a, b) => a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x
    && a.y < b.y + b.height + 8 && a.y + a.height + 8 > b.y;
  const dot = { x: performer.x - 14, y: performer.y - 14, width: 28, height: 28 };
  return candidates.find(box => !overlaps(box, dot) && occupied.every(other => !overlaps(box, other)))
    || candidates.find(box => occupied.every(other => !overlaps(box, other))) || candidates[0];
}

function CoordinateGuides({ performer: p, scale, view, size }) {
  const x = view.x + p.x * scale;
  const y = view.y + p.y * scale;
  const yardX = view.x + p.yardX * scale;
  const referenceY = view.y + p.referenceY * scale;
  const blue = '#7dd3fc';
  const purple = '#d8b4fe';
  const yardMidpoint = { x: (x + yardX) / 2, y };
  const depthMidpoint = { x, y: (y + referenceY) / 2 };
  const dot = { x, y };
  const yardBox = placeGuideLabel([
    [yardMidpoint.x - 76, y - 78], [yardMidpoint.x - 76, y + 26],
  ], p.yardLabel, size, dot);
  const depthBox = placeGuideLabel([
    [x + 28, depthMidpoint.y - 26], [x - 196, depthMidpoint.y - 26],
    [x + 28, y + 26], [x - 196, y + 26],
  ], p.depthLabel, size, dot, [yardBox]);
  return (
    <g className="chart-coordinate-guides" pointerEvents="none" aria-hidden="true">
      <line x1={yardX} y1={y} x2={x} y2={y} stroke={blue} strokeWidth="3" strokeDasharray="7 5" />
      <line x1={x} y1={referenceY} x2={x} y2={y} stroke={purple} strokeWidth="3" strokeDasharray="7 5" />
      <path d={`M ${yardX} ${y - 8} v 16`} stroke={blue} strokeWidth="3" />
      <path d={`M ${x - 8} ${referenceY} h 16`} stroke={purple} strokeWidth="3" />
      {[[yardBox, yardMidpoint, blue], [depthBox, depthMidpoint, purple]].map(([box, point, color]) => (
        <line key={color} x1={Math.max(box.x, Math.min(box.x + box.width, point.x))}
          y1={Math.max(box.y, Math.min(box.y + box.height, point.y))}
          x2={point.x} y2={point.y} stroke={color} strokeWidth="1" opacity="0.65" />
      ))}
      <GuideLabel box={yardBox} steps={p.yardSteps} reference={p.yardLabel} color={blue} />
      <GuideLabel box={depthBox} steps={p.depthSteps} reference={p.depthLabel} color={purple} />
      <circle cx={x} cy={y} r="12" fill="#be123c" stroke="white" strokeWidth="3" />
      <circle cx={x} cy={y} r="3" fill="white" />
    </g>
  );
}

function ChartViewer({ onClose, movement, actualMovement, setNumber, minSetNumber = 1, maxSetNumber = setNumber }) {
  const [currentSet, setCurrentSet] = useState(setNumber);
  const [selectedId, setSelectedId] = useState(null);
  const [followDrumline, setFollowDrumline] = useState(false);
  const [followBand, setFollowBand] = useState(true);
  const [imageStatus, setImageStatus] = useState('loading');
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [notice, setNotice] = useState('');
  const dialogRef = useRef(null);
  const viewportRef = useRef(null);
  const viewRef = useRef(view);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const fitScale = Math.min(size.width / CHART.width, size.height / CHART.height);
  const scale = fitScale * view.zoom;
  const currentMovement = resolveChartMovement(performerData, actualMovement || movement, currentSet);
  const chartPath = `/drill/${currentMovement}-${currentSet}.png?v=show-section-colors-clean-symbols-1`;
  const performers = useMemo(() => getChartPerformers(performerData, currentMovement, currentSet), [currentMovement, currentSet]);
  const bandBounds = chartFormationBounds[`${currentMovement}-${currentSet}`];
  const selected = performers.find(p => p.id === selectedId);
  const setData = performerData.TD1?.movements[currentMovement]?.find(s => s.set === currentSet);
  const mark = rehearsalMarks[currentMovement]?.[String(currentSet)];
  const setOptions = useMemo(() => Array.from({ length: maxSetNumber - minSetNumber + 1 }, (_, index) => {
    const number = minSetNumber + index;
    const owner = resolveChartMovement(performerData, actualMovement || movement, number);
    return { number, mark: rehearsalMarks[owner]?.[String(number)] || 'No mark' };
  }), [minSetNumber, maxSetNumber, actualMovement, movement]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = { width: entry.contentRect.width, height: entry.contentRect.height };
      setSize(nextSize);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const updateView = nextView => {
    const next = constrainView(nextView, size, fitScale);
    viewRef.current = next;
    setView(next);
  };

  const zoomAt = (zoom, point = { x: size.width / 2, y: size.height / 2 }) => {
    setFollowBand(false);
    const previous = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(1, zoom));
    const ratio = nextZoom / previous.zoom;
    updateView({ zoom: nextZoom, x: point.x - (point.x - previous.x) * ratio, y: point.y - (point.y - previous.y) * ratio });
    setNotice('');
  };

  useEffect(() => {
    const bounds = followDrumline ? performerBounds(performers) : bandBounds;
    const next = followDrumline || followBand
      ? fitFormation(bounds, size, fitScale)
      : constrainView(viewRef.current, size, fitScale);
    viewRef.current = next;
    setView(next);
  }, [followDrumline, followBand, performers, bandBounds, size, fitScale]);

  const fitChart = () => {
    setFollowDrumline(false);
    setFollowBand(true);
    const next = fitFormation(bandBounds, size, fitScale);
    viewRef.current = next;
    setView(next);
    setNotice('');
  };

  const toggleDrumlineZoom = () => {
    if (followDrumline) fitChart();
    else {
      setFollowBand(false);
      setFollowDrumline(true);
      setNotice('');
    }
  };

  const localPoint = e => {
    const rect = viewportRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const beginGesture = () => {
    const points = [...pointers.current.values()];
    const midpoint = points.length > 1
      ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
      : points[0];
    gesture.current = { point: midpoint, view: { ...viewRef.current }, distance: points.length > 1 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0 };
  };

  const onPointerDown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!pointers.current.size) suppressClick.current = false;
    pointers.current.set(e.pointerId, localPoint(e));
    if (pointers.current.size > 1) suppressClick.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    beginGesture();
  };

  const onPointerMove = e => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, localPoint(e));
    const points = [...pointers.current.values()];
    const start = gesture.current;
    if (points.length > 1) {
      setFollowBand(false);
      const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      const zoom = Math.min(MAX_ZOOM, Math.max(1, start.view.zoom * distance / (start.distance || distance)));
      const ratio = zoom / start.view.zoom;
      updateView({ zoom, x: midpoint.x - (start.point.x - start.view.x) * ratio, y: midpoint.y - (start.point.y - start.view.y) * ratio });
    } else {
      const dx = points[0].x - start.point.x, dy = points[0].y - start.point.y;
      if (Math.hypot(dx, dy) > 6) suppressClick.current = true;
      if (suppressClick.current) {
        setFollowBand(false);
        updateView({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
      }
    }
  };

  const selectPerformer = id => {
    setSelectedId(id);
    setNotice('');
  };

  const onPointerEnd = e => {
    if (!pointers.current.has(e.pointerId)) return;
    if (e.type === 'pointerup' && pointers.current.size === 1 && !suppressClick.current && imageStatus === 'ready') {
      const point = localPoint(e);
      const current = viewRef.current;
      const currentScale = fitScale * current.zoom;
      const chartPoint = { x: (point.x - current.x) / currentScale, y: (point.y - current.y) / currentScale };
      const hit = hitTestPerformer(performers, chartPoint, currentScale);
      const nearPerformer = performers.some(p => Math.hypot(p.x - chartPoint.x, p.y - chartPoint.y) * currentScale <= PERFORMER_HIT_RADIUS);
      if (hit) {
        selectPerformer(hit.id);
      } else if (selected && !nearPerformer) {
        setSelectedId(null);
        setNotice('');
      } else {
        if (nearPerformer && current.zoom < MAX_ZOOM) {
          zoomAt(current.zoom * 1.8, point);
          setNotice('Zoomed in for a clearer choice. Tap the member again.');
        } else {
          setNotice(nearPerformer ? 'Tap closer to the center of a drumline symbol.' : 'Tap a colored drumline member to see their coordinates.');
        }
      }
    }
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (pointers.current.size) beginGesture();
    else gesture.current = null;
  };

  // A non-passive listener keeps trackpad zoom inside the chart rather than scrolling the page.
  const wheelHandler = useRef(null);
  useEffect(() => {
    wheelHandler.current = e => {
      e.preventDefault();
      zoomAt(viewRef.current.zoom * Math.exp(-e.deltaY * 0.002), localPoint(e));
    };
  });
  useEffect(() => {
    const element = viewportRef.current;
    const handleWheel = e => wheelHandler.current?.(e);
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const jumpToSet = number => {
    const next = Math.min(maxSetNumber, Math.max(minSetNumber, number));
    if (next === currentSet) return;
    setCurrentSet(next);
    setImageStatus('loading');
    setNotice('');
    pointers.current.clear();
    gesture.current = null;
  };

  return (
    <dialog ref={dialogRef} className="drill-chart-dialog" aria-labelledby="drill-chart-title"
      onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
      <header className="drill-chart-header">
        <div><span className="drill-chart-eyebrow">DRILL CHART</span><h2 id="drill-chart-title">Movement {currentMovement} · Set {currentSet}</h2></div>
        <button className="chart-tool" aria-label="Close drill chart" onClick={onClose} autoFocus><X size={22} /></button>
      </header>
      <div className="drill-chart-toolbar" aria-label="Chart controls">
        <button className="chart-tool chart-tool-text" aria-label="Fit chart" onClick={fitChart}><Maximize2 size={18} />Fit</button>
        <select className="chart-set-select" aria-label="Jump to set" value={currentSet} onChange={e => jumpToSet(Number(e.target.value))}>
          {setOptions.map(option => <option key={option.number} value={option.number}>{option.number} - {option.mark}</option>)}
        </select>
        <button className="chart-tool chart-tool-text chart-tool-primary" onClick={toggleDrumlineZoom} aria-label="Zoom to drumline" aria-pressed={followDrumline}
          disabled={!followDrumline && (!performers.length || imageStatus !== 'ready')}><Users size={18} />Zoom to drumline<span className="chart-toggle-state" aria-hidden="true">{followDrumline ? 'On' : 'Off'}</span></button>
      </div>
      <div className="drill-chart-stage">
        <div ref={viewportRef} className="drill-chart-viewport" tabIndex={0} aria-label="Drill chart. Pinch or scroll to zoom; drag to pan. Use plus, minus, or arrow keys."
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onLostPointerCapture={onPointerEnd}
          onKeyDown={e => {
            if (e.target !== e.currentTarget) return;
            if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); zoomAt(view.zoom * (e.key === '-' ? 1 / 1.4 : 1.4)); }
            const arrows = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
            if (arrows[e.key]) { e.preventDefault(); setFollowBand(false); updateView({ ...view, x: view.x + arrows[e.key][0], y: view.y + arrows[e.key][1] }); }
          }}>
          <svg width={size.width} height={size.height} className="drill-chart-svg">
            <g transform={`translate(${view.x} ${view.y}) scale(${scale})`}>
              <image key={chartPath} href={chartPath} x="0" y="0" width={CHART.width} height={CHART.height}
                aria-label={`Drill chart for Movement ${currentMovement}, Set ${currentSet}`}
                onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')} />
            </g>
            {imageStatus === 'ready' && selected && <rect className="chart-selection-scrim"
              width={size.width} height={size.height} fill="#0f172a" fillOpacity="0.8" pointerEvents="none" />}
            <g transform={`translate(${view.x} ${view.y}) scale(${scale})`}>
              {imageStatus === 'ready' && performers.map(p => {
                return <circle key={p.id} cx={p.x} cy={p.y} r={8 / scale}
                  fill="transparent" stroke="none" strokeWidth={1.5 / scale}
                  role="button" aria-label={`${p.name}, ${p.id}, chart number ${p.number}`} aria-pressed={p.id === selectedId}
                  tabIndex={0} className="chart-performer"
                  onClick={e => { if (e.detail === 0) { selectPerformer(p.id); } }}
                  onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); selectPerformer(p.id); } }}>
                  <title>{p.id} · {p.name} (#{p.number})</title>
                </circle>;
              })}
            </g>
            {imageStatus === 'ready' && selected && <CoordinateGuides performer={selected} scale={scale} view={view} size={size} />}
          </svg>
        </div>
        <div className="chart-top-overlay">
          <div className="chart-music-marks" aria-label="Set music and counts">
            <span className="chart-rehearsal">Rehearsal <strong>{mark || '—'}</strong></span>
            <span>Counts <strong>{setData?.counts || (currentSet === 1 ? '0' : '—')}</strong></span>
            {setData?.measures && <span className="chart-measures">Measures <strong>{setData.measures}</strong></span>}
          </div>
          <nav className="chart-corner-navigation" aria-label="Chart set navigation">
            <button className="chart-tool" aria-label="Previous chart set" onClick={() => jumpToSet(currentSet - 1)} disabled={currentSet <= minSetNumber}><ChevronLeft size={22} /></button>
            <span aria-live="polite">Set {currentSet}</span>
            <button className="chart-tool" aria-label="Next chart set" onClick={() => jumpToSet(currentSet + 1)} disabled={currentSet >= maxSetNumber}><ChevronRight size={22} /></button>
          </nav>
        </div>
        {imageStatus !== 'ready' && <div className="chart-image-message" role="status">
          {imageStatus === 'error' && <MapIcon size={32} />}
          <p>{imageStatus === 'error' ? `Drill chart not available for Set ${currentSet}.` : 'Loading drill chart…'}</p>
        </div>}
      </div>
      <div className="chart-selection" aria-live="polite">
        {selected && imageStatus === 'ready' ? <>
          <div className="chart-selection-title"><strong>{selected.name} <span>{selected.id} · #{selected.number}</span><small>Tap another member to switch · Tap elsewhere to dismiss</small></strong>
            <button className="chart-tool" aria-label="Clear selected performer" onClick={() => setSelectedId(null)}><X size={18} /></button></div>
          <div className="chart-coordinates"><p className="chart-yard-coordinate">{selected.leftRight}</p><p className="chart-depth-coordinate">{selected.homeVisitor}</p></div>
        </> : <p>{notice || 'Tap a colored drumline member to see coordinates.'}</p>}
      </div>
      <footer className="drill-chart-footer">
        <div className="chart-section-legend" aria-label="Drumline section colors">
          {Object.values(drumlineSections).map(section => <span key={section.symbol}>
            <i style={{ backgroundColor: section.color }} aria-hidden="true" />{section.symbol} · {section.name}
          </span>)}
        </div>
        <small>Pinch / scroll to zoom · Drag to pan</small>
      </footer>
    </dialog>
  );
}

// Mount a fresh session each time the viewer opens; keep zoom while browsing sets.
export default function DrillChartModal({ show, ...props }) {
  return show ? <ChartViewer key={`${props.movement}-${props.actualMovement}-${props.setNumber}`} {...props} /> : null;
}
