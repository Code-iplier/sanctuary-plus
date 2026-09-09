import React from 'react';
import {
  Activity,
  Users,
  Clock,
  Building2,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { updateRoomStatus } from '../../queue/api';
import type { DepartmentMetrics, QueueSnapshot } from '../../queue/types';

interface QueueHealthDashboardProps {
  snapshot: QueueSnapshot;
  onRefresh?: () => void;
}

export default function QueueHealthDashboard({ snapshot, onRefresh }: QueueHealthDashboardProps) {
  const totalWaiting = snapshot.metrics.reduce((acc, m) => acc + m.waitingCount, 0);
  const totalConsulting = snapshot.metrics.reduce((acc, m) => acc + m.consultingCount, 0);
  const totalActiveDoctors = snapshot.metrics.reduce((acc, m) => acc + m.activeDoctors, 0);
  const totalRoomsAvailable = snapshot.rooms.filter((r) => r.status === 'AVAILABLE').length;

  const handleToggleRoomStatus = async (roomId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'CLOSED' : 'AVAILABLE';
    try {
      await updateRoomStatus(roomId, nextStatus as any);
      onRefresh?.();
    } catch {
      alert('Unable to toggle room status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top High-Level Operational Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Waiting</span>
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{totalWaiting}</p>
          <p className="text-[11px] text-slate-400 mt-1">Across all 5 OPD departments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Consultation</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{totalConsulting}</p>
          <p className="text-[11px] text-slate-400 mt-1">Patients actively with physicians</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Physicians</span>
            <Stethoscope className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{totalActiveDoctors}</p>
          <p className="text-[11px] text-slate-400 mt-1">Available or consulting on duty</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Rooms</span>
            <Building2 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{totalRoomsAvailable}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ready for next patient intake</p>
        </div>
      </div>

      {/* Department Congestion & Capacity Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Departmental Congestion & Queue Pressure</h3>
            <p className="text-xs text-slate-500">Live capacity analysis, wait time distributions, and pressure indices</p>
          </div>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Auto-recalculating
          </span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshot.metrics.map((m) => {
            const pressureBg =
              m.queuePressure === 'HIGH'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : m.queuePressure === 'MODERATE'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800';

            return (
              <div
                key={m.departmentId}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      {m.departmentCode}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pressureBg}`}>
                      PRESSURE: {m.queuePressure}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{m.departmentName}</h4>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">WAITING</span>
                      <span className="text-lg font-bold text-slate-900">{m.waitingCount}</span>
                      {m.urgentWaitingCount > 0 && (
                        <span className="text-[10px] text-rose-600 block font-semibold">
                          ({m.urgentWaitingCount} Urgent)
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">AVG WAIT</span>
                      <span className="text-lg font-bold text-teal-700">~{m.averageWaitMinutes}m</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">ACTIVE DOCTORS</span>
                      <span className="text-sm font-bold text-slate-800">{m.activeDoctors}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">LONGEST WAIT</span>
                      <span className="text-sm font-bold text-slate-800">{m.longestWaitMinutes}m</span>
                    </div>
                  </div>
                </div>

                {/* Overload Recommendation */}
                {m.queuePressure === 'HIGH' && (
                  <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>High congestion detected. Consider opening an additional consultation room.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Doctor Rooms Capacity Management & WOW Moment 2 simulation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Consultation Rooms & Staffing Roster</h3>
            <p className="text-xs text-slate-500">Toggle room availability to observe dynamic queue pressure recalculation</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {snapshot.rooms.length} Rooms Configured
          </span>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {snapshot.rooms.map((r) => {
            const doc = snapshot.doctors.find((d) => d.assignedRoomId === r.id || d.id === r.currentDoctorId);
            const dept = snapshot.departments.find((d) => d.id === r.departmentId);
            return (
              <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Room {r.roomNumber}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        r.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'OCCUPIED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{doc?.name ?? 'No Doctor'}</p>
                  <p className="text-[10px] text-slate-400">{dept?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleRoomStatus(r.id, r.status)}
                  className="mt-3 w-full py-1 rounded-lg border border-slate-200 hover:bg-white text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                >
                  {r.status === 'AVAILABLE' ? 'Close Room' : 'Open Room'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
