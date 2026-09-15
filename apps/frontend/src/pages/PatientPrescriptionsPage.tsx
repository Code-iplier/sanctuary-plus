import { useEffect, useState } from 'react';
import { CheckCircle2, Pill } from 'lucide-react';
import { getPatientPrescriptions } from '../medikiosk/api';
import type { Session } from '../queue/types';

export default function PatientPrescriptionsPage({ session }: { session: Extract<Session, { role: 'patient' }> }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { void getPatientPrescriptions(session.accessToken ?? '', session.patientId).then(setItems).catch(() => setItems([])); }, [session.accessToken, session.patientId]);
  return <section className="max-w-3xl mx-auto space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Clinician finalized</p><h2 className="text-2xl font-bold text-slate-900">Prescriptions</h2></div>{items.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No finalized prescriptions yet.</div> : items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-teal-50 p-3"><Pill className="h-5 w-5 text-teal-700" /></div><div className="flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{item.medicationName}</h3><span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Finalized</span></div><p className="mt-2 text-sm text-slate-700">{item.strength} · {item.dose} {item.unit} · {item.route}</p><p className="mt-1 text-sm text-slate-700">{item.frequency} for {item.duration}</p>{item.instructions && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{item.instructions}</p>}</div></div></article>)}</section>;
}
