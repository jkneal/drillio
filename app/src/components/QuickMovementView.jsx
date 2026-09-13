import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { performerData } from '../data/performerData';
import sections from '../data/drumlineSections.json';
import formationBounds from '../data/chartFormationBounds.json';
import { CHART, PIXELS_PER_STEP, getChartImagePath, getChartPerformers, performerBounds, resolveChartMovement } from '../utils/drillChartGeometry';
import DrumlineLegend from './DrumlineLegend';
import { rehearsalFromMeasures, summarizeHolds } from '../utils/quickMovementSummary';
import './QuickMovementView.css';

function FormPreview({ chart, fullBand }) {
  const bounds = (fullBand && formationBounds[`${chart.movement}-${chart.number}`]) || performerBounds(chart.performers);
  if (!bounds) return <div className="quick-form-unavailable">Form unavailable</div>;
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  const padding = fullBand ? 24 : 0;
  // Keep the actual aspect ratio and director's viewpoint in every tile.
  return <svg className="quick-form-preview" viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width + 2 * padding} ${height + 2 * padding}`} aria-hidden="true">
    {fullBand ? <image href={getChartImagePath(chart.movement, chart.number)} width={CHART.width} height={CHART.height} /> : <>
      {Array.from({ length: 21 }, (_, i) => CHART.left + i * 8 * PIXELS_PER_STEP)
        .filter(x => x >= bounds.left && x <= bounds.right).map(x => <line key={x} x1={x} x2={x} y1={bounds.top} y2={bounds.bottom} stroke="#e2e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      {[CHART.homeHash, CHART.visitorHash].filter(y => y >= bounds.top && y <= bounds.bottom)
        .map(y => <line key={y} x1={bounds.left} x2={bounds.right} y1={y} y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />)}
      {chart.performers.map(p => {
        const section = sections[p.id.replace(/\d+$/, '')];
        return <text key={p.id} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
          fontFamily="Arial, sans-serif" fontWeight="700" fontSize="20" fill={section.color}
          stroke={section.outline || 'none'} strokeWidth="0.6" paintOrder="stroke">{section.symbol}</text>;
      })}
    </>}
  </svg>;
}

export default function QuickMovementView({ movement, actualMovement, sets, currentSet, onSelect, onClose }) {
  const dialogRef = useRef(null);
  const activeCard = useRef(null);
  const [fullBand, setFullBand] = useState(false);
  const charts = useMemo(() => sets.map(set => {
    const owner = resolveChartMovement(performerData, actualMovement || movement, set.number);
    const performers = getChartPerformers(performerData, owner, set.number);
    return { ...set, movement: owner, performers,
      mark: set.mark !== 'No mark' ? set.mark : rehearsalFromMeasures(performers[0]?.measures) || 'No mark',
      counts: performers[0]?.counts || (set.number === 1 ? '0' : '—'), holds: summarizeHolds(performers) };
  }), [sets, actualMovement, movement]);

  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    activeCard.current?.scrollIntoView({ block: 'nearest' });
    return () => { dialog.close(); trigger?.focus(); };
  }, []);

  return <dialog ref={dialogRef} className="quick-movement-dialog" aria-labelledby="quick-movement-title"
    onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
    <header className="quick-movement-header">
      <div><h2 id="quick-movement-title">Quick Movement View</h2><p>Movement {movement} · {charts.length} sets</p></div>
      <button className="chart-tool" onClick={onClose} aria-label="Close Quick Movement View" autoFocus><X size={22} /></button>
    </header>
    <div className="quick-movement-controls">
      <div className="quick-form-toggle" role="group" aria-label="Formation preview">
        <button aria-pressed={!fullBand} onClick={() => setFullBand(false)}>Drumline</button>
        <button aria-pressed={fullBand} onClick={() => setFullBand(true)}>Full band</button>
      </div>
      <p>Tap a set to open its chart. Front sideline is at the bottom. Holds refer to the drumline.</p>
      {!fullBand && <DrumlineLegend />}
    </div>
    <div className="quick-movement-grid" aria-label="Movement sets">
      {charts.map(chart => <button key={chart.number} className="quick-set-card"
        ref={chart.number === currentSet ? activeCard : null}
        aria-current={chart.number === currentSet ? 'true' : undefined}
        aria-label={`Open Set ${chart.number}${chart.mark !== 'No mark' ? `, rehearsal ${chart.mark}` : ''}, ${chart.counts} counts${chart.holds.map(hold => `, ${hold.scope || 'drumline'} hold ${hold.counts} counts`).join('')}`}
        onClick={() => onSelect(chart.number)}>
        <div className="quick-set-heading"><strong>Set {chart.number}</strong>{chart.mark !== 'No mark' && <span>{chart.mark}</span>}</div>
        <FormPreview chart={chart} fullBand={fullBand} />
        <div className="quick-set-meta"><span>{chart.counts} counts</span>{chart.number === currentSet && <strong>Current</strong>}</div>
        {chart.holds.length > 0 && <div className="quick-set-holds">{chart.holds.map(hold => <span key={hold.counts}>{hold.scope && `${hold.scope} · `}Hold {hold.counts}</span>)}</div>}
      </button>)}
    </div>
  </dialog>;
}
