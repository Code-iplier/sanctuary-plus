import React, { useState, useEffect } from 'react';
import { QueueSnapshot, Session, PatientTicket } from '../queue/types';
import { subscribeQueue, fetchBootstrap, connectRealtime, fetchSnapshot } from '../queue/api';
import PatientNewTokenWizard from './queue/PatientNewTokenWizard';
import PatientTicketTracker from './queue/PatientTicketTracker';
import StaffQueueDashboard from './queue/StaffQueueDashboard';
import { Loader2, PlusCircle, History, AlertCircle } from 'lucide-react';

interface QueuePageProps {
  session: any;
  onLogout?: () => void;
  onSessionChange?: (s: any) => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({ session, onLogout }) => {
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [patientViewMode, setPatientViewMode] = useState<'active' | 'create' | 'history'>('active');

  // Normalize session to conform to queue domain
  const isPatient = session?.role === 'patient';
  const normalizedSession: Session = isPatient
    ? {
        role: 'patient',
        patientId: session?.patientId || session?.id || 'PAT-000101',
        name: session?.name || 'Patient',
        phone: session?.phone || '9000011111',
      }
    : {
        role: 'staff',
        staffId: session?.username || session?.staffId || 'staff-1',
        staffName: session?.staffName || session?.name || 'Staff Member',
        name: session?.staffName || session?.name || 'Staff Member',
        roleTitle: session?.roleTitle || 'Operations Staff',
      };

  useEffect(() => {
    let isMounted = true;

    // 1. Subscribe to reactive local state updates
    const unsubscribe = subscribeQueue((newSnap: QueueSnapshot) => {
      if (isMounted) {
        setSnapshot(newSnap);
        setLoading(false);
      }
    });

    // 2. Initial bootstrap load from backend or local fallback
    fetchBootstrap()
      .then((snap: any) => {
        if (isMounted) {
          setSnapshot(snap);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        console.warn('Backend bootstrap offline, using reactive store:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    // 3. Connect real-time WebSocket
    const cleanupSocket = connectRealtime((liveSnap: QueueSnapshot) => {
      if (isMounted && liveSnap) {
        setSnapshot(liveSnap);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (typeof cleanupSocket === 'function') {
        cleanupSocket();
      }
    };
  }, []);

  const handleManualRefresh = async () => {
    try {
      const snap = await fetchSnapshot();
      setSnapshot(snap);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  if (loading && !snapshot) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-sm text-slate-500 font-medium">Connecting to Hospital Queue Network...</p>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-center gap-3">
        <AlertCircle className="w-6 h-6 shrink-0 text-rose-500" />
        <div>
          <p className="font-semibold">Queue Network Connection Issue</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const currentSnapshot = snapshot!;

  /* ========================================================================
   * 1. PATIENT INTERFACE
   * ======================================================================== */
  if (normalizedSession && normalizedSession.role === 'patient') {
    const patientId = (normalizedSession as any).patientId;
    const allPatientTickets: PatientTicket[] = (currentSnapshot.tickets || []).filter(
      (t) => t.patientId === patientId
    );

    // Active ticket is one that is not terminal
    const activeTicket = allPatientTickets.find(
      (t) => !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status)
    );

    const pastTickets = allPatientTickets.filter((t) =>
      ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status)
    );

    return (
      <div className="space-y-6">
        {/* Patient Sub-navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPatientViewMode('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                patientViewMode === 'active'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Live Token Tracker {activeTicket && '• (1 Active)'}
            </button>

            {!activeTicket && (
              <button
                onClick={() => setPatientViewMode('create')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  patientViewMode === 'create'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Consultation Token</span>
              </button>
            )}

            {pastTickets.length > 0 && (
              <button
                onClick={() => setPatientViewMode('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  patientViewMode === 'history'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({pastTickets.length})</span>
              </button>
            )}
          </div>

          <div className="max-w-full truncate text-xs text-slate-400">
            Hospital System ID: <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{patientId}</span>
          </div>
        </div>

        {/* 1. Active Ticket View */}
        {patientViewMode === 'active' && (
          <div>
            {activeTicket ? (
              <PatientTicketTracker
                ticket={activeTicket}
                policy={currentSnapshot.policy}
                onBookAnother={() => setPatientViewMode('create')}
                onTicketCancelled={handleManualRefresh}
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-4 font-bold">
                  <PlusCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active OPD Token Found</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  You do not currently have an active consultation ticket in queue. Select an OPD department below to generate a new queue token.
                </p>
                <button
                  onClick={() => setPatientViewMode('create')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Generate OPD Queue Token</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Create Token Wizard */}
        {patientViewMode === 'create' && (
          <div>
            {activeTicket ? (
              <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-300 text-sm">
                You already have an active ticket (<strong className="font-mono">{activeTicket.tokenNumber}</strong>) in progress. Please complete or cancel your current consultation before generating a new one.
                <button
                  onClick={() => setPatientViewMode('active')}
                  className="block mt-2 font-semibold underline cursor-pointer"
                >
                  Return to Active Ticket
                </button>
              </div>
            ) : (
              <PatientNewTokenWizard
                patientId={(normalizedSession as any).patientId}
                patientName={(normalizedSession as any).name || 'Patient'}
                patientPhone={(normalizedSession as any).phone || '9000011111'}
                departments={currentSnapshot.departments}
                onTokenCreated={(_newTicket: PatientTicket) => {
                  setPatientViewMode('active');
                  handleManualRefresh();
                }}
                onCancel={() => setPatientViewMode('active')}
              />
            )}
          </div>
        )}

        {/* 3. Ticket History */}
        {patientViewMode === 'history' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Past Consultation History</h3>
            {pastTickets.length === 0 ? (
              <p className="text-sm text-slate-500">No past visits recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pastTickets.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{t.tokenNumber}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {t.departmentName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(t.createdAt).toLocaleDateString()} at {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Notes: {t.triageNotes || t.reason || 'OPD Consultation'}
                      </p>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      t.status === 'CANCELLED' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ========================================================================
   * 2. STAFF INTERFACE
   * ======================================================================== */
  return (
    <StaffQueueDashboard
      session={normalizedSession}
      snapshot={currentSnapshot}
      onRefresh={handleManualRefresh}
    />
  );
};
export default QueuePage;
