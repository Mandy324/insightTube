import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Settings, BarChart3, Clock, PanelLeftClose, PanelLeft, StickyNote, CheckSquare } from "lucide-react";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // History should highlight when on /history OR /study/*
  const isHistoryActive =
    location.pathname === "/history" ||
    location.pathname.startsWith("/study/");

  return (
    <div className={`app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand">
          <img src="/logo.svg" alt="InsightTube" className="brand-logo" />
          {!collapsed && <span className="brand-text">InsightTube</span>}
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Home size={20} />
            {!collapsed && <span>Home</span>}
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <BarChart3 size={20} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink
            to="/history"
            className={() => `nav-item ${isHistoryActive ? "active" : ""}`}
          >
            <Clock size={20} />
            {!collapsed && <span>History</span>}
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <StickyNote size={20} />
            {!collapsed && <span>Notes</span>}
          </NavLink>
          <NavLink to="/todos" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <CheckSquare size={20} />
            {!collapsed && <span>Tasks</span>}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Settings size={20} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
          {!collapsed && <span className="version-text">v0.3.0</span>}
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
