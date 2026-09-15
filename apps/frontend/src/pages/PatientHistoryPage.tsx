import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, ChevronRight, Clock3, FileText, HeartPulse, Pill, Users } from 'lucide-react';
import { getActivePatientEncounter, getEncounterWorkflow } from '../medikiosk/api';
import type { Session } from '../queue/types';

type Props = { session: Extract<Session, { role: 'patient' }> };

function originLabel(origin: any): string {
  if (origin?.type === 'FAMILY_HISTORY') return origin.relationship ? `Family history · ${origin.relationship}` : 'Family history';
  if (origin?.type === 'DOCUMENT') return 'From your uploaded record';
  if (origin?.type === 'AYUSH_HISTORY') return 'AYUSH information';
  return 'From your conversation';
}

function ProblemCard({ problem, onSelect }: { problem: any; onSelect: (problem: any) => void }) {
  return <button type="button" onClick={() => onSelect(problem)} className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">{problem.name}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{problem.summary}</p></div><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{(problem.origins ?? []).slice(0, 2).map((origin: any, index: number) => <span key={`${problem.id}-origin-${index}`} className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">{originLabel(origin)}</span>)}</div>
  </button>;
}

function SmallSection({ title, icon, items, empty }: { title: string; icon: ReactNode; items: any[]; empty: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">{icon}{title}</h3>{items.length === 0 ? <p className="mt-4 text-sm italic text-slate-400">{empty}</p> : <div className="mt-4 space-y-2">{items.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{item.name}</p>{item.summary && item.summary !== item.name && <p className="mt-1 text-xs leading-5 text-slate-600">{item.summary}</p>}</div>)}</div>}</section>;
}

export default function PatientHistoryPage({ session }: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    void getActivePatientEncounter(session.accessToken ?? '', session.patientId)
      .then((active) => active?.id ? getEncounterWorkflow(session.accessToken ?? '', active.id) : null)
      .then((data) => {
        if (cancelled) return;
        setSummary(data?.historySummary ?? null);
        if (!data) setMessage('Your current visit has not started yet. Your health information will appear here after MediKiosk intake.');
      })
      .catch(() => { if (!cancelled) setMessage('Unable to load your health information right now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session.accessToken, session.patientId]);

  const importantProblems = useMemo(() => Array.isArray(summary?.importantProblems) ? summary.importantProblems : [], [summary]);
  const personal = summary?.personal ?? {};
  const family = Array.isArray(summary?.family?.problems) ? summary.family.problems : [];
  const ayush = Array.isArray(summary?.ayush?.items) ? summary.ayush.items : [];

  return <section className="mx-auto max-w-5xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Your health information</p><h2 className="mt-1 text-2xl font-bold text-slate-900">My health history</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">A simple view of what you told MediKiosk and what was read from your uploaded records. Your doctor reviews this information before using it.</p></div>
    {message && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">{message}</div>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your health information…</div> : summary && <>
      <section className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-white p-3 text-teal-700"><HeartPulse className="h-6 w-6" /></div><div><h3 className="text-lg font-bold text-slate-900">Important information for your doctor</h3><p className="mt-1 text-sm text-slate-600">Tap any item to see the details we captured.</p></div></div>{importantProblems.length === 0 ? <p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-500">No health concerns have been captured for this visit yet.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{importantProblems.map((problem: any) => <ProblemCard key={problem.id} problem={problem} onSelect={setSelectedProblem} />)}</div>}
        {selectedProblem && <div className="mt-5 rounded-2xl border border-teal-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Captured detail</p><h3 className="mt-1 text-lg font-bold text-slate-900">{selectedProblem.name}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{selectedProblem.summary}</p></div><button type="button" onClick={() => setSelectedProblem(null)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">Close</button></div><div className="mt-4 space-y-2">{(selectedProblem.origins ?? []).map((origin: any, index: number) => <div key={`selected-origin-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><p className="font-semibold">{originLabel(origin)}</p>{origin.details && <p className="mt-1 text-xs text-slate-500">{origin.details}</p>}</div>)}{(selectedProblem.evidence ?? []).filter((evidence: any) => evidence.excerpt).map((evidence: any) => <div key={evidence.id} className="rounded-xl border-l-4 border-teal-300 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">What was captured</p><p className="mt-1 text-sm leading-6 text-slate-700">“{evidence.excerpt}”</p></div>)}</div></div>}
      </section>
      <div className="grid gap-4 md:grid-cols-2"><SmallSection title="Current concerns" icon={<Activity className="h-4 w-4 text-teal-600" />} items={personal.currentProblems ?? []} empty="No current concerns recorded." /><SmallSection title="Past health history" icon={<Clock3 className="h-4 w-4 text-slate-500" />} items={personal.pastConditions ?? []} empty="No past conditions recorded." /><SmallSection title="Medicines" icon={<Pill className="h-4 w-4 text-emerald-600" />} items={personal.medications ?? []} empty="No medicines mentioned." /><SmallSection title="Allergies" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} items={personal.allergies ?? []} empty="No allergies mentioned." /><SmallSection title="Family history" icon={<Users className="h-4 w-4 text-indigo-600" />} items={family} empty="No family history recorded." /><SmallSection title="AYUSH information" icon={<FileText className="h-4 w-4 text-teal-600" />} items={ayush} empty="No AYUSH information recorded." /></div>
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"><strong>Important:</strong> This is a record of information captured from you or your documents. It is not a diagnosis or medical advice. Please speak with your doctor if anything is incorrect.</p>
    </>}
  </section>;
}
