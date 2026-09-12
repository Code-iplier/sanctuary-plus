import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
  User,
} from 'lucide-react';
import { findPatientByPhone, fetchBootstrap, registerPatient } from '../queue/api';
import type { DemoState, Patient, Session } from '../queue/types';
import { loginPatient, loginStaff } from '../auth/api';

type AuthPageProps = {
  onAuthenticated: (session: Exclude<Session, null>) => void;
};

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
] as const;

const DEMO_PATIENTS = [
  { name: 'Ananya Sharma', phone: '9000011111', note: 'Token A-21 (Waiting)' },
  { name: 'Imran Ali', phone: '9000044444', note: 'Token A-24 (In Consult)' },
  { name: 'Priya Nambiar', phone: '9000055555', note: 'No Active Token' },
] as const;

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [authTab, setAuthTab] = useState<'patient' | 'staff'>('patient');
  const [patientPhone, setPatientPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Female');
  const [regHospitalId, setRegHospitalId] = useState('h1');
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([
    { id: 'h1', name: 'City General Hospital' },
    { id: 'h2', name: 'Metro Memorial Hospital' },
    { id: 'h3', name: 'Apollo Speciality Clinic' },
  ]);
  const [staffUsername, setStaffUsername] = useState<string>(
    STAFF_ROSTER[0].username,
  );
  const [staffPassword, setStaffPassword] = useState<string>(
    STAFF_ROSTER[0].password,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBootstrap()
      .then((state: DemoState) => {
        if (state.hospitals?.length) {
          setHospitals(state.hospitals);
          setRegHospitalId(state.hospitals[0].id);
        }
      })
      .catch(() => undefined);
  }, []);

  const switchTab = (tab: 'patient' | 'staff') => {
    setAuthTab(tab);
    setError(null);
    if (tab === 'staff') setIsRegistering(false);
  };

  const authenticatePatient = async (phoneInput = patientPhone) => {
    const phone = phoneInput.replace(/\D/g, '');
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const patient = await findPatientByPhone(phone);
      if (!patient) {
        setPatientPhone(phone);
        setIsRegistering(true);
        return;
      }
      const auth = await loginPatient({
        patientId: patient.id,
        phone: patient.phone,
        name: patient.name,
      }).catch(() => null);
      onAuthenticated({
        role: 'patient',
        patientId: patient.id,
        phone: patient.phone,
        name: patient.name,
        accessToken: auth?.accessToken,
      });
    } catch {
      setError('Unable to connect to patient database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = patientPhone.replace(/\D/g, '');
    if (!regName.trim() || phone.length < 10) {
      setError(
        !regName.trim()
          ? 'Please enter the patient full name.'
          : 'Please enter a valid 10-digit mobile number.',
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const patient: Patient = await registerPatient({
        name: regName.trim(),
        phone,
        age: regAge.trim() || '30',
        gender: regGender,
        hospitalId: regHospitalId,
      });
      const auth = await loginPatient({
        patientId: patient.id,
        phone: patient.phone,
        name: patient.name,
      }).catch(() => null);
      onAuthenticated({
        role: 'patient',
        patientId: patient.id,
        phone: patient.phone,
        name: patient.name,
        accessToken: auth?.accessToken,
      });
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const authenticateStaff = async (username = staffUsername, password = staffPassword) => {
    const staff = STAFF_ROSTER.find(
      (candidate) => candidate.username === username && candidate.password === password,
    );
    if (!staff) {
      setError('Invalid staff credentials.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const auth = await loginStaff(username, password).catch(() => null);
      onAuthenticated({
        role: 'staff',
        staffName: staff.name,
        username: staff.username,
        roleTitle: staff.roleTitle,
        accessToken: auth?.accessToken,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans">
      <header className="mx-auto w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">Sanctuary+</span>
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                v1.0 Healthcare
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Powered Hospital Queue & Clinical Operating System</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Hospital Services Live
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl my-6">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 text-slate-800">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Hospital Access Portal</h2>
            <p className="text-sm text-slate-500 mt-1">Select your access role to proceed to the system</p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button type="button" onClick={() => switchTab('patient')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold ${authTab === 'patient' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`}>
              <User className="h-4 w-4 text-teal-600" /> Patient Portal
            </button>
            <button type="button" onClick={() => switchTab('staff')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold ${authTab === 'staff' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`}>
              <ShieldCheck className="h-4 w-4 text-teal-600" /> Staff & Clinicians
            </button>
          </div>

          {error && <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" /><span>{error}</span></div>}

          {authTab === 'patient' && !isRegistering && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mobile Phone Number</label>
              <input type="tel" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && authenticatePatient()} placeholder="9000011111" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900" />
              <p className="text-xs text-slate-400 mt-2">Enter your registered number to view your active tokens and medication information.</p>
              <button type="button" disabled={loading} onClick={() => authenticatePatient()} className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Checking records...' : <>Continue to Patient Portal <ArrowRight className="h-4 w-4" /></>}
              </button>
              <div className="mt-6 pt-5 border-t border-slate-100 grid gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Demo Patients</p>
                {DEMO_PATIENTS.map((patient) => <button key={patient.phone} type="button" onClick={() => { setPatientPhone(patient.phone); void authenticatePatient(patient.phone); }} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-left"><span><span className="block text-sm font-semibold">{patient.name}</span><span className="text-xs text-slate-400">+91 {patient.phone}</span></span><span className="text-xs text-slate-500">{patient.note}</span></button>)}
                <button type="button" onClick={() => { setPatientPhone(''); setIsRegistering(true); }} className="py-2.5 text-xs font-semibold text-teal-700">+ New Patient Registration</button>
              </div>
            </div>
          )}

          {authTab === 'patient' && isRegistering && (
            <form onSubmit={register} className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">New Patient Registration</h3><button type="button" onClick={() => setIsRegistering(false)} className="text-xs text-slate-500">Back to Login</button></div>
              <input required value={regName} onChange={(event) => setRegName(event.target.value)} placeholder="Full name" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="number" min={1} max={120} value={regAge} onChange={(event) => setRegAge(event.target.value)} placeholder="Age" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" /><select value={regGender} onChange={(event) => setRegGender(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"><option>Female</option><option>Male</option><option>Other</option></select></div>
              <input required type="tel" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} placeholder="Mobile phone" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" />
              <select value={regHospitalId} onChange={(event) => setRegHospitalId(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">{hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-sm disabled:opacity-50">{loading ? 'Registering...' : 'Register & Enter Queue Portal'}</button>
            </form>
          )}

          {authTab === 'staff' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Sign-In</p>
              <div className="grid gap-2">{STAFF_ROSTER.map((staff) => <button key={staff.username} type="button" onClick={() => void authenticateStaff(staff.username, staff.password)} className="w-full px-4 py-3 rounded-xl border border-slate-200 flex items-center justify-between text-left"><span className="flex items-center gap-3"><span className="h-9 w-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">{staff.initials}</span><span><span className="block text-sm font-semibold">{staff.name}</span><span className="text-xs text-slate-500">{staff.roleTitle}</span></span></span><ChevronRight className="h-4 w-4 text-teal-600" /></button>)}</div>
              <div className="border-t border-slate-100 pt-4 space-y-3"><input value={staffUsername} onChange={(event) => setStaffUsername(event.target.value)} placeholder="Staff username" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" /><input type="password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} placeholder="Password" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" /><button type="button" disabled={loading} onClick={() => void authenticateStaff()} className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm disabled:opacity-50">Authenticate as Staff</button></div>
            </div>
          )}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl text-center py-4 border-t border-white/5"><p className="text-xs text-slate-400">Emergency Notice: For critical life-threatening conditions, report directly to Emergency Department triage or dial <span className="text-rose-400 font-semibold">112 / 108</span>.</p></footer>
    </div>
  );
}
