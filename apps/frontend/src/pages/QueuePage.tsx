import React, { useEffect, useMemo, useState } from 'react';
import { Button, Badge, Card, Input, Tabs } from '@heroui/react';
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  FastForward,
  HeartPulse,
  ListOrdered,
  LogOut,
  Play,
  Stethoscope,
  Ticket,
  User,
  UserPlus,
  UserX,
  Users,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Activity,
} from 'lucide-react';
import {
  activeQueueEntries,
  createSeedState,
  recalculateState,
  saveLocalState,
  sortQueueEntries,
} from '../queue/local';
import {
  callPatient,
  completeConsultation,
  connectRealtime,
  fetchBootstrap,
  findPatientByPhone,
  joinQueue as apiJoinQueue,
  markNoShow,
  registerPatient as apiRegisterPatient,
  skipPatient,
  startConsultation,
  toggleDoctorAvailability,
  updateDoctorDelay as apiUpdateDoctorDelay,
  updateQueuePriority,
} from '../queue/api';
import type { DemoState, Patient, Priority, QueueEntry, Session } from '../queue/types';

const STAFF_ROSTER = [
  { username: 'staff@hospital.demo', password: 'staff123', name: 'Front Desk Team', initials: 'FD' },
  { username: 'admin@hospital.demo', password: 'admin123', name: 'Operations Admin', initials: 'OA' },
];

const PRIORITIES: Priority[] = ['EMERGENCY', 'URGENT', 'NORMAL', 'FOLLOW_UP'];
const SESSION_KEY = 'sanctuary-queue-session-v1';

type StaffTab = 'overview' | 'queues' | 'patients';
type WizardStep = 'phone' | 'details' | 'hospital' | 'dept' | 'doctor' | 'visit' | 'review' | 'token';

interface Drafts {
  staffUsername: string;
  staffPassword: string;
  doctorId: string;
  priority: Priority;
  visitType: string;
  doctorDelay: string;
  regPhone: string;
  regName: string;
  regAge: string;
  regGender: string;
  regHospitalId: string;
  wizHospitalId: string;
  wizDeptId: string;
  wizDoctorId: string;
  wizVisitType: string;
  wizReason: string;
}

function loadSession(): Session {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}

function deptName(state: DemoState, id: string): string {
  return state.departments.find((d) => d.id === id)?.name ?? 'Unknown';
}

function hospName(state: DemoState, id: string): string {
  return state.hospitals.find((h) => h.id === id)?.name ?? 'Unknown';
}

function doctorById(state: DemoState, id: string) {
  return state.doctors.find((d) => d.id === id);
}

