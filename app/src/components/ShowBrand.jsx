import { showConfig } from '../data/showConfig';

const ShowBrand = ({ compact = false }) => (
  <div className={`show-brand ${compact ? 'show-brand--compact' : ''}`}>
    <div className="show-brand__year">
      <img src="/HSlogo.png" alt="Edgewood" />
      <span>Edgewood {showConfig.year}</span>
    </div>
    <div className="show-brand__logo-frame">
      <img
        src={showConfig.logoPath}
        alt={`${showConfig.title} — ${showConfig.organization}`}
        className="show-brand__logo"
      />
    </div>
  </div>
);

export default ShowBrand;
