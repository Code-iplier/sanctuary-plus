import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Pill,
  FileText,
  Shield,
  Heart,
  Activity,
  LogOut,
  Sparkles,
  ShieldCheck,
  User,
  Phone,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Menu,
  RadioTower,
} from 'lucide-react';
import QueuePage from './pages/QueuePage';
import DocumentationPage from './pages/DocumentationPage';
import MedicationsPage from './pages/MedicationsPage';
import RiskPage from './pages/RiskPage';
import WardSyncPage from './pages/WardSyncPage';
import ChronosPage from './pages/ChronosPage';
import DashboardPage from './pages/DashboardPage';
import { findPatientByPhone, registerPatient, fetchBootstrap } from './queue/api';
import type { Session, DemoState, Patient } from './queue/types';

const SESSION_KEY = 'sanctuary-hospital-session-v1';

const STAFF_ROSTER = [
  {
    username: 'staff@hospital.demo',
    password: 'staff123',
    name: 'Front Desk Team',
    roleTitle: 'OPD Reception & Triage',
    initials: 'FD',
  },
  {
    username: 'admin@hospital.demo',
    password: 'admin123',
    name: 'Operations Admin',
    roleTitle: 'Platform & Clinical Admin',
    initials: 'OA',
  },
];

const DEMO_PATIENTS = [
  { name: 'Ananya Sharma', phone: '9000011111', note: 'Token A-21 (Waiting)' },
  { name: 'Imran Ali', phone: '9000044444', note: 'Token A-24 (In Consult)' },
  { name: 'Priya Nambiar', phone: '9000055555', note: 'No Active Token' },
];

const STAFF_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Hospital Overview' },
  { id: 'queue', label: 'Queue Operations', icon: Users, desc: 'Live OPD Queues' },
  { id: 'documentation', label: 'Documentation', icon: FileText, desc: 'TipTap Clinical Notes' },
  { id: 'medications', label: 'Medications', icon: Shield, desc: 'RxNorm & Interactions' },
  { id: 'risk', label: 'Risk Assessment', icon: Heart, desc: 'ASCVD / LACE Score' },
  { id: 'wardsync', label: 'WardSync', icon: RadioTower, desc: 'Ward Deterioration & Flowsheet' },
  { id: 'chronos', label: 'Chronos ICU', icon: Activity, desc: 'Early Warning Engine' },
] as const;

type NavItemId = typeof STAFF_NAV_ITEMS[number]['id'];

