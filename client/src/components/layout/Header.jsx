import { Bell, Menu, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
const info = {
  "/": ["Dashboard", "Here’s what’s happening with your content today."],
  "/instagram": [
    "Instagram Posts",
    "Fetch, review, and manage your Instagram content.",
  ],
  "/youtube": [
    "YouTube Connection",
    "Manage the channel where your videos are published.",
  ],
  "/history": [
    "Upload History",
    "Track every video moving through your workflow.",
  ],
  "/settings": ["Settings", "Manage your workspace preferences."],
};
export default function Header({ onMenu }) {
  const { pathname } = useLocation();
  const [title, subtitle] = info[pathname] || info["/"];
  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={19} />
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          <div className="page-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="top-actions">
        <button className="icon-button" aria-label="Search">
          <Search size={17} />
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={17} />
        </button>
          <span className="avatar top-avatar">A</span>
      </div>
    </header>
  );
}
