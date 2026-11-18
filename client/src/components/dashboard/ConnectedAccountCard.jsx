import { Camera, PlaySquare } from "lucide-react";
import { Link } from "react-router-dom";

export default function ConnectedAccountCard({
  type,
  connected,
  loading = false,
  name,
  actionTo,
}) {
  const instagram = type === "instagram";
  const Icon = instagram ? Camera : PlaySquare;
  return (
    <article className="card account-card">
      <span
        className={`account-icon ${instagram ? "instagram-bg" : "youtube-bg"}`}
      >
        <Icon size={21} />
      </span>
      <div className="account-copy">
        <div className="account-label">
          {instagram ? "Instagram account" : "YouTube channel"}
        </div>
        <div className="account-name">
          {loading
            ? "Checking connection…"
            : connected
              ? name || (instagram ? "Authorized account" : "YouTube channel")
              : "Not connected"}
        </div>
        <div className={`status ${connected ? "" : "offline"}`}>
          <span className="status-dot" />
          {loading ? "Checking" : connected ? "Connected" : "Action required"}
        </div>
      </div>
      {!loading && (
        <Link className="account-action" to={actionTo}>
          {connected ? "Manage" : "Connect"}
        </Link>
      )}
    </article>
  );
}
