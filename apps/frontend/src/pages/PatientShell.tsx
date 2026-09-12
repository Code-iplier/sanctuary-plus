import { useState } from 'react';
import { HeartPulse, LogOut } from 'lucide-react';
import QueuePage from './QueuePage';
import MedicationsPage from './MedicationsPage';
import type { Session } from '../queue/types';

type PatientShellProps = {
  session: Extract<Session, { role: 'patient' }>;
  onLogout: () => void;
  onSessionChange: (session: Session) => void;
};

export default function PatientShell({
  session,
  onLogout,
  onSessionChange,
}: PatientShellProps) {
  const [activePanel, setActivePanel] = useState<'queue' | 'medications'>('queue');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Sanctuary+</h1>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">Patient Portal</span>
              </div>
              <p className="text-xs text-slate-400">Live Hospital Queue & Token Tracker</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{session.name ?? 'Patient'}</span>
              <span className="text-[11px] text-slate-400">{session.phone ? `+91 ${session.phone}` : 'Verified'}</span>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {(['queue', 'medications'] as const).map((panel) => (
                <button key={panel} type="button" onClick={() => setActivePanel(panel)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activePanel === panel ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>
                  {panel === 'queue' ? 'Queue' : 'Medications'}
                </button>
              ))}
            </div>
            <button type="button" onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer">
              <LogOut className="h-3.5 w-3.5 text-slate-500" /> <span>Exit Portal</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activePanel === 'queue' ? (
          <QueuePage session={session} onLogout={onLogout} onSessionChange={onSessionChange} />
        ) : (
          <MedicationsPage session={session} />
        )}
      </main>
    </div>
  );
}
