import { AlertTriangle, Camera, Clock3, PlaySquare } from "lucide-react";
const icons = {
  instagram: Camera,
  youtube: PlaySquare,
  clock: Clock3,
  alert: AlertTriangle,
};
export default function StatsCard({ stat }) {
  const Icon = icons[stat.icon];
  return (
    <article className="card stat-card">
      <div className="stat-top">
        <span>{stat.label}</span>
        <span className="stat-icon">
          <Icon size={15} />
        </span>
      </div>
      <div className="stat-value">{stat.value}</div>
      <div className={`trend ${stat.icon === "alert" ? "neutral" : ""}`}>
        {stat.detail}
      </div>
    </article>
  );
}
