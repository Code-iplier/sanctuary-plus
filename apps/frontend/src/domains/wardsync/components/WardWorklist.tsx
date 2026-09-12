import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, ProgressBar } from '@heroui/react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  History,
  ShieldAlert,
  Usb,
} from 'lucide-react';
import {
  type Dashboard,
  formatEventDateTime,
  formatMinutesAge,
  TREND_COLOR,
} from '../model/types';

interface WardWorklistProps {
  dashboard: Dashboard | null;
  onSelectPatient: (patientId: string) => void;
}

export default function WardWorklist({
  dashboard,
  onSelectPatient,
}: WardWorklistProps) {
  const [worklistFilter, setWorklistFilter] = useState<'all' | 'high' | 'device' | 'overdue'>('all');
  const [showAuditLog, setShowAuditLog] = useState(false);

  const worklist = useMemo(() => {
    const raw = dashboard?.recheckPriority ?? [];
    if (worklistFilter === 'all') return raw;
    if (worklistFilter === 'high') {
      return raw.filter(
        (item) => item.priority >= 0.7 || item.trend === 'RISING' || item.totalScore >= 5,
      );
    }
    if (worklistFilter === 'device') {
      const reviewDuePatientIds = new Set(
        (dashboard?.reviewDueDevices ?? []).map((d) => d.patientId),
      );
      return raw.filter((item) => reviewDuePatientIds.has(item.patientId));
    }
    if (worklistFilter === 'overdue') {
      return raw.filter((item) => item.lastObservationAgeMinutes >= 90);
    }
    return raw;
  }, [dashboard, worklistFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard
          icon={ShieldAlert}
          label="Combined Deterioration Flags"
          value={dashboard?.openFlags.length ?? 0}
          color="danger"
          subtitle="Device + Physiology convergence"
        />
        <MetricCard
          icon={Usb}
          label="Invasive Devices Due Review"
          value={dashboard?.reviewDueDevices.length ?? 0}
          color="warning"
          subtitle="Catheters, IVs, Central lines"
        />
        <MetricCard
          icon={Activity}
          label="Rising NEWS2 Trajectories"
          value={dashboard?.risingTrends.length ?? 0}
          color="accent"
          subtitle="Acute deterioration signal"
        />
      </div>

      {/* Filter Chips & Audit Trail Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Filter Ward:
          </span>
          <Button
            size="sm"
            variant={worklistFilter === 'all' ? 'primary' : 'outline'}
            onPress={() => setWorklistFilter('all')}
          >
            All Beds ({dashboard?.recheckPriority.length ?? 0})
          </Button>
          <Button
            size="sm"
            variant={worklistFilter === 'high' ? 'primary' : 'outline'}
            onPress={() => setWorklistFilter('high')}
          >
            High Priority / Rising
          </Button>
          <Button
            size="sm"
            variant={worklistFilter === 'device' ? 'primary' : 'outline'}
            onPress={() => setWorklistFilter('device')}
          >
            Review-Due Devices
          </Button>
          <Button
            size="sm"
            variant={worklistFilter === 'overdue' ? 'primary' : 'outline'}
            onPress={() => setWorklistFilter('overdue')}
          >
            Overdue Observations (&gt;90m)
          </Button>
        </div>

        <Button
          size="sm"
          variant={showAuditLog ? 'primary' : 'outline'}
          onPress={() => setShowAuditLog(!showAuditLog)}
          className="ml-auto flex items-center gap-1.5"
        >
          <History size={14} />
          <span>Ward Activity Audit ({dashboard?.auditTrail?.length ?? 0})</span>
          {showAuditLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {/* Collapsible Ward Audit Trail */}
      {showAuditLog && (
        <Card className="p-4 bg-slate-50/70 border border-slate-200">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-slate-600" />
                Ward Activity Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological log of clinical interventions, vital records, device reviews, and safety alerts.
              </p>
            </div>
            <Badge color="default" variant="soft" className="text-xs font-mono">
              {dashboard?.auditTrail?.length ?? 0} Recorded Actions
            </Badge>
          </div>

          {!dashboard?.auditTrail?.length ? (
            <p className="text-xs text-slate-400 py-3 text-center italic">
              No audit events recorded yet.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {[...dashboard.auditTrail]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((event) => {
                  const patient = dashboard.patients?.find((p) => p.id === event.patientId);
                  const isDevice = event.action.includes('DEVICE');
                  const isConnection = event.action.includes('CONNECTION');
                  const isVital = event.action.includes('VITAL');

                  const badgeColor: 'danger' | 'warning' | 'accent' | 'success' | 'default' =
                    event.action === 'FLAG_RAISED'
                      ? 'danger'
                      : event.action === 'FLAG_RESOLVED'
                      ? 'success'
                      : isDevice
                      ? 'warning'
                      : isConnection
                      ? 'accent'
                      : isVital
                      ? 'accent'
                      : 'default';

                  return (
                    <div
                      key={event.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/60 shadow-xs hover:border-slate-300 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge color={badgeColor} variant="soft" className="font-mono text-[10px] px-1.5 py-0.5">
                          {event.action}
                        </Badge>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {formatEventDateTime(event.timestamp)}
                        </span>
                        {event.patientId && (
                          <span className="font-medium text-slate-700">
                            {patient ? `${patient.name} (Bed ${patient.bed})` : event.patientId}
                          </span>
                        )}
                      </div>

                      {event.patientId && (
                        <div className="flex items-center gap-2 sm:ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2"
                            onPress={() => onSelectPatient(event.patientId!)}
                          >
                            <Eye size={12} className="mr-1" /> Jump to Bed
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {/* Ward Triage Table */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="p-3">Patient &amp; Bed</th>
              <th className="p-3">Current NEWS2</th>
              <th className="p-3">Observation Freshness</th>
              <th className="p-3">Invasive Devices Status</th>
              <th className="p-3">Priority Radar</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {worklist.map((item) => {
              const patientDevices = (dashboard?.reviewDueDevices ?? []).filter(
                (d) => d.patientId === item.patientId,
              );
              const hasFlag = (dashboard?.openFlags ?? []).some(
                (f) => f.patientId === item.patientId,
              );

              return (
                <tr
                  key={item.patientId}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="p-3">
                    <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                      {item.name}
                      {hasFlag && (
                        <Badge color="danger" variant="primary" className="text-[10px] px-1 py-0.5">
                          FLAG
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.patientId} · Bed {item.bed}
                    </p>
                  </td>
                  <td className="p-3">
                    <Badge color={TREND_COLOR[item.trend]} variant="soft">
                      NEWS2 {item.totalScore} · {item.trend}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} className="text-gray-400" />
                      {formatMinutesAge(item.lastObservationAgeMinutes)}
                    </span>
                  </td>
                  <td className="p-3">
                    {patientDevices.length > 0 ? (
                      <Badge color="warning" variant="soft">
                        {patientDevices.length} device review due
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">Normal</span>
                    )}
                  </td>
                  <td className="p-3 w-44">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        className="flex-1"
                        value={Math.min(item.priority, 2) * 50}
                        maxValue={100}
                        color={item.priority >= 1.0 ? 'danger' : item.priority >= 0.5 ? 'warning' : 'default'}
                      />
                      <span className="text-xs font-mono font-medium text-gray-600">
                        {item.priority}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => onSelectPatient(item.patientId)}
                    >
                      <Eye size={14} /> Review Patient
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  color: 'danger' | 'warning' | 'accent';
  subtitle: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Icon size={20} className="text-slate-500" />
        <Badge color={color} variant="soft" className="text-sm px-2.5 font-bold">
          {value}
        </Badge>
      </div>
      <p className="text-sm font-semibold text-slate-700 mt-3">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
    </Card>
  );
}
