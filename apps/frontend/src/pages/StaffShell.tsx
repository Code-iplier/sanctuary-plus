import { useEffect, useState } from 'react';
import {
  Activity,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  RadioTower,
  Shield,
  Users,
} from 'lucide-react';
import DashboardPage from './DashboardPage';
import QueuePage from './QueuePage';
import DocumentationPage from './DocumentationPage';
import MedicationsPage from './MedicationsPage';
import WardSyncPage from './WardSyncPage';
import ChronosPage from './ChronosPage';
import type { Session } from '../queue/types';

const STAFF_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'queue', label: 'Queue Operations', icon: Users },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'medications', label: 'Medications', icon: Shield },
  { id: 'wardsync', label: 'WardSync', icon: RadioTower },
  { id: 'chronos', label: 'Chronos ICU', icon: Activity },
] as const;

type StaffShellProps = {
  session: Extract<Session, { role: 'staff' }>;
  onLogout: () => void;
  onSessionChange: (session: Session) => void;
};

type PanelId = (typeof STAFF_NAV_ITEMS)[number]['id'];

function panelFromLocation(): PanelId {
  const candidate = window.location.hash.slice(1);
  return STAFF_NAV_ITEMS.some((item) => item.id === candidate)
    ? (candidate as PanelId)
    : 'dashboard';
}

export default function StaffShell({
  session,
  onLogout,
  onSessionChange,
}: StaffShellProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(panelFromLocation);
  const staffInitials = session.staffName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navigatePanel = (panel: PanelId) => {
    setActivePanel(panel);
    window.location.hash = panel;
  };

  useEffect(() => {
    const restorePanel = () => setActivePanel(panelFromLocation());
    window.addEventListener('hashchange', restorePanel);
    window.addEventListener('popstate', restorePanel);
    return () => {
      window.removeEventListener('hashchange', restorePanel);
      window.removeEventListener('popstate', restorePanel);
    };
  }, []);

  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigatePanel} />;
      case 'queue':
        return (
          <QueuePage
            session={session}
            onLogout={onLogout}
            onSessionChange={onSessionChange}
          />
        );
      case 'documentation':
        return <DocumentationPage />;
      case 'medications':
        return <MedicationsPage session={session} />;
      case 'wardsync':
        return <WardSyncPage />;
      case 'chronos':
        return <ChronosPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  Sanctuary+
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                  Clinical Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                AI-Powered Hospital Operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                {staffInitials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">
                  {session.staffName}
                </p>
                <p className="text-[10px] text-teal-300 leading-tight">
                  {session.roleTitle ?? 'Operations Staff'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-200 border border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
              title="Log out of staff session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {STAFF_NAV_ITEMS.map((item) => {
              const isActive = activePanel === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigatePanel(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${isActive ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'text-teal-200' : 'text-slate-400'}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {renderPanel()}
      </main>
    </div>
  );
}
