import sections from '../data/drumlineSections.json';

export default function DrumlineLegend() {
  return <div className="chart-section-legend" aria-label="Drumline section colors">
    {Object.values(sections).map(section => <span key={section.symbol}>
      <i style={{ backgroundColor: section.color }} aria-hidden="true" />{section.symbol} · {section.name}
    </span>)}
  </div>;
}
