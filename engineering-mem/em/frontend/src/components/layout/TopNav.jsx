import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, HardHat, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navFor, NAV_DIVIDER } from '../../config/navigation';
import useSystemStatus from '../../hooks/useSystemStatus';
import ThemeToggle from '../ThemeToggle';

function StatusPip({ ok, label, detail }) {
  return (
    <div className="flex items-center gap-1.5" title={detail}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ok ? 'bg-em-success' : 'bg-em-fault'}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-em-steel truncate">{label}</span>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { status, databaseOnline, aiEngineOnline, retrievalOnline, vectorCount } = useSystemStatus();

  const items = navFor(user?.role);
  const handleSignOut = () => { logout(); navigate('/'); };

  return (
    <aside
      className={`relative flex flex-col bg-em-surface border-r border-em-line transition-all duration-300 shrink-0 sticky top-0 h-screen z-20 ${collapsed ? 'w-14' : 'w-60'}`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 border-b border-em-line px-4 h-14 shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-em-navy text-em-amber font-mono text-xs font-bold">
            EM
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-em-graphite whitespace-nowrap">Engineering Memory</span>
              <span className="block text-[10px] uppercase tracking-wider text-em-muted whitespace-nowrap">Diagnosis Workstation</span>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? 'Expand' : 'Collapse'}
        className="absolute -right-3 top-[52px] z-30 flex h-6 w-6 items-center justify-center border border-em-line bg-em-surface text-em-muted hover:text-em-graphite shadow-sm rounded-full"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Nav — fills remaining height, items spaced evenly */}
      <nav className="flex flex-col px-2 py-3 flex-1 min-h-0" style={{ justifyContent: 'space-between' }}>

        {/* Nav links */}
        <div className="flex flex-col gap-0.5">
          {items.map((item, i) => {
            if (item.divider) return (
              <div key={`div-${i}`} className="my-1.5 border-t border-em-line" />
            );
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 py-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors rounded-sm border-l-2 ${
                    isActive
                      ? 'border-em-amber bg-em-amber/8 text-em-navy'
                      : 'border-transparent text-em-steel hover:bg-em-panel hover:text-em-graphite'
                  } ${collapsed ? 'justify-center px-0 border-l-0' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-em-amber' : 'text-em-muted'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* New Diagnosis CTA */}
          <div className="mt-1.5 border-t border-em-line pt-1.5">
            <Link
              to="/diagnose"
              title={collapsed ? 'New Diagnosis' : undefined}
              className={`flex items-center gap-2.5 py-2 px-2.5 text-[11px] font-bold uppercase tracking-wider bg-em-amber/12 text-em-amberDark hover:bg-em-amber/20 transition-colors rounded-sm border border-em-amber/25 ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Wrench className="h-3.5 w-3.5 shrink-0 text-em-amber" />
              {!collapsed && <span>New Diagnosis</span>}
            </Link>
          </div>
        </div>

        {/* Bottom: palette + status + user */}
        <div className="flex flex-col gap-0 shrink-0">

          {/* Color Palette + System Engine */}
          {!collapsed && (
            <div className="border-t border-em-line pt-2 pb-2 space-y-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-em-muted mb-1 px-1">Color Palette</p>
                <ThemeToggle compact />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-em-muted mb-1 px-1">System Engine</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-1">
                  <StatusPip ok={databaseOnline} label={status?.database?.includes('MySQL') ? 'MySQL' : 'Local DB'} detail={status?.database} />
                  <StatusPip ok={retrievalOnline} label={vectorCount ? `Index ${vectorCount.toLocaleString()}` : 'Index'} detail="Memory index" />
                  <StatusPip ok={aiEngineOnline} label="Local AI" detail="Qwen 3:4B" />
                  <StatusPip ok label="Offline" detail="No cloud" />
                </div>
              </div>
            </div>
          )}

          {/* User / sign out */}
          <div className={`border-t border-em-line pt-2 ${collapsed ? 'flex justify-center' : ''}`}>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-[11px] text-em-steel hover:bg-em-panel hover:text-em-graphite transition-colors rounded-sm ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-em-navy/10">
                <HardHat className="h-3.5 w-3.5 text-em-amber" />
              </div>
              {!collapsed && (
                <span className="flex-1 min-w-0 text-left">
                  <span className="block truncate font-bold text-xs text-em-graphite">{user?.full_name || user?.username}</span>
                  <span className="block truncate text-[10px] text-em-muted uppercase tracking-wider">{user?.role}</span>
                </span>
              )}
              {!collapsed && <LogOut className="h-3 w-3 shrink-0 text-em-muted" />}
            </button>
          </div>

        </div>
      </nav>
    </aside>
  );
}
