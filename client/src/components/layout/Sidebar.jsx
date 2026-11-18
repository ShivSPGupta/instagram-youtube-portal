import {
  BarChart3,
  Camera,
  Clock3,
  Link2,
  Settings,
  PlaySquare,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
const links = [
  ["/", "Dashboard", BarChart3],
  ["/instagram", "Instagram Posts", Camera],
  ["/youtube", "YouTube Connection", PlaySquare],
  ["/history", "Upload History", Clock3],
  ["/settings", "Settings", Settings],
];
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Link2 size={17} />
          </span>
          SocialFlow
        </div>
        <div className="nav-label">Workspace</div>
        <nav className="nav">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="profile">
          <span className="avatar">A</span>
          <div className="profile-copy">
            <div className="profile-name">Workspace account</div>
            <div className="profile-email">Account settings</div>
          </div>
          <button className="icon-button" aria-label="Close">
            <X size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
