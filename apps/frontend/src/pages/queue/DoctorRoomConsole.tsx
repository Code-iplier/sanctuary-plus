import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Play,
  CheckCircle2,
  AlertTriangle,
  UserX,
  FastForward,
  RotateCcw,
  Coffee,
  Clock,
  User,
  Activity,
  FileText,
} from 'lucide-react';
import {
  callNext,
  finishConsultation,
  markNoShow,
  recallPatient,
  skipTicket,
  startConsultation,
  updateDoctorStatus,
} from '../../queue/api';
import type {
  DoctorProfile,
  DoctorRoom,
  PatientTicket,
  QueueSnapshot,
} from '../../queue/types';

interface DoctorRoomConsoleProps {
  snapshot: QueueSnapshot;
  onRefresh?: () => void;
  session?: any;
}


export default function DoctorRoomConsole({ snapshot, onRefresh }: DoctorRoomConsoleProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(snapshot.rooms[0]?.id ?? 'room-gm-01');
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [consultNotes, setConsultNotes] = useState('');

  // 1-second tick for authoritative duration display
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const room = snapshot.rooms.find((r) => r.id === selectedRoomId);
  const doctor = snapshot.doctors.find(
    (d) => d.assignedRoomId === room?.id || d.id === room?.currentDoctorId
  );
  const dept = snapshot.departments.find((d) => d.id === room?.departmentId);

  // Tickets associated with this room
  const activeTicketInRoom = snapshot.tickets.find(
    (t) => t.assignedRoomId === room?.id && (t.status === 'CALLED' || t.status === 'IN_CONSULTATION')
  );

  // Next eligible ticket in this department queue (waiting)
  const nextWaitingInDept = snapshot.tickets.find(
    (t) => t.departmentId === room?.departmentId && t.status === 'WAITING'
  );

  // Authoritative duration
  const formatDuration = (startedAt?: string | null) => {
    if (!startedAt) return '00:00';
    const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCallNext = async () => {
    if (!room) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await callNext(room.id, doctor?.name ?? 'Doctor');
      onRefresh?.();
    } catch (err: any) {
      setActionError(err?.message ?? 'Unable to call next patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartConsult = async () => {
    if (!room) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await startConsultation(room.id, doctor?.name ?? 'Doctor');
      onRefresh?.();
    } catch (err: any) {
      setActionError(err?.message ?? 'Unable to start consultation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteConsult = async () => {
    if (!room) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await finishConsultation(room.id, consultNotes, doctor?.name ?? 'Doctor');
      setConsultNotes('');
      onRefresh?.();
    } catch (err: any) {
      setActionError(err?.message ?? 'Unable to complete consultation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async () => {
    if (!room) return;
    if (!confirm('Mark patient as No-Show?')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await markNoShow(room.id, 'Patient did not arrive within return window', doctor?.name ?? 'Doctor');
      onRefresh?.();
    } catch (err: any) {
      setActionError(err?.message ?? 'Unable to mark no-show.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async () => {
    if (!room) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await recallPatient(room.id, doctor?.name ?? 'Doctor');
      onRefresh?.();
    } catch (err: any) {
      setActionError(err?.message ?? 'Unable to recall patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!room) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await skipTicket(room.id, doctor?.name ?? 'Doctor');
      onRefresh?.();
    } catch (err: any) {
      setActionError(err?.message ?? 'Unable to skip ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBreak = async () => {
    if (!doctor) return;
    const nextStatus = doctor.status === 'ON_BREAK' ? 'AVAILABLE' : 'ON_BREAK';
    try {
      await updateDoctorStatus(doctor.id, nextStatus);
      onRefresh?.();
    } catch {
      alert('Unable to toggle break status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Room & Doctor Selector Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Consultation Room</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {dept?.name ?? 'OPD'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="text-lg font-bold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:border-teal-600 outline-none"
                >
                  {snapshot.rooms.map((r) => {
                    const d = snapshot.doctors.find((doc) => doc.assignedRoomId === r.id || doc.id === r.currentDoctorId);
                    return (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({d?.name ?? 'No Doctor Assigned'})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">{doctor?.name ?? 'Attending Physician'}</p>
              <span
                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  doctor?.status === 'IN_CONSULTATION'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : doctor?.status === 'CALLING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : doctor?.status === 'ON_BREAK'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {doctor?.status ?? 'AVAILABLE'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleBreak}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition cursor-pointer"
            >
              <Coffee className="h-3.5 w-3.5 text-slate-500" />
              <span>{doctor?.status === 'ON_BREAK' ? 'Resume Duty' : 'Take Break'}</span>
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Doctor Stage: 3 Possible Operational States */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Room Stage */}
        <div className="lg:col-span-2 space-y-4">
          {/* STATE A: PATIENT IN CONSULTATION */}
          {activeTicketInRoom?.status === 'IN_CONSULTATION' && (
            <div className="bg-white rounded-2xl border-2 border-teal-600 p-6 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
                  <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
                  Active Consultation
                </span>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-800 bg-slate-100 px-3 py-1 rounded-lg">
                  <Clock className="h-3.5 w-3.5 text-teal-600" />
                  <span>Duration: {formatDuration(activeTicketInRoom.consultationStartedAt)}</span>
                </div>
              </div>

              <div className="my-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-3xl font-black text-slate-900">{activeTicketInRoom.tokenNumber}</h2>
                  <span className="text-sm font-semibold text-slate-700">{activeTicketInRoom.patientName}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>Shared ID: <strong className="font-mono text-slate-700">{activeTicketInRoom.patientId}</strong></span>
                  <span>&bull;</span>
                  <span>Visit: {activeTicketInRoom.visitType}</span>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Chief Complaint</p>
                  <p className="text-sm text-slate-800 mt-1">{activeTicketInRoom.reason}</p>
                </div>
              </div>

              {/* Consultation Notes */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Clinical Handover Notes / Rx Summary
                </label>
                <textarea
                  value={consultNotes}
                  onChange={(e) => setConsultNotes(e.target.value)}
                  placeholder="Record prescription summary, discharge notes, or bed admission orders..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-teal-600 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  Authoritative End Timestamp recorded on complete
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCompleteConsult}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Complete Consultation</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE B: PATIENT CALLED & AWAITING ARRIVAL */}
          {activeTicketInRoom?.status === 'CALLED' && (
            <div className="bg-white rounded-2xl border border-amber-300 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider border border-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  Called &mdash; Waiting for Patient to Enter Room
                </span>
                <span className="text-xs text-slate-400">
                  Called at {new Date(activeTicketInRoom.calledAt ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="my-5 text-center">
                <h2 className="text-4xl font-black text-slate-900">{activeTicketInRoom.tokenNumber}</h2>
                <p className="text-base font-bold text-slate-800 mt-1">{activeTicketInRoom.patientName}</p>
                <p className="text-xs text-slate-400">ID: {activeTicketInRoom.patientId} &bull; {activeTicketInRoom.reason}</p>
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 max-w-sm mx-auto mt-3">
                  Patient phone and Lobby TV board have received the room announcement.
                </p>
              </div>

              <div className="grid sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleStartConsult}
                  className="sm:col-span-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Consultation (Patient Arrived)</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRecall}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Recall</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleNoShow}
                  className="py-2.5 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5 text-rose-500" />
                  <span>No-Show</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE C: ROOM AVAILABLE — READY TO CALL NEXT */}
          {!activeTicketInRoom && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Room {room?.roomNumber} is Available</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Consulting Physician is ready. Click below to atomically call the highest-priority waiting patient in the {dept?.name} queue.
              </p>

              {nextWaitingInDept ? (
                <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Next Eligible Patient</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        nextWaitingInDept.triageLevel === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {nextWaitingInDept.triageLevel}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{nextWaitingInDept.tokenNumber}</p>
                  <p className="text-xs text-slate-700 font-semibold">{nextWaitingInDept.patientName}</p>
                  <p className="text-xs text-slate-400 truncate">{nextWaitingInDept.reason}</p>
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 max-w-sm mx-auto text-xs text-slate-400">
                  No patients currently waiting in {dept?.name} queue.
                </div>
              )}

              <button
                type="button"
                disabled={actionLoading || !nextWaitingInDept || doctor?.status === 'ON_BREAK'}
                onClick={handleCallNext}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-700/20 inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-40"
              >
                <Play className="h-4 w-4" />
                <span>Call Next Patient</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Col: Department Queue Real-Time Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{dept?.name} Queue</h3>
              <p className="text-xs text-slate-400">Live priority order</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {snapshot.tickets.filter((t) => t.departmentId === room?.departmentId && t.status === 'WAITING').length} waiting
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {snapshot.tickets
              .filter((t) => t.departmentId === room?.departmentId && t.status === 'WAITING')
              .map((t, idx) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-start justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{t.tokenNumber}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          t.triageLevel === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {t.triageLevel}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 mt-0.5">{t.patientName}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{t.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">#{idx + 1}</span>
                    <p className="text-[10px] text-teal-700 font-semibold">~{t.estimatedWaitMinutes}m</p>
                  </div>
                </div>
              ))}
            {snapshot.tickets.filter((t) => t.departmentId === room?.departmentId && t.status === 'WAITING').length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">Queue is currently clear.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
