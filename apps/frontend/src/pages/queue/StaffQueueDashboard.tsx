import React, { useState } from 'react';
import { QueueSnapshot, Session } from '../../queue/types';
import DoctorRoomConsole from './DoctorRoomConsole';
import ReceptionTriageConsole from './ReceptionTriageConsole';
import QueueHealthDashboard from './QueueHealthDashboard';
import LobbyDisplayBoard from './LobbyDisplayBoard';
import { Stethoscope, ClipboardList, Activity, Tv, RefreshCw, ShieldCheck } from 'lucide-react';

interface StaffQueueDashboardProps {
  session: Session;
  snapshot: QueueSnapshot;
  onRefresh: () => void;
}

export const StaffQueueDashboard: React.FC<StaffQueueDashboardProps> = ({ session, snapshot, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'doctor' | 'reception' | 'health' | 'tv'>('doctor');

  const displayName = (session as any)?.staffName || (session as any)?.name || 'Operations Staff';
  const roleTitle = (session as any)?.roleTitle || (session?.role === 'staff' ? 'Staff' : 'User');

  return (
    <div className="space-y-6">
      {/* Staff Header & Quick Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hospital Queue & OPD Command Center</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Live Operations
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Staff: <strong className="text-slate-700 dark:text-slate-200">{displayName}</strong> • Role: <span className="capitalize">{roleTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
              title="Refresh queue data"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setActiveTab('doctor')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'doctor'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Consultation Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('reception')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'reception'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Reception & Triage Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'health'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Queue Pressure & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'tv'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Lobby TV Display View</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'doctor' && (
          <DoctorRoomConsole session={session} snapshot={snapshot} onRefresh={onRefresh} />
        )}
        {activeTab === 'reception' && (
          <ReceptionTriageConsole snapshot={snapshot} onRefresh={onRefresh} />
        )}
        {activeTab === 'health' && (
          <QueueHealthDashboard snapshot={snapshot} onRefresh={onRefresh} />
        )}
        {activeTab === 'tv' && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <LobbyDisplayBoard snapshot={snapshot} />
          </div>
        )}
      </div>
    </div>
  );
};
export default StaffQueueDashboard;
