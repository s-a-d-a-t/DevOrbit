import { IconArrowUpRight } from './icons';

export default function StatTile({ label, value, delta, up, feature, icon }) {
  return (
    <div className={`stat-card${feature ? ' feature' : ''}`}>
      <div className="stat-card-head">
        {icon && <span className="stat-card-icon">{icon}</span>}
        <span className="stat-card-arrow"><IconArrowUpRight size={14} /></span>
      </div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta && <div className={`delta ${up ? 'up' : ''}`}>{delta}</div>}
    </div>
  );
}
