import React, { useState } from 'react';
import {
  UserPlus,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { issueTicket, triageTicket, updatePriority } from '../../queue/api';
import type {
  Department,
  PatientTicket,
  QueueSnapshot,
  TriageLevel,
  VisitType,
} from '../../queue/types';

interface ReceptionTriageConsoleProps {
  snapshot: QueueSnapshot;
  onRefresh?: () => void;
}

export default function ReceptionTriageConsole({ snapshot, onRefresh }: ReceptionTriageConsoleProps) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [triagingTicket, setTriagingTicket] = useState<PatientTicket | null>(null);

  // Walk-in form state
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInDeptId, setWalkInDeptId] = useState(snapshot.departments[0]?.id ?? 'dept-gm');
  const [walkInVisitType, setWalkInVisitType] = useState<VisitType>('NEW');
  const [walkInReason, setWalkInReason] = useState('');
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  // Triage modal state
  const [triageLevel, setTriageLevel] = useState<TriageLevel>('NORMAL');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [submittingTriage, setSubmittingTriage] = useState(false);

  // Priority adjustment modal
  const [priorityModalTicket, setPriorityModalTicket] = useState<PatientTicket | null>(null);
  const [newPriority, setNewPriority] = useState<TriageLevel>('URGENT');
  const [priorityReason, setPriorityReason] = useState('');
  const [submittingPriority, setSubmittingPriority] = useState(false);

  // Filtered tickets
  const pendingTriage = snapshot.tickets.filter((t) => t.status === 'TRIAGE_PENDING');

  const activeTickets = snapshot.tickets.filter((t) => {
    if (selectedDeptId !== 'all' && t.departmentId !== selectedDeptId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.tokenNumber.toLowerCase().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.patientPhone.includes(q) ||
        t.patientId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !walkInPhone.trim()) return;
    setSubmittingWalkIn(true);
    try {
      await issueTicket({
        patientId: `PAT-${String(Date.now()).slice(-6)}`,
        patientName: walkInName.trim(),
        patientPhone: walkInPhone.trim(),
        departmentId: walkInDeptId,
        visitType: walkInVisitType,
        reason: walkInReason.trim() || 'OPD Walk-in consultation',
      });
      setShowWalkInModal(false);
      setWalkInName('');
      setWalkInPhone('');
      setWalkInReason('');
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to issue walk-in token.');
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triagingTicket) return;
    setSubmittingTriage(true);
    try {
      await triageTicket(triagingTicket.id, {
        triageLevel,
        vitals: { bp, pulse, temp, spo2 },
        triageNotes,
        actor: 'Reception Triage Nurse',
      });
      setTriagingTicket(null);
      setBp('');
      setPulse('');
      setTemp('');
      setSpo2('');
      setTriageNotes('');
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to complete triage.');
    } finally {
      setSubmittingTriage(false);
    }
  };

  const handlePrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityModalTicket) return;
    if (!priorityReason.trim()) {
      alert('Reason is required to adjust patient priority.');
      return;
    }
    setSubmittingPriority(true);
    try {
      await updatePriority(priorityModalTicket.id, newPriority, priorityReason, 'Reception Desk');
      setPriorityModalTicket(null);
      setPriorityReason('');
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to adjust priority.');
    } finally {
      setSubmittingPriority(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">OPD Reception & Triage Desk</h2>
          <p className="text-xs text-slate-500">Walk-in token generation, vitals evaluation & priority routing</p>
        </div>
        <button
          type="button"
          onClick={() => setShowWalkInModal(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Issue Walk-In Token</span>
        </button>
      </div>

      {/* Pending Triage Staging Section */}
      {pendingTriage.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">
                Pending Triage ({pendingTriage.length})
              </h3>
            </div>
            <span className="text-xs text-amber-700 font-medium">
              Vitals & priority required before queue admission
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingTriage.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-900 text-sm">{t.tokenNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Triage Pending
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{t.patientName}</p>
                  <p className="text-[11px] text-teal-700 font-medium">{t.departmentName}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTriagingTicket(t);
                    setTriageLevel('NORMAL');
                  }}
                  className="mt-3 w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <HeartPulse className="h-3.5 w-3.5" />
                  <span>Perform Triage & Admit</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Department Queues Table with Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          {/* Department Filter Tabs */}
          <div className="flex space-x-1 overflow-x-auto py-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedDeptId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                selectedDeptId === 'all'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Departments ({snapshot.tickets.length})
            </button>
            {snapshot.departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDeptId(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  selectedDeptId === d.id
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d.name} ({snapshot.tickets.filter((t) => t.departmentId === d.id).length})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token, name, phone..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Patient & ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Wait / Room</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                    {t.tokenNumber}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{t.patientName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{t.patientId} &bull; +91 {t.patientPhone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{t.departmentName}</span>
                    <p className="text-[10px] text-slate-400">{t.visitType}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.triageLevel === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : t.triageLevel === 'NORMAL'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {t.triageLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'CALLED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : t.status === 'IN_CONSULTATION'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : t.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {t.status === 'WAITING' ? (
                      <span>{t.patientsAhead} ahead (~{t.estimatedWaitMinutes}m)</span>
                    ) : t.assignedRoomNumber ? (
                      <span className="font-semibold text-slate-900">Room {t.assignedRoomNumber}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {t.status === 'WAITING' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityModalTicket(t);
                          setNewPriority(t.triageLevel === 'URGENT' ? 'NORMAL' : 'URGENT');
                        }}
                        className="text-teal-700 hover:text-teal-900 font-semibold hover:underline cursor-pointer"
                      >
                        Adjust Priority
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeTickets.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">No tickets matching the filter.</div>
          )}
        </div>
      </div>

      {/* WALK-IN REGISTRATION MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Issue Walk-In OPD Token</h3>
            <p className="text-xs text-slate-500 mb-4">Register an in-person patient arrival at the reception desk.</p>
            <form onSubmit={handleWalkInSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department *</label>
                <select
                  value={walkInDeptId}
                  onChange={(e) => setWalkInDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none"
                >
                  {snapshot.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chief Reason *</label>
                <input
                  type="text"
                  required
                  value={walkInReason}
                  onChange={(e) => setWalkInReason(e.target.value)}
                  placeholder="e.g. High fever, knee pain"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWalkIn}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {submittingWalkIn ? 'Issuing...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRIAGE MODAL */}
      {triagingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Clinical Triage Assessment &mdash; {triagingTicket.tokenNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Patient: <strong>{triagingTicket.patientName}</strong> &bull; Dept: {triagingTicket.departmentName}
            </p>

            <form onSubmit={handleTriageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Assign Triage Priority *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'URGENT', label: 'Urgent Priority', desc: 'High acuity' },
                    { id: 'NORMAL', label: 'Normal', desc: 'Routine OPD' },
                    { id: 'FOLLOW_UP', label: 'Follow-up', desc: 'Report review' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setTriageLevel(lvl.id as TriageLevel)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        triageLevel === lvl.id
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs">{lvl.label}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Basic Vitals (Optional)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="BP (120/80)"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50"
                  />
                  <input
                    type="text"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="Pulse (bpm)"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50"
                  />
                  <input
                    type="text"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    placeholder="Temp (°F)"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50"
                  />
                  <input
                    type="text"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="SpO2 (%)"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Triage Notes
                </label>
                <textarea
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Notes on patient state, alert reason, or doctor instructions..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTriagingTicket(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTriage}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {submittingTriage ? 'Admitting...' : 'Admit to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRIORITY ADJUSTMENT AUDIT MODAL */}
      {priorityModalTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adjust Queue Priority &mdash; {priorityModalTicket.tokenNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Current priority: <strong className="text-slate-800">{priorityModalTicket.triageLevel}</strong>
            </p>

            <form onSubmit={handlePrioritySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Priority Level *</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TriageLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none"
                >
                  <option value="URGENT">URGENT</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="FOLLOW_UP">FOLLOW_UP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="Explain reason for priority override (e.g. symptoms worsened, elderly patient)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPriorityModalTicket(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPriority}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {submittingPriority ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