function loadSession(): Session {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

export default function App() {
  const [session, setSession] = useState<Session>(() => loadSession());
  const [activePanel, setActivePanel] = useState<NavItemId>('dashboard');

  // Login portal states
  const [authTab, setAuthTab] = useState<'patient' | 'staff'>('patient');
  const [patientPhone, setPatientPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // New patient registration in login portal
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Female');
  const [regHospitalId, setRegHospitalId] = useState('h1');
  const [bootstrapHospitals, setBootstrapHospitals] = useState<{ id: string; name: string }[]>([
    { id: 'h1', name: 'City General Hospital' },
    { id: 'h2', name: 'Metro Memorial Hospital' },
    { id: 'h3', name: 'Apollo Speciality Clinic' },
  ]);

  // Staff login state
  const [staffUsername, setStaffUsername] = useState(STAFF_ROSTER[0].username);
  const [staffPassword, setStaffPassword] = useState(STAFF_ROSTER[0].password);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    fetchBootstrap()
      .then((state: DemoState) => {
        if (state.hospitals?.length) {
          setBootstrapHospitals(state.hospitals);
          setRegHospitalId(state.hospitals[0].id);
        }
      })
      .catch(() => {
        /* keep default hospitals */
      });
  }, []);

  const handleLogout = () => {
    setSession(null);
    setAuthError(null);
    setIsRegistering(false);
    setActivePanel('dashboard');
  };

  // Patient phone lookup
  const handlePatientPhoneSubmit = async (phoneToLookup?: string) => {
    const raw = (phoneToLookup ?? patientPhone).trim();
    const clean = raw.replace(/\D/g, '');
    if (clean.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const patient = await findPatientByPhone(clean);
      if (patient) {
        setSession({
          role: 'patient',
          patientId: patient.id,
          phone: patient.phone,
          name: patient.name,
        });
      } else {
        // Patient not found: open registration with phone pre-filled
        setPatientPhone(clean);
        setIsRegistering(true);
      }
    } catch {
      setAuthError('Unable to connect to patient database. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Patient registration submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setAuthError('Please enter the patient full name.');
      return;
    }
    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const created: Patient = await registerPatient({
        name: regName.trim(),
        phone: cleanPhone,
        age: regAge.trim() || '30',
        gender: regGender,
        hospitalId: regHospitalId,
      });
      setSession({
        role: 'patient',
        patientId: created.id,
        phone: created.phone,
        name: created.name,
      });
    } catch {
      setAuthError('Registration failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Staff login submit
  const handleStaffLogin = (user: string, pass: string) => {
    setAuthError(null);
    const match = STAFF_ROSTER.find((s) => s.username === user && s.password === pass);
    if (!match) {
      setAuthError('Invalid staff credentials.');
      return;
    }
    setSession({
      role: 'staff',
      staffName: match.name,
      username: match.username,
      roleTitle: match.roleTitle,
    });
  };

  /* ========================================================================
   * 1. UNAUTHENTICATED STATE: ROOT AUTHENTICATION PORTAL
   * ======================================================================== */
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans">
        {/* Top brand header */}
        <header className="mx-auto w-full max-w-5xl flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-bold">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">Sanctuary+</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                  v1.0 Healthcare
                </span>
              </div>
              <p className="text-xs text-slate-400">AI-Powered Hospital Queue & Clinical Operating System</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hospital Services Live</span>
          </div>
        </header>

        {/* Central Authentication Card */}
        <main className="mx-auto w-full max-w-xl my-6">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 text-slate-800">
            {/* Header / Description */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Hospital Access Portal</h2>
              <p className="text-sm text-slate-500 mt-1">Select your access role to proceed to the system</p>
            </div>

            {/* Custom Segmented Switcher (Patient vs Staff) */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('patient');
                  setAuthError(null);
                  setIsRegistering(false);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${authTab === 'patient'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <User className="h-4 w-4 text-teal-600" />
                <span>Patient Portal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('staff');
                  setAuthError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${authTab === 'staff'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span>Staff & Clinicians</span>
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* ================= PATIENT PORTAL TAB ================= */}
            {authTab === 'patient' && (
              <div>
                {!isRegistering ? (
                  <div>
                    <div className="mb-5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Mobile Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-medium">
                          +91
                        </div>
                        <input
                          type="tel"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePatientPhoneSubmit()}
                          placeholder="9000011111"
                          maxLength={15}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium text-base focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 outline-none transition"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Enter your registered number to view your active tokens, track queue progress, or book a consultation.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => handlePatientPhoneSubmit()}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {authLoading ? (
                        <span>Checking records...</span>
                      ) : (
                        <>
                          <span>Continue to Patient Portal</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    {/* Quick Demo Patients */}
                    <div className="mt-6 pt-5 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                        Quick Demo Patients (Click to test)
                      </p>
                      <div className="grid gap-2">
                        {DEMO_PATIENTS.map((p) => (
                          <button
                            key={p.phone}
                            type="button"
                            onClick={() => {
                              setPatientPhone(p.phone);
                              handlePatientPhoneSubmit(p.phone);
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-between text-left transition group cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-900">{p.name}</p>
                              <p className="text-xs text-slate-400">+91 {p.phone}</p>
                            </div>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800">
                              {p.note}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setPatientPhone('');
                            setIsRegistering(true);
                          }}
                          className="w-full py-2.5 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center justify-center gap-1 mt-1 cursor-pointer"
                        >
                          + New Patient Registration
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* New Patient Registration Form */
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">New Patient Registration</h3>
                        <p className="text-xs text-slate-500">Provide basic information to register your profile</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRegistering(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                      >
                        Back to Login
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Ananya Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Age *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={120}
                          value={regAge}
                          onChange={(e) => setRegAge(e.target.value)}
                          placeholder="28"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Gender *</label>
                        <select
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Phone *</label>
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="9000011111"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Hospital *</label>
                      <select
                        value={regHospitalId}
                        onChange={(e) => setRegHospitalId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                      >
                        {bootstrapHospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {authLoading ? 'Registering...' : 'Register & Enter Queue Portal'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ================= STAFF PORTAL TAB ================= */}
            {authTab === 'staff' && (
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Quick Sign-In (Click to authenticate)
                  </p>
                  <div className="grid gap-2 mb-4">
                    {STAFF_ROSTER.map((s) => (
                      <button
                        key={s.username}
                        type="button"
                        onClick={() => handleStaffLogin(s.username, s.password)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 flex items-center justify-between text-left transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                            {s.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-900">{s.name}</p>
                            <p className="text-xs text-slate-500">{s.roleTitle}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Sign In <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 font-semibold">Or enter credentials</span>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleStaffLogin(staffUsername, staffPassword);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Username</label>
                    <input
                      type="text"
                      value={staffUsername}
                      onChange={(e) => setStaffUsername(e.target.value)}
                      placeholder="staff@hospital.demo"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                    <input
                      type="password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow transition cursor-pointer"
                  >
                    Authenticate as Staff
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>

        {/* Footer Disclaimer */}
        <footer className="mx-auto w-full max-w-5xl text-center py-4 border-t border-white/5">
          <p className="text-xs text-slate-400">
            Emergency Notice: For critical life-threatening conditions, please report directly to the Emergency
            Department triage or dial <span className="text-rose-400 font-semibold">112 / 108</span> immediately.
          </p>
        </footer>
      </div>
    );
  }

  /* ========================================================================
   * 2. PATIENT SESSION: RESTRICTED TO PATIENT QUEUE / TOKEN PORTAL
   * ======================================================================== */
  if (session.role === 'patient') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        {/* Patient Shell Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">Sanctuary+</h1>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                    Patient Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400">Live Hospital Queue & Token Tracker</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800">{session.name ?? 'Patient'}</span>
                <span className="text-[11px] text-slate-400">{session.phone ? `+91 ${session.phone}` : 'Verified'}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span>Exit Portal</span>
              </button>
            </div>
          </div>
        </header>

        {/* Patient Viewport */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
          <QueuePage session={session} onLogout={handleLogout} onSessionChange={setSession} />
        </main>
      </div>
    );
  }

  /* ========================================================================
   * 3. STAFF SESSION: FULL PLATFORM ACCESS (ALL 7 MODULES)
   * ======================================================================== */
  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePanel} />;
      case 'queue':
        return <QueuePage session={session} onLogout={handleLogout} onSessionChange={setSession} />;
      case 'documentation':
        return <DocumentationPage />;
      case 'medications':
        return <MedicationsPage />;
      case 'risk':
        return <RiskPage />;
      case 'wardsync':
        return <WardSyncPage />;
      case 'chronos':
        return <ChronosPage />;
      default:
        return null;
    }
  };

  const staffInitials = session.staffName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Staff Platform Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-sm font-bold">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">Sanctuary+</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                  Clinical Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400">AI-Powered Hospital Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                {staffInitials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{session.staffName}</p>
                <p className="text-[10px] text-teal-300 leading-tight">{session.roleTitle ?? 'Operations Staff'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-200 border border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
              title="Log out of staff session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Staff Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {STAFF_NAV_ITEMS.map((item) => {
              const isActive = activePanel === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePanel(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${isActive
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Panel Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {renderPanel()}
      </main>
    </div>
  );
}
