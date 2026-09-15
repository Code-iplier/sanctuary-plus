import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, FileText, HeartPulse, Loader2, Pill, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import type { Session } from '../queue/types';
import { getFamilyMemberDocumentContent, getFamilyMemberHealthSummary, getFamilyMemberReportPdf } from '../medikiosk/api';
import { presentClinicalValue } from '../medikiosk/presentation';

type Props = { session: Extract<Session, { role: 'patient' }> };

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function typeLabel(value: string | undefined): string {
  return String(value ?? 'Record').replaceAll('_', ' ').toLocaleLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function originLabel(origin: any): string {
  if (origin?.type === 'DOCUMENT') return 'From a medical report';
  if (origin?.type === 'FAMILY_HISTORY') return `Family history${origin.relationship ? ` · ${origin.relationship}` : ''}`;
  if (origin?.type === 'AYUSH_HISTORY') return 'AYUSH information';
  return 'From a hospital visit';
}

function DetailCard({ title, icon, items, empty }: { title: string; icon: ReactNode; items: any[]; empty: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">{icon}{title}</h3>{items.length === 0 ? <p className="mt-4 text-sm italic text-slate-400">{empty}</p> : <div className="mt-4 space-y-2">{items.map((item) => <div key={item.id ?? `${title}-${item.name}`} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{item.name}</p>{item.summary && item.summary !== item.name && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{item.summary}</p>}</div>)}</div>}</section>;
}

export default function PatientFamilyPage({ session }: Props) {
  const [abhaId, setAbhaId] = useState('');
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = abhaId.trim().toUpperCase();
    if (!value) { setMessage('Please enter the family member’s ABHA ID.'); return; }
    setLoading(true); setMessage(null); setRecord(null); setSelectedProblem(null);
    try {
      const result = await getFamilyMemberHealthSummary(session.accessToken ?? '', value);
      setAbhaId(result.member.abhaId ?? value);
      setRecord(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not find that family record.');
    } finally { setLoading(false); }
  };

  const openBlob = async (id: string, loader: () => Promise<Blob>, filename: string) => {
    setOpeningId(id); setMessage(null);
    try {
      const blob = await loader();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setMessage(error instanceof Error ? error.message : `Unable to open ${filename}.`); }
    finally { setOpeningId(null); }
  };

  const summary = record?.historySummary;
  const importantProblems = Array.isArray(summary?.importantProblems) ? summary.importantProblems : [];
  const personal = summary?.personal ?? {};
  const family = Array.isArray(summary?.family?.problems) ? summary.family.problems : [];
  const ayush = Array.isArray(summary?.ayush?.items) ? summary.ayush.items : [];
  const reports = Array.isArray(record?.reports) ? record.reports : [];
  const documents = Array.isArray(record?.documents) ? record.documents : [];

  return <section className="mx-auto max-w-5xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Family care</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Family health records</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Enter a family member’s ABHA ID to see the health information and reports they have shared with you.</p></div>
    <form onSubmit={search} className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5 shadow-sm"><label htmlFor="family-abha-id" className="block text-sm font-bold text-slate-800">Family member ABHA ID</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="family-abha-id" value={abhaId} onChange={(event) => setAbhaId(event.target.value)} placeholder="Example: ABHA-SYN-10003" autoCapitalize="characters" autoComplete="off" className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-base font-medium tracking-wide text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /><button type="submit" disabled={loading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />}{loading ? 'Finding record…' : 'View family record'}</button></div><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-teal-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Only view records for a family member who has given you permission. This local build uses ABHA ID as the family-sharing lookup.</p></form>
    {message && <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{message}</div>}
    {!record && !loading && !message && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><UsersRound className="mx-auto h-10 w-10 text-teal-600" /><h3 className="mt-4 text-lg font-bold text-slate-900">Keep your family’s records together</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Ask your family member for their ABHA ID and make sure they have agreed to share their health information with you.</p></div>}
    {record && <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-2xl bg-teal-50 p-3 text-teal-700"><UserRound className="h-7 w-7" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Family member record</p><h3 className="mt-1 text-2xl font-bold text-slate-900">{record.member.name}</h3><p className="mt-1 text-sm text-slate-500">ABHA ID: <span className="font-semibold text-slate-700">{record.member.abhaId}</span></p></div></div><button type="button" onClick={() => { setRecord(null); setSelectedProblem(null); }} className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" />Close record</button></div><div className="mt-5 grid gap-3 sm:grid-cols-4">{[['Age', record.member.age ?? 'Not recorded'], ['Gender', record.member.gender ?? 'Not recorded'], ['Blood group', record.member.bloodGroup ?? 'Not recorded'], ['Language', record.member.preferredLanguage ?? 'Not recorded']].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}</div></section>
      <section className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-white p-3 text-teal-700"><HeartPulse className="h-6 w-6" /></div><div><h3 className="text-lg font-bold text-slate-900">Important health information</h3><p className="mt-1 text-sm text-slate-600">Select an item to see where it came from.</p></div></div>{importantProblems.length === 0 ? <p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-500">No summarized health information is available yet.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{importantProblems.map((problem: any) => <button type="button" key={problem.id} onClick={() => setSelectedProblem(problem)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h4 className="text-base font-bold text-slate-900">{problem.name}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{problem.summary}</p></div><span className="text-xl text-slate-400">›</span></div><div className="mt-3 flex flex-wrap gap-1.5">{(problem.origins ?? []).slice(0, 2).map((origin: any, index: number) => <span key={`${problem.id}-${index}`} className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">{originLabel(origin)}</span>)}</div></button>)}</div>}
        {selectedProblem && <div className="mt-5 rounded-2xl border border-teal-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Health detail</p><h4 className="mt-1 text-lg font-bold text-slate-900">{selectedProblem.name}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedProblem.summary}</p></div><button type="button" onClick={() => setSelectedProblem(null)} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50">Close</button></div><div className="mt-4 space-y-2">{(selectedProblem.origins ?? []).map((origin: any, index: number) => <div key={`${selectedProblem.id}-detail-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><p className="font-semibold">{originLabel(origin)}</p>{origin.details && <p className="mt-1 text-xs text-slate-500">{origin.details}</p>}</div>)}{(selectedProblem.evidence ?? []).filter((evidence: any) => evidence.excerpt).map((evidence: any) => <p key={evidence.id} className="rounded-xl border-l-4 border-teal-300 bg-slate-50 p-3 text-sm leading-6 text-slate-700">“{evidence.excerpt}”</p>)}</div></div>}
      </section>
      <div className="grid gap-4 md:grid-cols-2"><DetailCard title="Current concerns" icon={<HeartPulse className="h-4 w-4 text-teal-600" />} items={personal.currentProblems ?? []} empty="No current concerns recorded." /><DetailCard title="Past health history" icon={<CalendarDays className="h-4 w-4 text-slate-500" />} items={personal.pastConditions ?? []} empty="No past conditions recorded." /><DetailCard title="Medicines" icon={<Pill className="h-4 w-4 text-emerald-600" />} items={personal.medications ?? []} empty="No medicines mentioned." /><DetailCard title="Allergies" icon={<AlertCircle className="h-4 w-4 text-amber-600" />} items={personal.allergies ?? []} empty="No allergies mentioned." /><DetailCard title="Family history" icon={<UsersRound className="h-4 w-4 text-indigo-600" />} items={family} empty="No family history recorded." /><DetailCard title="AYUSH information" icon={<FileText className="h-4 w-4 text-teal-600" />} items={ayush} empty="No AYUSH information recorded." /></div>
      <section className="space-y-3"><div><h3 className="text-lg font-bold text-slate-900">Hospital visits and reports</h3><p className="mt-1 text-sm text-slate-500">Open a verified hospital report or a relevant uploaded record.</p></div>{reports.length === 0 && documents.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-7 text-sm text-slate-500">No reports are available for sharing yet.</div> : <div className="grid gap-3 md:grid-cols-2">{reports.map((report: any) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Patient-verified hospital report</p><h4 className="mt-1 text-base font-bold text-slate-900">{typeLabel(record.visits?.find((visit: any) => visit.id === report.encounterId)?.type)} visit</h4><p className="mt-1 text-xs text-slate-500">Updated {formatDate(report.updatedAt)} · {typeLabel(report.status)}</p></div></div><button type="button" disabled={openingId === `report-${report.id}`} onClick={() => void openBlob(`report-${report.id}`, () => getFamilyMemberReportPdf(session.accessToken ?? '', record.member.abhaId, report.encounterId), 'the hospital report')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 px-3 py-2.5 text-sm font-semibold text-teal-700 disabled:opacity-60">{openingId === `report-${report.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Open hospital report</button></article>)}{documents.map((document: any) => <article key={document.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{typeLabel(document.documentType)}</p><h4 className="mt-1 text-base font-bold text-slate-900">{document.title}</h4><p className="mt-1 text-xs text-slate-500">{formatDate(document.documentDate)} · {document.sourceOrganization}</p></div></div><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Report details</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{presentClinicalValue(document.extractedData)}</p></div><button type="button" disabled={!document.originalFileAvailable || openingId === `document-${document.id}`} onClick={() => void openBlob(`document-${document.id}`, () => getFamilyMemberDocumentContent(session.accessToken ?? '', record.member.abhaId, document.id), 'the original record')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{openingId === `document-${document.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{document.originalFileAvailable ? 'Open original record' : 'Original file unavailable'}</button></article>)}</div>}</section>
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"><strong>Privacy reminder:</strong> This page shows another person’s health information. Keep it private and only view it with their permission. The information is not a diagnosis or medical advice.</p>
    </>}
  </section>;
}
