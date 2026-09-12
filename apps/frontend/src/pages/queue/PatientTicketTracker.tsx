import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Building2,
  Volume2,
  Wifi,
  ArrowRight,
  RefreshCw,
  XCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { isApproaching, type PatientTicket, type QueuePolicy } from '../../queue/types';
import { cancelTicket } from '../../queue/api';

interface PatientTicketTrackerProps {
  ticket: PatientTicket;
  policy: QueuePolicy;
  onBookAnother?: () => void;
  onTicketCancelled?: () => void;
}

export default function PatientTicketTracker({
  ticket,
  policy,
  onBookAnother,
  onTicketCancelled,
}: PatientTicketTrackerProps) {
  const [now, setNow] = useState(Date.now());
  const [isCancelling, setIsCancelling] = useState(false);

  // 1-second tick for live consultation timer and relative times
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const approaching = isApproaching(ticket, policy.approachingThreshold);

  // Authoritative duration calculation: currentTime - consultationStartedAt
  const formatDuration = (startedAt?: string | null) => {
    if (!startedAt) return '00:00';
    const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your queue ticket?')) return;
    setIsCancelling(true);
    try {
      await cancelTicket(ticket.id, 'Cancelled by patient');
      onTicketCancelled?.();
    } catch {
      alert('Unable to cancel ticket.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 1. Approaching Turn Derived Alert */}
      {approaching && ticket.status === 'WAITING' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-amber-100">Your Turn Is Approaching</p>
              <h3 className="text-base font-bold">
                {ticket.patientsAhead === 0
                  ? 'You are next in line!'
                  : `${ticket.patientsAhead} patient${(ticket.patientsAhead ?? 0) > 1 ? 's' : ''} ahead`}
              </h3>
              <p className="text-xs text-amber-100">Please proceed towards the {ticket.departmentName} waiting area.</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-amber-800">
            Near Room
          </span>
        </div>
      )}

      {/* 2. CALLED State Callout */}
      {ticket.status === 'CALLED' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl shadow-teal-700/25 border border-teal-400/30">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              Now Calling You
            </span>
            <span className="text-xs text-teal-100">Please report within 5 minutes</span>
          </div>
          <div className="text-center py-2">
            <h2 className="text-3xl font-black tracking-tight">{ticket.tokenNumber}</h2>
            <div className="mt-3 p-3 bg-white/10 rounded-xl inline-block text-left">
              <p className="text-xs text-teal-200">Consultation Location:</p>
              <p className="text-lg font-bold text-white">
                Room {ticket.assignedRoomNumber ?? 'OPD Room'} &bull; {ticket.assignedDoctorName ?? 'Attending Doctor'}
              </p>
            </div>
          </div>
          <p className="text-center text-xs text-teal-100 mt-3">
            Please knock and enter {ticket.assignedRoomNumber ?? 'the consultation room'}.
          </p>
        </div>
      )}

      {/* 3. IN_CONSULTATION State Callout */}
      {ticket.status === 'IN_CONSULTATION' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-800 to-slate-900 text-white shadow-xl border border-teal-500/20 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            In Consultation
          </span>
          <h2 className="text-2xl font-bold">{ticket.tokenNumber}</h2>
          <p className="text-sm text-slate-300 mt-1">
            Room {ticket.assignedRoomNumber} &bull; {ticket.assignedDoctorName}
          </p>
          <div className="mt-4 p-3 bg-white/5 rounded-xl max-w-xs mx-auto">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Consultation Duration</p>
            <p className="text-2xl font-mono font-bold text-teal-300 mt-0.5">
              {formatDuration(ticket.consultationStartedAt)}
            </p>
          </div>
        </div>
      )}

      {/* 4. COMPLETED State Callout */}
      {ticket.status === 'COMPLETED' && (
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Consultation Completed</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your visit with {ticket.assignedDoctorName ?? 'the doctor'} has been recorded.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left text-xs max-w-md mx-auto space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Token Number:</span>
              <span className="font-bold text-slate-900">{ticket.tokenNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-900">{ticket.departmentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prescription / Orders:</span>
              <span className="font-semibold text-teal-700">Forwarded to Pharmacy / Diagnostics</span>
            </div>
          </div>
          {onBookAnother && (
            <button
              type="button"
              onClick={onBookAnother}
              className="mt-5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Book Another OPD Visit
            </button>
          )}
        </div>
      )}

      {/* 5. Main Ticket Card (When Waiting or Triage Pending) */}
      {ticket.status !== 'COMPLETED' && ticket.status !== 'CALLED' && ticket.status !== 'IN_CONSULTATION' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
          {/* Top connection badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span>Live Queue Sync Active</span>
            </div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                ticket.status === 'TRIAGE_PENDING'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}
            >
              {ticket.status === 'TRIAGE_PENDING' ? 'Triage Pending' : 'Waiting in Queue'}
            </span>
          </div>

          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Your OPD Token</p>
          <h1 className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tight leading-none my-3">
            {ticket.tokenNumber}
          </h1>
          <p className="text-sm font-semibold text-slate-700">{ticket.departmentName}</p>
          <p className="text-xs text-slate-400">{ticket.reason}</p>

          {/* Metrics Trio (Ahead, ETA, Status) */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 mt-6">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">
                {ticket.status === 'TRIAGE_PENDING' ? '—' : ticket.patientsAhead ?? 0}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Patients Ahead</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-teal-700">
                {ticket.status === 'TRIAGE_PENDING' ? '—' : `~${ticket.estimatedWaitMinutes ?? 15}m`}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Estimated Wait</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-sm font-bold text-slate-800 pt-1">
                {ticket.status === 'TRIAGE_PENDING' ? 'Desk Check-in' : 'Normal Wait'}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Status</p>
            </div>
          </div>

          {/* Remote Waiting Guidance */}
          <div className="mt-5 p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl text-left flex items-start gap-3">
            <MapPin className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Remote Waiting Active:</strong> You do not need to stand in line. You may wait in the waiting lounge or cafeteria. This screen updates live and will alert you when you reach the approaching turn threshold.
            </p>
          </div>

          {/* Cancellation Option */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
            <span>Patient ID: <strong className="font-mono text-slate-700">{ticket.patientId}</strong></span>
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleCancel}
              className="text-rose-600 hover:text-rose-800 hover:underline font-semibold cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Token'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
