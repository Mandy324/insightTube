import { NavLink, Outlet } from "react-router-dom";
import { Home, Settings, Sparkles } from "lucide-react";

export default function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Sparkles size={24} className="brand-icon" />
          <span className="brand-text">InsightTube</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Home size={20} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="version-text">v0.1.0</span>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
