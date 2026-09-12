import React, { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Tabs,
} from '@heroui/react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import {
  type Dashboard,
  type Flag,
  type FlagResolution,
  type PatientView,
  TREND_COLOR,
} from '../domains/wardsync/model/types';
import {
  acknowledgeFlag,
  fetchDashboard,
  fetchPatientView,
  resolveFlag,
} from '../domains/wardsync/api/wardsync.api';
import WardWorklist from '../domains/wardsync/components/WardWorklist';
import SelectedBedsideRecord from '../domains/wardsync/components/SelectedBedsideRecord';
import News2Attribution from '../domains/wardsync/components/News2Attribution';
import DeviceRegistry from '../domains/wardsync/components/DeviceRegistry';
import VitalsFlowsheet from '../domains/wardsync/components/VitalsFlowsheet';

export default function WardSyncPage() {
  const [viewMode, setViewMode] = useState<'worklist' | 'patient'>('worklist');
  const [patientTab, setPatientTab] = useState<'overview' | 'vitals'>('overview');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('P-1024');
  const [patientView, setPatientView] = useState<PatientView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const refresh = async (patientId = selectedPatientId) => {
    setError(null);
    try {
      const [dashboardResult, patientResult] = await Promise.all([
        fetchDashboard(),
        fetchPatientView(patientId),
      ]);
      setDashboard(dashboardResult);
      setPatientView(patientResult);
      setSelectedPatientId(patientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WardSync request failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const latestScore = patientView?.news2.at(-1);
  const latestVital = patientView?.vitals.at(-1);
  const scoreTrail = patientView?.news2
    .slice(-3)
    .map((score) => score.totalScore)
    .join(' → ') ?? '';

  const openFlags = patientView?.flags.filter((flag) => flag.status !== 'RESOLVED') ?? [];
  const activeDevices = patientView?.devices.filter((device) => device.status !== 'REMOVED') ?? [];

  const handleSelectPatientAndReview = (patientId: string) => {
    setSelectedPatientId(patientId);
    void refresh(patientId);
    setViewMode('patient');
  };

  const handleAcknowledge = async (flagId: string) => {
    await acknowledgeFlag(flagId);
    setSuccessToast('Correlation flag acknowledged.');
    await refresh(patientView?.patient.id);
  };

  const [resolvingFlag, setResolvingFlag] = useState<Flag | null>(null);
  const [resolutionOutcome, setResolutionOutcome] =
    useState<FlagResolution>('CLINICAL_REVIEW_COMPLETE');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const handleOpenResolve = (flag: Flag) => {
    setResolvingFlag(flag);
    setResolutionOutcome('CLINICAL_REVIEW_COMPLETE');
    setResolutionNote('');
  };

  const handleConfirmResolve = async () => {
    if (!resolvingFlag) return;
    setIsResolving(true);
    try {
      await resolveFlag(resolvingFlag.id, {
        resolution: resolutionOutcome,
        note: resolutionNote.trim() || undefined,
      });
      setSuccessToast('Correlation flag resolved and clinical review documented.');
      setResolvingFlag(null);
      await refresh(patientView?.patient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve flag.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Card */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">WardSync</h2>
              <Badge color="accent" variant="soft">
                Ward Intelligence
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Ward-level device lifecycle &amp; physiological NEWS2 trend correlation
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="danger" variant="soft">
              {dashboard?.openFlags.length ?? 0} Combined Alerts
            </Badge>
            <Badge color="warning" variant="soft">
              {dashboard?.reviewDueDevices.length ?? 0} Devices Due
            </Badge>
            <Button
              isIconOnly
              variant="outline"
              aria-label="Refresh WardSync"
              onPress={() => void refresh()}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      {error && (
        <Alert status="danger">
          <div className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onPress={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {successToast && (
        <Alert status="success">
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {successToast}
            </span>
            <Button size="sm" variant="ghost" onPress={() => setSuccessToast(null)}>
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* ================================================================= */}
      {/* VIEW 1: WARD WORKLIST                                             */}
      {/* ================================================================= */}
      {viewMode === 'worklist' && (
        <WardWorklist
          dashboard={dashboard}
          onSelectPatient={handleSelectPatientAndReview}
        />
      )}

      {/* ================================================================= */}
      {/* VIEW 2: INDIVIDUAL PATIENT WORKSPACE                              */}
      {/* ================================================================= */}
      {viewMode === 'patient' && (
        <div className="flex flex-col gap-4">
          {/* Bedside Patient Navigation & Focus Bar */}
          <Card className="p-3 bg-slate-50 border border-slate-200">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => setViewMode('worklist')}
                >
                  <ArrowLeft size={16} /> Back to Worklist
                </Button>

                <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

                <div className="flex items-center gap-2">
                  <User size={18} className="text-slate-600" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Patient:
                  </span>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPatientId(id);
                      void refresh(id);
                    }}
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    {(dashboard?.patients ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id}) — {p.ward}, Bed {p.bed}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  color={latestScore ? TREND_COLOR[latestScore.trend] : 'default'}
                  variant="soft"
                  className="font-semibold"
                >
                  NEWS2 {latestScore?.totalScore ?? 0} · {latestScore?.trend ?? 'STABLE'}
                </Badge>
                {openFlags.length > 0 && (
                  <Badge color="danger" variant="primary" className="font-semibold">
                    {openFlags.length} Flag Active
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Sub-Tabs: Overview & Devices vs Vitals Flowsheet */}
          <Tabs
            selectedKey={patientTab}
            onSelectionChange={(key) => setPatientTab(key as 'overview' | 'vitals')}
          >
            <Tabs.List aria-label="Patient Workspace Sections">
              <Tabs.Tab id="overview">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Activity size={16} /> Bedside Overview &amp; Devices
                </span>
              </Tabs.Tab>
              <Tabs.Tab id="vitals">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <HeartPulse size={16} /> Vitals &amp; Flowsheet
                </span>
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB 1: OVERVIEW & INVASIVE DEVICES REGISTRY */}
            <Tabs.Panel id="overview">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] mt-3">
                {/* Left Column: Bedside Record, Attribution & Device Registry */}
                <div className="flex flex-col gap-4 min-w-0">
                  <SelectedBedsideRecord
                    patient={patientView?.patient}
                    latestScore={latestScore}
                    latestVital={latestVital}
                    scoreTrail={scoreTrail}
                  />

                  <News2Attribution
                    latestScore={latestScore}
                    latestVital={latestVital}
                  />

                  <DeviceRegistry
                    patientId={selectedPatientId}
                    patientName={patientView?.patient.name ?? ''}
                    devices={patientView?.devices ?? []}
                    connections={patientView?.connections ?? []}
                    onRefresh={refresh}
                    onError={setError}
                    onSuccess={setSuccessToast}
                  />
                </div>

                {/* Right Column: Combined Flags & Bedside Handoff Summary */}
                <div className="flex flex-col gap-4 min-w-0">
                  {/* Correlation Flags */}
                  {openFlags.length > 0 ? (
                    openFlags.map((flag) => (
                      <Card
                        key={flag.id}
                        className="p-4 border-l-4 border-l-red-600 bg-red-50/40 border border-red-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="text-red-600 shrink-0" size={18} />
                            <h4 className="font-bold text-red-950 text-sm">
                              Combined Deterioration Flag
                            </h4>
                          </div>
                          <Badge color="danger" variant="primary" className="text-[11px] font-bold">
                            {flag.status}
                          </Badge>
                        </div>

                        <p className="text-xs font-semibold text-red-900 mt-2">
                          {flag.reason}
                        </p>

                        <div className="mt-2.5 rounded bg-white/80 p-2.5 border border-red-100 text-xs space-y-1">
                          <p className="font-bold text-slate-700">Clinical Evidence Trail:</p>
                          <p className="text-slate-600">
                            • Vitals Trend: <span className="font-medium text-slate-800">{flag.evidence.vitalsTrendSummary}</span>
                          </p>
                          <p className="text-slate-600">
                            • Device Review: <span className="font-medium text-slate-800">{flag.evidence.deviceReviewReason}</span>
                          </p>
                          {flag.evidence.drivers?.length > 0 && (
                            <p className="text-slate-600">
                              • Trend Drivers: <span className="font-medium text-red-700">{flag.evidence.drivers.join(', ')}</span>
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-2">
                          {flag.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => void handleAcknowledge(flag.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="primary"
                            onPress={() => handleOpenResolve(flag)}
                          >
                            Resolve &amp; Document Review
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-6 text-center bg-emerald-50/40 border border-emerald-200">
                      <CheckCircle2 className="mx-auto text-emerald-600" size={26} />
                      <p className="font-semibold text-emerald-950 mt-2">
                        No Combined Deterioration Flag
                      </p>
                      <p className="text-xs text-emerald-800 mt-1">
                        Invasive device state and physiological vitals are not currently converging
                        into an adverse ward risk pattern.
                      </p>
                    </Card>
                  )}

                  {/* Bedside Handoff Summary Card (Section 21) */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-slate-800 text-sm">Bedside Handoff Summary</h4>
                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Active Devices:</span>
                        <span className="font-medium text-slate-800">
                          {activeDevices.length} in situ
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Device Review Due:</span>
                        <span
                          className={`font-medium ${
                            activeDevices.some((d) => d.status === 'REVIEW_DUE')
                              ? 'text-amber-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {activeDevices.filter((d) => d.status === 'REVIEW_DUE').length} pending
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Latest NEWS2:</span>
                        <span className="font-medium text-slate-800">
                          {latestScore ? `${latestScore.totalScore} (${latestScore.trend})` : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Monitoring Level:</span>
                        <span className="font-medium text-slate-800">
                          {(latestScore?.totalScore ?? 0) >= 7
                            ? 'High (Escalation)'
                            : (latestScore?.totalScore ?? 0) >= 5
                              ? 'Medium (Urgent)'
                              : 'Standard Monitoring'}
                        </span>
                      </div>

                      {/* Section 21 Itemized Device Breakdown */}
                      <div className="pt-2.5 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                          Devices In Situ ({activeDevices.length})
                        </span>
                        {activeDevices.length > 0 ? (
                          <div className="space-y-1">
                            {activeDevices.map((d) => (
                              <div
                                key={d.id}
                                className="flex items-center justify-between text-xs py-0.5"
                              >
                                <span className="text-slate-700 flex items-center gap-1.5 truncate">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                      d.status === 'REVIEW_DUE' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                  />
                                  <span className="truncate">
                                    {d.type.replace(/_/g, ' ')}
                                    {d.location ? ` (${d.location})` : ''}
                                  </span>
                                </span>
                                {d.status === 'REVIEW_DUE' ? (
                                  <Badge color="warning" variant="soft" className="text-[10px] py-0 shrink-0">
                                    Review Due ⚠
                                  </Badge>
                                ) : (
                                  <Badge color="default" variant="soft" className="text-[10px] py-0 shrink-0">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No active devices</p>
                        )}
                      </div>

                      {/* Section 21 Recent Connection Change */}
                      {patientView?.connections.some((c) => Boolean(c.endedAt)) && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Recent Change:</span>{' '}
                          {(() => {
                            const ended = patientView.connections
                              .filter((c) => Boolean(c.endedAt))
                              .sort(
                                (a, b) =>
                                  new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime(),
                              )[0];
                            return `${ended.type.toLowerCase()} (${ended.referenceId ?? 'line'}) ended`;
                          })()}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </Tabs.Panel>

            {/* TAB 2: VITALS & FLOWSHEET */}
            <Tabs.Panel id="vitals">
              <VitalsFlowsheet
                patientView={patientView}
                onRefresh={refresh}
                onError={setError}
                onSuccess={setSuccessToast}
              />
            </Tabs.Panel>
          </Tabs>
        </div>
      )}

      {/* MODAL: COMBINED FLAG RESOLUTION DIALOG */}
      {resolvingFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-600 shrink-0" size={18} />
                <h3 className="font-bold text-slate-900 text-base">
                  Resolve Combined Deterioration Flag
                </h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setResolvingFlag(null)}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-red-50/50 border border-red-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800">
                  {patientView?.patient.name} ({patientView?.patient.id}) · {patientView?.patient.ward}, Bed {patientView?.patient.bed}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Flag Reason:</span>
                <p className="font-medium text-red-900 mt-0.5">{resolvingFlag.reason}</p>
              </div>
              <div>
                <span className="text-slate-500">Evidence:</span>
                <p className="text-slate-700 mt-0.5">
                  • Vitals Trend: <span className="font-medium">{resolvingFlag.evidence.vitalsTrendSummary}</span>
                  <br />
                  • Device Review: <span className="font-medium">{resolvingFlag.evidence.deviceReviewReason}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Outcome / Resolution Action *
                </label>
                <select
                  value={resolutionOutcome}
                  onChange={(e) => setResolutionOutcome(e.target.value as FlagResolution)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="CLINICAL_REVIEW_COMPLETE">
                    Clinical Review Completed — Re-evaluated vitals &amp; devices
                  </option>
                  <option value="DEVICE_RETAINED">
                    Device Retained — Clinical need re-confirmed at bedside
                  </option>
                  <option value="DEVICE_REMOVED">
                    Device Removed — Indication ceased / device withdrawn
                  </option>
                  <option value="PURPOSE_UPDATED">
                    Purpose / Indication Updated — Clinical documentation amended
                  </option>
                  <option value="DISMISSED">
                    Dismiss Flag — False positive / non-actionable
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bedside Review Note (Optional)
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Document clinician bedside assessment, findings, or updated management plan..."
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                size="sm"
                variant="outline"
                onPress={() => setResolvingFlag(null)}
                isDisabled={isResolving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onPress={() => void handleConfirmResolve()}
                isDisabled={isResolving}
              >
                {isResolving ? 'Resolving...' : 'Confirm Resolution'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
