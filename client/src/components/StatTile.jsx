export default function StatTile({ label, value, delta, up }) {
  return (
    <div className="card stat-tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta && <div className={`delta ${up ? 'up' : ''}`}>{delta}</div>}
    </div>
  );
}