function patientById(state: DemoState, id: string) {
  return state.patients.find((p) => p.id === id);
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fmtTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(startIso?: string, endIso?: string): string {
  const start = startIso ? new Date(startIso).getTime() : null;
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (!start) return '—';
  const sec = Math.floor((end - start) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function priBadge(p: string): string {
  if (p === 'EMERGENCY') return 'bg-rose-50 text-rose-600 border border-rose-200';
  if (p === 'URGENT') return 'bg-amber-50 text-amber-600 border border-amber-200';
  if (p === 'NORMAL') return 'bg-sky-50 text-sky-600 border border-sky-200';
  return 'bg-slate-50 text-slate-500 border border-slate-200';
}

function statusBadge(s?: string): string {
  if (s === 'IN_CONSULTATION') return 'bg-teal-600 text-white';
  if (s === 'CALLED') return 'bg-purple-600 text-white';
  if (s === 'NOTIFIED') return 'bg-amber-500 text-white';
  if (s === 'COMPLETED') return 'bg-emerald-50 text-emerald-600';
  if (s === 'SKIPPED' || s === 'NO_SHOW') return 'bg-rose-50 text-rose-600';
  return 'bg-slate-50 text-slate-500 border border-slate-200';
}

function statusLabel(s?: string): string {
  if (s === 'IN_CONSULTATION') return 'IN CONSULTATION';
  if (s === 'CALLED') return 'CALLED';
  if (s === 'NOTIFIED') return 'NOTIFIED';
  if (s === 'COMPLETED') return 'COMPLETED';
  if (s === 'SKIPPED') return 'SKIPPED';
  if (s === 'NO_SHOW') return 'NO SHOW';
  return 'WAITING';
}

export default function QueuePage() {
  const [state, setState] = useState<DemoState>(() => {
    const s = createSeedState();
    recalculateState(s);
    return s;
  });
  const [session, setSession] = useState<Session>(() => loadSession());
  const [connected, setConnected] = useState(true);
  const [staffTab, setStaffTab] = useState<StaffTab>('overview');
  const [wizStep, setWizStep] = useState<WizardStep>('phone');
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);
  const [newToken, setNewToken] = useState<QueueEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [drafts, setDrafts] = useState<Drafts>(() => ({
    staffUsername: STAFF_ROSTER[0].username,
    staffPassword: STAFF_ROSTER[0].password,
    doctorId: 'dr1',
    priority: 'NORMAL',
    visitType: 'OPD',
    doctorDelay: '10',
    regPhone: '',
    regName: '',
    regAge: '',
    regGender: 'Male',
    regHospitalId: 'h1',
    wizHospitalId: 'h1',
    wizDeptId: '',
    wizDoctorId: '',
    wizVisitType: 'New consultation',
    wizReason: '',
  }));

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    const socket = connectRealtime((fresh) => {
      saveLocalState(fresh);
      setState(fresh);
      setConnected(true);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect', () => {
      setConnected(true);
      void refreshState();
    });
    void refreshState();
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const currentPatient = useMemo(
    () => (session?.role !== 'patient' ? null : (patientById(state, session.patientId) ?? null)),
    [session, state],
  );

  const patientQueues = useMemo(
    () => (currentPatient ? sortQueueEntries(state.queues.filter((e) => e.patientId === currentPatient.id)) : []),
    [currentPatient, state],
  );

  const completedQueues = useMemo(() => patientQueues.filter((q) => q.status === 'COMPLETED'), [patientQueues]);

  const activeQueue = useMemo(
    () => patientQueues.find((e) => ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(e.status)) ?? null,
    [patientQueues],
  );

  const selectedDoctor = doctorById(state, drafts.doctorId) ?? state.doctors[0] ?? null;
  const selectedDoctorQueues = selectedDoctor ? activeQueueEntries(state, selectedDoctor.id) : [];
  const wizDoctor = doctorById(state, drafts.wizDoctorId) ?? null;
  const wizDoctorQueues = wizDoctor ? activeQueueEntries(state, wizDoctor.id) : [];

  const activeTokens = state.queues.filter((e) => ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(e.status)).length;
  const avgWait = activeTokens
    ? Math.round(
        state.queues
          .filter((e) => ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(e.status))
          .reduce((s, e) => s + (e.estimatedWaitMinutes ?? 0), 0) / activeTokens,
      )
    : 0;
  const doctorsOnline = state.doctors.filter((d) => d.availabilityStatus === 'AVAILABLE').length;

  async function refreshState() {
    try {
      const fresh = await fetchBootstrap();
      saveLocalState(fresh);
      setState(fresh);
    } catch {
      /* fallback to local */
    }
  }

  async function handlePhoneSubmit() {
    const phone = drafts.regPhone.trim().replace(/\D/g, '');
    if (phone.length < 8) {
      setNotice('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const existing = await findPatientByPhone(phone);
      if (existing) {
        setRegisteredPatient(existing);
        setDrafts((c) => ({ ...c, regPhone: phone, regHospitalId: existing.hospitalId, regName: existing.name }));
        setWizStep('hospital');
      } else {
        setDrafts((c) => ({ ...c, regPhone: phone }));
        setWizStep('details');
      }
    } catch {
      setNotice('Could not check phone.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!drafts.regName.trim()) {
      setNotice('Enter your name.');
      return;
    }
    if (!drafts.regAge.trim()) {
      setNotice('Enter your age.');
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const patient = await apiRegisterPatient({
        name: drafts.regName.trim(),
        phone: drafts.regPhone,
        age: drafts.regAge,
        gender: drafts.regGender,
        hospitalId: drafts.regHospitalId,
      });
      await refreshState();
      setRegisteredPatient(patient);
      setWizStep('hospital');
    } catch {
      setNotice('Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinQueue() {
    if (!registeredPatient || !wizDoctor) return;
    setLoading(true);
    setNotice(null);
    try {
      const entry = await apiJoinQueue({
        patientId: registeredPatient.id,
        doctorId: wizDoctor.id,
        priority: 'NORMAL',
        visitType: drafts.wizVisitType,
        reason: drafts.wizReason,
      });
      await refreshState();
      setNewToken(entry);
      setSession({ role: 'patient', patientId: registeredPatient.id });
      setWizStep('token');
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Unable to join queue.');
    } finally {
      setLoading(false);
    }
  }

  function loginStaff(username: string, password: string) {
    const match = STAFF_ROSTER.find((s) => s.username === username && s.password === password);
    if (!match) {
      setNotice('Invalid credentials.');
      return;
    }
    setNotice(null);
    setSession({ role: 'staff', staffName: match.name });
  }

  function logout() {
    setSession(null);
    setNotice(null);
    setWizStep('phone');
    setRegisteredPatient(null);
    setNewToken(null);
  }

  function joinAnotherQueue() {
    if (!currentPatient) return;
    setRegisteredPatient(currentPatient);
    setWizStep('hospital');
    setNewToken(null);
  }

  async function doCallPatient() {
    if (!selectedDoctor) return;
    try {
      await callPatient(selectedDoctor.id);
      await refreshState();
    } catch {
      setNotice('Unable to call patient.');
    }
  }

  async function doStartConsult() {
    if (!selectedDoctor) return;
    try {
      await startConsultation(selectedDoctor.id);
      await refreshState();
    } catch {
      setNotice('Unable to start.');
    }
  }

  async function doComplete() {
    if (!selectedDoctor) return;
    try {
      await completeConsultation(selectedDoctor.id);
      await refreshState();
    } catch {
      setNotice('Unable to complete.');
    }
  }

  async function doSkip() {
    if (!selectedDoctor) return;
    try {
      await skipPatient(selectedDoctor.id);
      await refreshState();
    } catch {
      setNotice('Unable to skip.');
    }
  }

  async function doNoShow() {
    if (!selectedDoctor) return;
    try {
      await markNoShow(selectedDoctor.id);
      await refreshState();
    } catch {
      setNotice('Unable to mark.');
    }
  }

  async function doDelay() {
    if (!selectedDoctor) return;
    try {
      await apiUpdateDoctorDelay(selectedDoctor.id, Math.max(0, Number(drafts.doctorDelay) || 0));
      await refreshState();
      setNotice('Delay updated.');
    } catch {
      setNotice('Unable to update delay.');
    }
  }

  async function doToggle() {
    if (!selectedDoctor) return;
    try {
      await toggleDoctorAvailability(selectedDoctor.id);
      await refreshState();
    } catch {
      setNotice('Unable to toggle.');
    }
  }

  async function doPriority(queueId: string, priority: Priority) {
    try {
      await updateQueuePriority(queueId, priority);
      await refreshState();
    } catch {
      setNotice('Unable to change priority.');
    }
  }

  if (!state.doctors.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="p-8">
          <h1 className="font-semibold text-gray-900">Loading…</h1>
        </Card>
      </div>
    );
  }

  const renderHeader = (subtitle: string, right?: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-gray-400">{subtitle}</p>
        <h2 className="text-xl font-semibold text-gray-900">Real-time Hospital Queue</h2>
        <p className="text-sm text-gray-500">Smart digital queues with live tokens and staff control</p>
      </div>
      {right}
    </div>
  );

  const liveBadge = (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        connected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
      {connected ? 'Live' : 'Demo mode'}
    </div>
  );

  /* ───────────── STAFF VIEW ───────────── */
  if (session?.role === 'staff') {
    return (
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-gray-400">{state.hospitals[0]?.name} &rsaquo; Operations</p>
              <h2 className="text-xl font-semibold text-gray-900">Queue Control Dashboard</h2>
            </div>
            <div className="flex items-center gap-3">
              {liveBadge}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  {initials(session.staffName)}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{session.staffName}</p>
                  <p className="text-xs text-gray-500">Operations staff</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onPress={logout}>
                <LogOut size={15} />
                Logout
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'overview' as StaffTab, label: 'Overview', icon: BarChart3 },
              { id: 'queues' as StaffTab, label: 'Live queues', icon: ListOrdered, badge: activeTokens },
              { id: 'patients' as StaffTab, label: 'Patient view', icon: Users },
            ] as { id: StaffTab; label: string; icon: React.ElementType; badge?: number }[]
          ).map((item) => (
            <Button key={item.id} variant={staffTab === item.id ? 'primary' : 'outline'} onPress={() => setStaffTab(item.id)}>
              <item.icon size={16} />
              {item.label}
              {item.badge !== undefined && item.badge > 0 && <Badge color="accent" variant="secondary">{item.badge}</Badge>}
            </Button>
          ))}
        </div>

        {staffTab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Doctors online', value: String(doctorsOnline), sub: 'available now', icon: Stethoscope },
              { label: 'Avg wait', value: `${avgWait}m`, sub: 'across queues', icon: Clock },
              { label: 'Served today', value: String(state.queues.filter((e) => e.status === 'COMPLETED').length), sub: 'completed', icon: Check },
              { label: 'Active tokens', value: String(activeTokens), sub: 'in queues', icon: Ticket },
            ].map(({ label, value, sub, icon: Icon }) => (
              <Card key={label} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                  <Icon size={20} className="text-teal-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </Card>
            ))}
          </div>
        )}

        {staffTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Doctor queues</h3>
                <Button size="sm" variant="ghost" onPress={() => setStaffTab('queues')}>
                  Manage all &rarr;
                </Button>
              </div>
              <div className="divide-y divide-gray-100">
                {state.doctors.map((doctor) => {
                  const dq = activeQueueEntries(state, doctor.id);
                  const cur = dq.find((e) => e.status === 'IN_CONSULTATION');
                  const called = dq.find((e) => e.status === 'CALLED');
                  const waiting = dq.filter((e) => ['WAITING', 'NOTIFIED'].includes(e.status)).length;
                  return (
                    <button
                      key={doctor.id}
                      onClick={() => {
                        setDrafts((c) => ({ ...c, doctorId: doctor.id }));
                        setStaffTab('queues');
                      }}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-gray-50 rounded-lg px-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {initials(doctor.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{deptName(state, doctor.departmentId)}</p>
                          <p className="text-xs text-gray-400 truncate">{doctor.name} &middot; {doctor.roomNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {called && <Badge color="accent" variant="soft">CALLED {called.tokenLabel}</Badge>}
                        {cur && <Badge color="accent" variant="secondary">IN: {cur.tokenLabel}</Badge>}
                        <span className="text-xs text-gray-500">{waiting} waiting</span>
                        <Badge color={doctor.availabilityStatus === 'AVAILABLE' ? 'success' : 'danger'} variant="soft">
                          {doctor.availabilityStatus}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Recent events</p>
              <div className="space-y-3">
                {state.events.slice(0, 8).map((event) => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        event.type.includes('COMPLETE')
                          ? 'bg-teal-500'
                          : event.type.includes('NO_SHOW') || event.type.includes('SKIP')
                            ? 'bg-rose-400'
                            : event.type.includes('CALL')
                              ? 'bg-purple-400'
                              : event.type.includes('START')
                                ? 'bg-amber-400'
                                : 'bg-sky-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">{event.type.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-gray-400 truncate">{event.detail}</p>
                    </div>
                  </div>
                ))}
                {state.events.length === 0 && <p className="text-xs text-gray-400">No events yet.</p>}
              </div>
            </Card>
          </div>
        )}

        {staffTab === 'queues' && (
          <>
            <div className="flex flex-wrap gap-2">
              {state.doctors.map((doctor) => {
                const sel = drafts.doctorId === doctor.id;
                return (
                  <Button
                    key={doctor.id}
                    variant={sel ? 'primary' : 'outline'}
                    onPress={() => setDrafts((c) => ({ ...c, doctorId: doctor.id }))}
                  >
                    {deptName(state, doctor.departmentId)}
                  </Button>
                );
              })}
            </div>

            {selectedDoctor && (
              <Card className="p-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {deptName(state, selectedDoctor.departmentId)}{' '}
                      <span className="font-normal text-gray-400">— {selectedDoctor.name}</span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedDoctor.roomNumber} &middot; Avg {selectedDoctor.averageConsultationTimeMinutes}min/patient
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <input
                        value={drafts.doctorDelay}
                        onChange={(e) => setDrafts((c) => ({ ...c, doctorDelay: e.target.value }))}
                        type="number"
                        min={0}
                        className="w-14 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-center outline-none focus:border-teal-400"
                      />
                      <span className="text-xs text-gray-400">min delay</span>
                      <Button size="sm" variant="outline" onPress={doDelay}>
                        Set
                      </Button>
                    </div>
                    <Button size="sm" variant={selectedDoctor.availabilityStatus === 'AVAILABLE' ? 'danger' : 'primary'} onPress={doToggle}>
                      {selectedDoctor.availabilityStatus === 'AVAILABLE' ? 'Mark unavailable' : 'Mark available'}
                    </Button>
                    <Button size="sm" variant="primary" onPress={doCallPatient}>
                      <Bell size={14} />
                      Call next
                    </Button>
                    <Button size="sm" variant="primary" onPress={doStartConsult}>
                      <Play size={14} />
                      Start
                    </Button>
                    <Button size="sm" variant="secondary" onPress={doComplete}>
                      <Check size={14} />
                      Complete
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                      <tr>
                        {['TOKEN', 'PATIENT', 'STATUS', 'ETA', 'ACTIONS'].map((h) => (
                          <th key={h} className="p-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDoctorQueues.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-sm text-gray-400">
                            Queue is empty.
                          </td>
                        </tr>
                      ) : (
                        selectedDoctorQueues.map((entry) => {
                          const pat = patientById(state, entry.patientId);
                          const isActive = ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(entry.status);
                          return (
                            <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="p-3 font-bold text-gray-900 text-lg">{entry.tokenLabel}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                    {pat ? initials(pat.name) : '?'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{pat?.name ?? 'Unknown'}</p>
                                    <p className="text-[11px] text-gray-400">
                                      {entry.visitType}
                                      {entry.reason ? ` · ${entry.reason}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Badge color={entry.status === 'IN_CONSULTATION' ? 'success' : entry.status === 'CALLED' ? 'accent' : entry.status === 'NOTIFIED' ? 'warning' : 'default'} variant="soft">
                                    {statusLabel(entry.status)}
                                  </Badge>
                                  <select
                                    value={entry.priority}
                                    onChange={(e) => doPriority(entry.id, e.target.value as Priority)}
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold outline-none cursor-pointer ${priBadge(entry.priority)}`}
                                  >
                                    {PRIORITIES.map((p) => (
                                      <option key={p} value={p}>
                                        {p}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="p-3 text-gray-600 text-sm">
                                {entry.status === 'IN_CONSULTATION'
                                  ? `Since ${fmtTime(entry.consultationStartedAt)}`
                                  : entry.estimatedWaitMinutes === 0
                                    ? 'Now'
                                    : `${entry.estimatedWaitMinutes}m`}
                              </td>
                              <td className="p-3">
                                {isActive && (
                                  <div className="flex gap-1.5">
                                    <Button size="sm" variant="ghost" isIconOnly aria-label="Skip" onPress={doSkip}>
                                      <FastForward size={14} />
                                    </Button>
                                    <Button size="sm" variant="ghost" isIconOnly aria-label="No-show" onPress={doNoShow}>
                                      <UserX size={14} />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {notice && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-700">{notice}</div>}
          </>
        )}

        {staffTab === 'patients' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Registered patients: {state.patients.length}
              </p>
              <div className="divide-y divide-gray-100">
                {state.patients.map((patient) => {
                  const queues = state.queues.filter((q) => q.patientId === patient.id);
                  const active = queues.find((q) => ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(q.status));
                  return (
                    <div key={patient.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-400">{patient.phone}</p>
                      </div>
                      {active ? (
                        <Badge color="accent" variant="soft">
                          {active.tokenLabel} · {active.status}
                        </Badge>
                      ) : (
                        <Badge variant="soft">No active queue</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-3">
              {state.doctors.map((doctor) => {
                const dq = activeQueueEntries(state, doctor.id);
                const cur = dq.find((e) => e.status === 'IN_CONSULTATION');
                const called = dq.find((e) => e.status === 'CALLED');
                const waiting = dq.filter((e) => ['WAITING', 'NOTIFIED'].includes(e.status)).length;
                return (
                  <Card key={doctor.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{deptName(state, doctor.departmentId)}</p>
                        <p className="text-xs text-gray-400">{doctor.name} &middot; {doctor.roomNumber}</p>
                      </div>
                      <Badge color={doctor.availabilityStatus === 'AVAILABLE' ? 'success' : 'danger'} variant="soft">
                        {doctor.availabilityStatus}
                      </Badge>
                    </div>
                    <div className="flex gap-6">
                      {called && (
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Called</p>
                          <p className="text-2xl font-bold text-purple-600">{called.tokenLabel}</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">In consult</p>
                        {cur ? <p className="text-2xl font-bold text-teal-600">{cur.tokenLabel}</p> : <p className="text-sm text-gray-400 py-1">None</p>}
                      </div>
                      <div className="text-center ml-auto">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Waiting</p>
                        <p className="text-2xl font-bold text-gray-900">{waiting}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ───────────── PATIENT / WIZARD VIEW ───────────── */
  const patientHeader = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <HeartPulse className="h-5 w-5 text-teal-600" />
        <span className="text-sm font-bold text-gray-900">Hospital Queue</span>
        <span className="text-gray-300">|</span>
        <span className="text-xs text-teal-700 uppercase tracking-widest">Patient Portal</span>
      </div>
      <div className="flex items-center gap-3">
        {liveBadge}
        {currentPatient && <span className="text-sm text-gray-600">{currentPatient.name}</span>}
        {(session?.role === 'patient' || registeredPatient) && (
          <Button size="sm" variant="ghost" onPress={logout}>
            <LogOut size={14} />
            Logout
          </Button>
        )}
      </div>
    </div>
  );

  /* Patient dashboard (active state) */
  if (
    session?.role === 'patient' &&
    currentPatient &&
    wizStep !== 'hospital' &&
    wizStep !== 'dept' &&
    wizStep !== 'doctor' &&
    wizStep !== 'visit' &&
    wizStep !== 'review'
  ) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="p-4">{patientHeader}</Card>

        {activeQueue === null && completedQueues.length > 0 && !newToken && (
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Consultation Completed</h2>
              <p className="text-sm text-gray-500">Your visit has been recorded. Thank you!</p>
            </Card>
            {completedQueues.slice(0, 3).map((q) => {
              const doc = doctorById(state, q.doctorId);
              return (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{doc?.name}</p>
                      <p className="text-xs text-gray-400">{deptName(state, doc?.departmentId ?? '')}</p>
                    </div>
                    <Badge color="success" variant="soft">
                      COMPLETED
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 text-center text-xs text-gray-500">
                    <div>
                      <p className="font-semibold text-gray-900">{q.tokenLabel}</p>
                      <p>Token</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{fmtTime(q.consultationStartedAt)}</p>
                      <p>Started</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {q.consultationCompletedAt ? fmtDuration(q.consultationStartedAt, q.consultationCompletedAt) : '—'}
                      </p>
                      <p>Duration</p>
                    </div>
                  </div>
                </Card>
              );
            })}
            <Button variant="primary" fullWidth onPress={joinAnotherQueue}>
              <UserPlus size={16} />
              Join another queue
            </Button>
          </div>
        )}

        {activeQueue === null && completedQueues.length === 0 && !newToken && (
          <div className="space-y-4">
            <Card className="p-7">
              <div className="text-center">
                <Ticket className="h-10 w-10 text-teal-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-1">Hello, {currentPatient.name.split(' ')[0]} 👋</h2>
                <p className="text-sm text-gray-400">You don&apos;t have an active queue. Join one below.</p>
              </div>
            </Card>
            <Button variant="primary" fullWidth onPress={joinAnotherQueue}>
              <UserPlus size={16} />
              Join a Queue
            </Button>
          </div>
        )}

        {activeQueue && (activeQueue.status === 'WAITING' || activeQueue.status === 'NOTIFIED') && (() => {
          const doc = doctorById(state, activeQueue.doctorId);
          const dq = activeQueueEntries(state, activeQueue.doctorId);
          const cur = dq.find((e) => e.status === 'IN_CONSULTATION');
          const ahead = Math.max(0, (activeQueue.queuePosition ?? 1) - 1);
          const pct = dq.length > 0 ? Math.max(5, Math.round(((dq.length - ahead) / dq.length) * 100)) : 5;
          const approaching = activeQueue.status === 'NOTIFIED';
          return (
            <div className="space-y-4">
              {approaching && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Bell className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">You&apos;re almost up!</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {ahead} patient{ahead !== 1 ? 's' : ''} ahead — please make your way to {doc?.roomNumber ?? 'the consultation area'}.
                    </p>
                  </div>
                </div>
              )}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Active queue</p>
                    <h2 className="text-lg font-bold text-gray-900">{deptName(state, doc?.departmentId ?? '')}</h2>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Stethoscope size={14} />
                      {doc?.name}
                    </p>
                  </div>
                  <Badge color={approaching ? 'warning' : 'accent'} variant="soft">
                    {approaching ? 'ALMOST UP' : 'WAITING'}
                  </Badge>
                </div>
                <div className="text-center py-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Your token</p>
                  <p className="text-6xl font-bold tracking-tight text-gray-900">{activeQueue.tokenLabel}</p>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 mt-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{cur ? cur.tokenLabel : '—'}</p>
                    <p className="text-[10px] text-gray-400">Now serving</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{ahead}</p>
                    <p className="text-[10px] text-gray-400">Ahead</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{activeQueue.estimatedWaitMinutes ?? 0}m</p>
                    <p className="text-[10px] text-gray-400">Est. wait</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-300 text-right mt-2">
                  Last updated: just now &middot; {doc?.roomNumber}
                </p>
              </Card>
              <Button variant="outline" fullWidth onPress={joinAnotherQueue}>
                <UserPlus size={16} />
                Join another queue
              </Button>
            </div>
          );
        })()}

        {activeQueue && activeQueue.status === 'CALLED' && (() => {
          const doc = doctorById(state, activeQueue.doctorId);
          return (
            <div className="space-y-4">
              <Card className="p-6 text-center bg-purple-600 border-purple-600">
                <Bell className="h-10 w-10 text-white mx-auto mb-3 animate-pulse" />
                <h2 className="text-2xl font-bold text-white mb-1">YOUR TOKEN IS CALLED</h2>
                <p className="text-purple-200">Please proceed to the consultation area immediately.</p>
              </Card>
              <Card className="p-5">
                <div className="text-center mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Your token</p>
                  <p className="text-6xl font-bold text-purple-600">{activeQueue.tokenLabel}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Doctor</p>
                    <p className="font-semibold text-gray-900">{doc?.name}</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Room</p>
                    <p className="font-semibold text-purple-700">{activeQueue.roomNumber ?? doc?.roomNumber ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Department</p>
                    <p className="font-semibold text-gray-900">{deptName(state, doc?.departmentId ?? '')}</p>
                  </div>
                </div>
              </Card>
            </div>
          );
        })()}

        {activeQueue && activeQueue.status === 'IN_CONSULTATION' && (() => {
          const doc = doctorById(state, activeQueue.doctorId);
          void tick;
          return (
            <div className="space-y-4">
              <Card className="p-6 bg-teal-700 border-teal-700">
                <div className="flex items-center gap-3 mb-4">
                  <Stethoscope className="h-7 w-7 text-teal-300" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Consultation in progress</h2>
                    <p className="text-sm text-teal-200">You are currently with {doc?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Room</p>
                    <p className="text-lg font-bold text-white">{activeQueue.roomNumber ?? doc?.roomNumber ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Started</p>
                    <p className="text-lg font-bold text-white">{fmtTime(activeQueue.consultationStartedAt)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 col-span-2 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Duration</p>
                    <p className="text-4xl font-bold tabular-nums text-white">{fmtDuration(activeQueue.consultationStartedAt)}</p>
                  </div>
                </div>
              </Card>
            </div>
          );
        })()}
      </div>
    );
  }

  /* ───────────── WIZARD ───────────── */
  const renderWizardCard = (children: React.ReactNode) => (
    <Card className="p-6 bg-white">{children}</Card>
  );

  const noticeBlock = notice ? (
    <p className="mt-3 text-sm text-rose-600 flex items-center gap-1.5">
      <AlertTriangle size={16} className="shrink-0" />
      {notice}
    </p>
  ) : null;

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto">
      <Card className="p-4">{patientHeader}</Card>

      {wizStep === 'phone' && (
        <div>
          <Card className="p-7 mb-4">
            <div className="text-center">
              <Ticket className="h-10 w-10 text-teal-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-1">Smart Hospital Queue</h2>
              <p className="text-sm text-gray-400">Enter your mobile number to register or continue.</p>
            </div>
          </Card>
          {renderWizardCard(
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Step 1 of 5 — Identify yourself</p>
              <label className="block space-y-1.5 mb-5">
                <span className="text-xs font-semibold text-gray-600">Mobile number</span>
                <Input
                  value={drafts.regPhone}
                  onChange={(e) => setDrafts((c) => ({ ...c, regPhone: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  placeholder="9876543210"
                  maxLength={15}
                  fullWidth
                />
              </label>
              <Button variant="primary" fullWidth isDisabled={loading} onPress={handlePhoneSubmit}>
                {loading ? (
                  'Checking…'
                ) : (
                  <>
                    <Sparkles size={16} />
                    Continue
                  </>
                )}
              </Button>
              {noticeBlock}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-2">Staff login</p>
                <div className="grid gap-2">
                  {STAFF_ROSTER.map((s) => (
                    <Button key={s.username} variant="outline" onPress={() => loginStaff(s.username, s.password)}>
                      <ShieldCheck size={16} className="text-gray-400" />
                      {s.name} ({s.username})
                    </Button>
                  ))}
                </div>
              </div>
            </>,
          )}
        </div>
      )}

      {wizStep === 'details' &&
        renderWizardCard(
          <>
            <button onClick={() => setWizStep('phone')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
              &larr; Back
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Step 2 of 5 — Your details</p>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Tell us about yourself</h2>
            <div className="grid gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Full name *</span>
                <Input
                  value={drafts.regName}
                  onChange={(e) => setDrafts((c) => ({ ...c, regName: e.target.value }))}
                  placeholder="e.g. Ananya Sharma"
                  fullWidth
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">Age *</span>
                  <Input
                    value={drafts.regAge}
                    onChange={(e) => setDrafts((c) => ({ ...c, regAge: e.target.value }))}
                    type="number"
                    min={1}
                    max={120}
                    placeholder="32"
                    fullWidth
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">Gender</span>
                  <select
                    value={drafts.regGender}
                    onChange={(e) => setDrafts((c) => ({ ...c, regGender: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none cursor-pointer"
                  >
                    {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Hospital</span>
                <select
                  value={drafts.regHospitalId}
                  onChange={(e) => setDrafts((c) => ({ ...c, regHospitalId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none cursor-pointer"
                >
                  {state.hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — {h.location}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button variant="primary" fullWidth isDisabled={loading} className="mt-5" onPress={handleRegister}>
              {loading ? 'Registering…' : 'Register & continue'}
            </Button>
            {noticeBlock}
          </>,
        )}

      {wizStep === 'hospital' &&
        renderWizardCard(
          <>
            <button onClick={() => setWizStep('phone')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
              &larr; Back
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Step 3 of 5 — Select hospital</p>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Choose a hospital</h2>
            <div className="space-y-2">
              {state.hospitals.map((h) => (
                <Button
                  key={h.id}
                  variant={drafts.wizHospitalId === h.id ? 'primary' : 'outline'}
                  fullWidth
                  onPress={() => {
                    setDrafts((c) => ({ ...c, wizHospitalId: h.id, wizDeptId: '', wizDoctorId: '' }));
                    setWizStep('dept');
                  }}
                  className="justify-between"
                >
                  <span className="text-left">
                    <span className="block font-semibold">{h.name}</span>
                    <span className="block text-xs font-normal opacity-70">{h.location}</span>
                  </span>
                  <span>&rsaquo;</span>
                </Button>
              ))}
            </div>
          </>,
        )}

      {wizStep === 'dept' && (() => {
        const depts = state.departments.filter((d) => d.hospitalId === drafts.wizHospitalId);
        return renderWizardCard(
          <>
            <button onClick={() => setWizStep('hospital')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
              &larr; Back
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Step 3 of 5 — Select department</p>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Choose a department</h2>
            <p className="text-xs text-gray-400 mb-4">{hospName(state, drafts.wizHospitalId)}</p>
            <div className="space-y-2">
              {depts.map((d) => {
                const docs = state.doctors.filter((doc) => doc.departmentId === d.id);
                const dq = state.queues.filter(
                  (q) => docs.some((doc) => doc.id === q.doctorId) && ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(q.status),
                );
                const avgEta = docs.length ? Math.round(dq.reduce((s, q) => s + (q.estimatedWaitMinutes ?? 0), 0) / (dq.length || 1)) : 0;
                return (
                  <Button
                    key={d.id}
                    variant="outline"
                    fullWidth
                    onPress={() => {
                      setDrafts((c) => ({ ...c, wizDeptId: d.id, wizDoctorId: '' }));
                      setWizStep('doctor');
                    }}
                    className="justify-between"
                  >
                    <span className="text-left">
                      <span className="block font-semibold">{d.name}</span>
                      <span className="block text-xs font-normal text-gray-400">
                        {dq.length} waiting &middot; ~{avgEta}min est. wait
                      </span>
                    </span>
                    <span className="text-gray-300">&rsaquo;</span>
                  </Button>
                );
              })}
            </div>
          </>,
        );
      })()}

      {wizStep === 'doctor' && (() => {
        const docs = state.doctors.filter((d) => d.departmentId === drafts.wizDeptId);
        return renderWizardCard(
          <>
            <button onClick={() => setWizStep('dept')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
              &larr; Back
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Step 4 of 5 — Select doctor</p>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Choose your doctor</h2>
            <div className="space-y-2">
              {docs.map((doc) => {
                const dq = activeQueueEntries(state, doc.id);
                const waiting = dq.filter((e) => ['WAITING', 'NOTIFIED'].includes(e.status)).length;
                const eta = dq.length ? Math.round(dq.reduce((s, e) => s + (e.estimatedWaitMinutes ?? 0), 0) / dq.length) : 0;
                return (
                  <Button
                    key={doc.id}
                    variant={doc.availabilityStatus === 'UNAVAILABLE' ? 'outline' : 'outline'}
                    isDisabled={doc.availabilityStatus === 'UNAVAILABLE'}
                    fullWidth
                    className="!opacity-100"
                    onPress={() => {
                      setDrafts((c) => ({ ...c, wizDoctorId: doc.id }));
                      setWizStep('visit');
                    }}
                  >
                    <span className="flex w-full items-center justify-between gap-2 text-left">
                      <span>
                        <span className="block font-semibold">{doc.name}</span>
                        <span className="block text-xs font-normal text-gray-400">{doc.roomNumber}</span>
                      </span>
                      <span className={`text-xs font-normal ${doc.availabilityStatus === 'UNAVAILABLE' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {waiting} waiting &middot; ~{eta}min &middot; {doc.averageConsultationTimeMinutes}min/consult
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </>,
        );
      })()}

      {wizStep === 'visit' &&
        wizDoctor &&
        renderWizardCard(
          <>
            <button onClick={() => setWizStep('doctor')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
              &larr; Back
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Step 5 of 5 — Visit details</p>
            <h2 className="text-xl font-bold text-gray-900 mb-5">What brings you in?</h2>
            <div className="grid gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Visit type</p>
                <div className="flex flex-wrap gap-2">
                  {['New consultation', 'Follow-up'].map((v) => (
                    <Button
                      key={v}
                      variant={drafts.wizVisitType === v ? 'primary' : 'outline'}
                      onPress={() => setDrafts((c) => ({ ...c, wizVisitType: v }))}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Brief reason for visit (optional)</span>
                <textarea
                  value={drafts.wizReason}
                  onChange={(e) => setDrafts((c) => ({ ...c, wizReason: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-teal-400 resize-none"
                  placeholder="e.g. Fever and headache"
                />
              </label>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Priority is assigned by hospital staff only. Please do not self-declare emergency unless you are in immediate danger.
                </p>
              </div>
            </div>
            <Button variant="primary" fullWidth onPress={() => setWizStep('review')}>
              Review &rarr;
            </Button>
          </>,
        )}

      {wizStep === 'review' &&
        wizDoctor &&
        registeredPatient &&
        (() => {
          const waiting = wizDoctorQueues.filter((e) => ['WAITING', 'NOTIFIED'].includes(e.status)).length;
          const eta = wizDoctorQueues.length ? Math.round(wizDoctorQueues.reduce((s, e) => s + (e.estimatedWaitMinutes ?? 0), 0) / wizDoctorQueues.length) : 0;
          return renderWizardCard(
            <>
              <button onClick={() => setWizStep('visit')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
                &larr; Back
              </button>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Review</p>
              <h2 className="text-xl font-bold text-gray-900 mb-5">Confirm queue entry</h2>
              <div className="space-y-3 mb-5">
                {[
                  { label: 'Patient', value: registeredPatient.name },
                  { label: 'Hospital', value: hospName(state, drafts.wizHospitalId) },
                  { label: 'Department', value: deptName(state, wizDoctor.departmentId) },
                  { label: 'Doctor', value: wizDoctor.name },
                  { label: 'Room', value: wizDoctor.roomNumber },
                  { label: 'Visit type', value: drafts.wizVisitType },
                  { label: 'Reason', value: drafts.wizReason || '—' },
                  { label: 'Current queue', value: `${waiting} patients` },
                  { label: 'Estimated wait', value: `~${eta} minutes` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-gray-50 pb-3 last:border-b-0">
                    <span className="text-xs font-semibold text-gray-400 shrink-0">{label}</span>
                    <span className="text-sm text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
              <Button variant="primary" fullWidth isDisabled={loading} onPress={handleJoinQueue}>
                {loading ? (
                  'Joining…'
                ) : (
                  <>
                    <UserPlus size={16} />
                    JOIN QUEUE
                  </>
                )}
              </Button>
              {noticeBlock}
            </>,
          );
        })()}

      {wizStep === 'token' && newToken && wizDoctor && registeredPatient && (() => {
        const dq = activeQueueEntries(state, wizDoctor.id);
        const cur = dq.find((e) => e.status === 'IN_CONSULTATION');
        const ahead = Math.max(0, (newToken.queuePosition ?? 1) - 1);
        return (
          <div className="space-y-4">
            <Card className="p-6 text-center bg-teal-700 border-teal-700">
              <p className="text-[10px] uppercase tracking-widest text-teal-300 mb-2">You are in the queue!</p>
              <p className="text-7xl font-bold tracking-tight leading-none mb-2 text-white">{newToken.tokenLabel}</p>
              <p className="text-sm text-teal-200">
                {deptName(state, wizDoctor.departmentId)} &mdash; {wizDoctor.name}
              </p>
              <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4 mt-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{cur ? cur.tokenLabel : '—'}</p>
                  <p className="text-[10px] text-teal-300">Now serving</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{ahead}</p>
                  <p className="text-[10px] text-teal-300">Ahead</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{newToken.estimatedWaitMinutes ?? 0}m</p>
                  <p className="text-[10px] text-teal-300">Est. wait</p>
                </div>
              </div>
            </Card>
            <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-sm text-teal-700">
              We&apos;ll update you as the queue moves. You can safely leave the hospital and return when it&apos;s your turn.
            </div>
            <Button variant="outline" fullWidth onPress={joinAnotherQueue}>
              <UserPlus size={16} />
              Join another queue
            </Button>
          </div>
        );
      })()}
    </div>
  );
}