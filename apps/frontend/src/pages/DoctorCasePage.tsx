import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Brain, CheckCircle2, ChevronRight, FileText, FileSearch, MessageSquare, Play, RefreshCw, Save, ShieldAlert, Stethoscope, Users, View, X } from 'lucide-react';
import type { Session } from '../queue/types';
import {
  finalizeConsultation,
  getEncounterWorkflow, getIntakeReportPdf, getStaffEncounters,
  getPatientDocumentContent,
  reviewPatientDocument,
  reviewClinicalFact,
  startConsultation,
  transcribeConsultation,
  updateIntakeReport,
} from '../medikiosk/api';
import { humanizeClinicalKey, presentClinicalValue, REPORT_FIELDS } from '../medikiosk/presentation';

type Props = { session: Extract<Session, { role: 'staff' }> };

function readableTranscript(value: unknown): Array<{ speaker: string; text: string }> {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'object' && entry !== null) {
        const item = entry as Record<string, unknown>;
        return { speaker: String(item.speaker ?? 'Conversation'), text: String(item.text ?? '') };
      }
      return { speaker: 'Conversation', text: String(entry) };
    }).filter((entry) => entry.text.trim());
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(/\r?\n+/).map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s*:?\s*(.*)$/);
    return { speaker: match?.[1]?.trim() || 'Conversation', text: match?.[2]?.trim() || line.trim() };
  }).filter((entry) => entry.text);
}

function readableDocumentType(value: unknown): string {
  return String(value ?? 'Clinical document')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentDetails(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.flatMap((item) => documentDetails(item));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const lines = documentDetails(item);
      return lines.length ? lines.map((line) => `${humanizeClinicalKey(key)}: ${line}`) : [];
    });
  }
  return [String(value)];
}

function patientAge(dateOfBirth: unknown, recordedAge?: unknown): string {
  if (typeof recordedAge === 'number' && recordedAge > 0) return `${recordedAge} years`;
  if (!dateOfBirth) return '';
  const birth = new Date(String(dateOfBirth));
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return `${Math.max(age, 0)} years`;
}

function factSourceLabel(value: unknown): string {
  switch (value) {
    case 'PATIENT_REPORTED': return 'Patient statement';
    case 'DOCUMENT_EXTRACTED': return 'Document extraction';
    case 'AI_DERIVED': return 'AI-derived; review required';
    case 'CLINICIAN_CONFIRMED': return 'Clinician-confirmed record';
    default: return 'Source not classified';
  }
}

function problemOriginLabel(origin: any): string {
  if (origin?.type === 'FAMILY_HISTORY') return origin.relationship ? `Family history · ${origin.relationship}` : 'Family history';
  if (origin?.type === 'DOCUMENT') return 'Supporting document';
  if (origin?.type === 'AYUSH_HISTORY') return 'AYUSH history';
  if (origin?.type === 'CLINICIAN_ENTERED') return 'Clinician entered';
  return 'Patient history';
}

function problemStatusLabel(problem: any): string {
  if (problem?.status === 'REVIEW_REQUIRED') return 'Source conflict · review';
  if (problem?.clinicianConfirmed) return 'Clinician confirmed';
  if (problem?.status === 'MULTI_SOURCE') return 'Multiple sources';
  if (problem?.status === 'DOCUMENTED') return 'Document supported';
  return 'Patient reported';
}

export default function DoctorCasePage({ session }: Props) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [encounter, setEncounter] = useState<any>(null);
  const [reportData, setReportData] = useState<Record<string, unknown>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<any>(null);
  const [supportingDocumentation, setSupportingDocumentation] = useState<any[]>([]);
  const [prescription, setPrescription] = useState({ medicationName: '', strength: '', dose: '', unit: 'mg', route: 'oral', frequency: '', duration: '', instructions: '' });
  const [nextStep, setNextStep] = useState({ type: 'LAB_TEST', title: '', destinationName: '', preparation: '', timing: '' });
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [factCorrection, setFactCorrection] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
  const accessToken = session.accessToken ?? '';

  const refreshTickets = async () => {
    const candidates = await getStaffEncounters(accessToken);
    setTickets(candidates);
    if (!selectedId && candidates[0]?.id) setSelectedId(candidates[0].id);
  };

  useEffect(() => {
    void refreshTickets().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load cases'));
    const timer = window.setInterval(() => {
      void refreshTickets().catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [accessToken]);

  useEffect(() => {
    if (!selectedId) {
      setEncounter(null);
      setConsultation(null);
      setReportData({});
      setPdfUrl(null);
      setSupportingDocumentation([]);
      return;
    }
    let cancelled = false;
    setEncounter(null);
    setConsultation(null);
    setReportData({});
    setPdfUrl(null);
    setSupportingDocumentation([]);
    setSelectedProblem(null);
    void getEncounterWorkflow(accessToken, selectedId)
      .then(async (data) => {
        if (cancelled) return;
        setEncounter(data);
        setConsultation(data.consultations?.[0] ?? null);
        const currentKioskSession = data.kioskSessions?.find((candidate: any) => !['ABANDONED', 'CANCELLED'].includes(String(candidate.status))) ?? data.kioskSessions?.[0];
        const latestSessionId = currentKioskSession?.id;
        const currentReport = latestSessionId
          ? data.intakeReports?.find((candidate: any) => candidate.kioskSessionId === latestSessionId)
          : data.intakeReports?.[0];
        const report = (currentReport?.report && typeof currentReport.report === 'object' && Object.keys(currentReport.report).length > 0
          ? currentReport.report
          : currentKioskSession?.clinicalState ?? {}) as Record<string, unknown>;
        setReportData(report);
        setPdfUrl(null);
        if (currentReport?.status === 'PATIENT_VERIFIED' || currentReport?.status === 'CLINICIAN_CONFIRMED') {
          const pdf = await getIntakeReportPdf(accessToken, selectedId);
          if (cancelled) return;
          setPdfUrl(URL.createObjectURL(pdf));
        }
        setSupportingDocumentation(Array.isArray(data.documents) ? data.documents : []);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Unable to load encounter');
      });
    return () => { cancelled = true; };
  }, [accessToken, selectedId]);

  const ticket = useMemo(() => tickets.find((candidate) => candidate.id === selectedId), [selectedId, tickets]);
  const transcriptEntries = useMemo(() => readableTranscript(reportData.transcript), [reportData.transcript]);
  const triage = (reportData.clinicianTriage ?? {}) as Record<string, any>;
  const displayKioskSession = encounter?.kioskSessions?.find((candidate: any) => !['ABANDONED', 'CANCELLED'].includes(String(candidate.status))) ?? encounter?.kioskSessions?.[0];
  const historySummary = encounter?.historySummary as any;
  const importantProblems = Array.isArray(historySummary?.importantProblems) ? historySummary.importantProblems : [];
  const historyConflicts = Array.isArray(historySummary?.conflicts) ? historySummary.conflicts : [];

  const confirmReport = async () => {
    try {
      await updateIntakeReport(accessToken, selectedId, reportData);
      setMessage('AI intake confirmed by clinician.');
      const data = await getEncounterWorkflow(accessToken, selectedId);
      setEncounter(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to confirm the intake report'); }
  };

  const beginConsultation = async () => {
    try {
      const value = await startConsultation(accessToken, selectedId);
      setConsultation(value);
      setMessage('Consultation started.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to start consultation'); }
  };

  const finalize = async () => {
    if (!consultation) return;
    try {
      const prescriptions = prescription.medicationName.trim() ? [prescription] : [];
      const nextSteps = nextStep.title.trim() ? [nextStep] : [];
      await finalizeConsultation(accessToken, consultation.id, { prescriptions, nextSteps });
      setMessage('Clinical decisions finalized. Patient instructions are now visible.');
      const data = await getEncounterWorkflow(accessToken, selectedId);
      setEncounter(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to finalize consultation'); }
  };

  const startRecording = async () => {
    if (!consultation) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setTranscribing(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        const updated = await transcribeConsultation(accessToken, consultation.id, { audioBase64: base64, mimeType: blob.type, filename: 'consultation.webm' });
        setConsultation(updated);
        setMessage('Consultation audio transcribed. Review it before finalizing.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to transcribe consultation audio'); } finally { setTranscribing(false); }
    };
    recorder.start(250);
    recorderRef.current = recorder;
    streamRef.current = stream;
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const refreshEncounter = async () => {
    const data = await getEncounterWorkflow(accessToken, selectedId);
    setEncounter(data);
    setSupportingDocumentation(Array.isArray(data.documents) ? data.documents : []);
  };

  const viewDocument = async (document: any) => {
    try {
      const blob = await getPatientDocumentContent(accessToken, document.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The original document is not available.');
    }
  };

  const reviewDocument = async (document: any) => {
    try {
      await reviewPatientDocument(accessToken, document.id);
      await refreshEncounter();
      setMessage('Document marked as reviewed. Its extracted details remain available for your clinical assessment.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to mark this document as reviewed.');
    }
  };

  const reviewFact = async (fact: any, status: 'ACCEPTED' | 'REJECTED' | 'UNCERTAIN') => {
    if (!displayKioskSession?.id) return;
    try {
      await reviewClinicalFact(accessToken, displayKioskSession.id, fact.id, {
        status,
        ...(status === 'ACCEPTED' && factCorrection.trim() ? { correctedValue: factCorrection.trim() } : {}),
      });
      setEditingFactId(null);
      setFactCorrection('');
      await refreshEncounter();
      setMessage(status === 'ACCEPTED' ? 'Fact accepted and saved to the clinician review trail.' : `Fact marked ${status.toLowerCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to review this fact.');
    }
  };

  const confirmProblem = async (problem: any) => {
    const evidenceIds = new Set((problem.origins ?? []).flatMap((origin: any) => origin.evidenceIds ?? []));
    const fact = (displayKioskSession?.facts ?? []).find((candidate: any) => {
      const transcriptId = candidate.transcriptEntry?.id ? `transcript:${candidate.transcriptEntry.id}` : '';
      return evidenceIds.has(transcriptId) || evidenceIds.has(`transcript:${candidate.id}`);
    });
    if (!fact) {
      setMessage('This summary has no editable intake fact attached. Review the source document or transcript before confirming it.');
      return;
    }
    await reviewFact(fact, 'ACCEPTED');
    setSelectedProblem({ ...problem, clinicianConfirmed: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Doctor workflow</p><h2 className="text-2xl font-bold text-slate-900">AI Intake & Consultation</h2></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => void refreshTickets()} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className="h-4 w-4" /> Refresh patients</button><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Select patient visit</option>
          {tickets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.patient?.displayName} · {candidate.patient?.externalId ?? candidate.patientId} · {candidate.queueStatus ?? candidate.status}</option>)}
        </select></div>
      </div>
      {message && <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
      {!encounter ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Select a patient with a persisted encounter.</div> : <>
        <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">AI-prepared history</p><h3 className="mt-1 text-xl font-bold text-slate-900">Important problems</h3><p className="mt-1 text-sm text-slate-500">Summarized for quick review. Select a problem to see where it came from and inspect the evidence.</p></div>
            <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800"><FileSearch className="h-4 w-4" /> Evidence-first view</div>
          </div>
          {importantProblems.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No clinically relevant problems have been structured yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {importantProblems.map((problem: any) => <button key={problem.id} type="button" onClick={() => setSelectedProblem(problem)} className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${problem.status === 'REVIEW_REQUIRED' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="flex items-start justify-between gap-2"><p className="text-base font-bold text-slate-900">{problem.name}</p><ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></div>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{problem.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{(problem.origins ?? []).slice(0, 2).map((origin: any, index: number) => <span key={`${problem.id}-origin-${index}`} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700">{problemOriginLabel(origin)}</span>)}<span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{problemStatusLabel(problem)}</span></div>
            </button>)}
          </div>}
          {historyConflicts.length > 0 && <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-amber-900"><ShieldAlert className="h-4 w-4" /> Source differences need review</div><p className="mt-1 text-xs leading-5 text-amber-800">The patient statement and an uploaded record do not match exactly. Review the original source before confirming.</p><div className="mt-3 space-y-3">{historyConflicts.map((conflict: any, index: number) => <div key={`${conflict.problemName}-${index}`} className="grid gap-2 rounded-xl bg-white p-3 text-xs md:grid-cols-2"><div><p className="font-bold uppercase tracking-wider text-teal-700">Patient statement</p><p className="mt-1 leading-5 text-slate-700">{conflict.patientStatement}</p></div><div><p className="font-bold uppercase tracking-wider text-indigo-700">Document statement</p><p className="mt-1 leading-5 text-slate-700">{conflict.documentStatement}</p></div></div>)}</div></div>}
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600"><Activity className="h-4 w-4 text-teal-600" /> Personal history</p><div className="mt-3 space-y-2">{(historySummary?.personal?.pastConditions ?? []).slice(0, 4).map((problem: any) => <button type="button" key={`personal-${problem.id}`} onClick={() => setSelectedProblem(problem)} className="block text-left text-sm text-slate-700 hover:text-teal-700">{problem.name}</button>)}{(historySummary?.personal?.pastConditions ?? []).length === 0 && <p className="text-sm text-slate-400">No past conditions reported.</p>}</div></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600"><Users className="h-4 w-4 text-indigo-600" /> Family history</p><div className="mt-3 space-y-2">{(historySummary?.family?.problems ?? []).slice(0, 4).map((problem: any) => <button type="button" key={`family-${problem.id}`} onClick={() => setSelectedProblem(problem)} className="block text-left text-sm text-slate-700 hover:text-indigo-700">{problem.name} · {(problem.origins ?? []).find((origin: any) => origin.type === 'FAMILY_HISTORY')?.relationship ?? 'Family member'}</button>)}{(historySummary?.family?.problems ?? []).length === 0 && <p className="text-sm text-slate-400">No family conditions reported.</p>}</div></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">AYUSH history</p><div className="mt-3 space-y-2">{(historySummary?.ayush?.items ?? []).slice(0, 4).map((problem: any) => <button type="button" key={`ayush-${problem.id}`} onClick={() => setSelectedProblem(problem)} className="block text-left text-sm text-slate-700 hover:text-teal-700">{problem.name}</button>)}{(historySummary?.ayush?.items ?? []).length === 0 && <p className="text-sm text-slate-400">Not assessed or reported.</p>}</div></div>
          </div>
          {selectedProblem && <div className="mt-5 rounded-2xl border-2 border-teal-200 bg-teal-50/40 p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Problem details</p><h4 className="mt-1 text-xl font-bold text-slate-900">{selectedProblem.name}</h4><p className="mt-2 text-sm leading-6 text-slate-700">{selectedProblem.summary}</p></div><button type="button" aria-label="Close problem details" onClick={() => setSelectedProblem(null)} className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Information source</p><div className="mt-2 space-y-2">{(selectedProblem.origins ?? []).map((origin: any, index: number) => <div key={`detail-origin-${index}`} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><p className="font-semibold">{problemOriginLabel(origin)}</p>{origin.details && <p className="mt-1 text-xs text-slate-500">{origin.details}</p>}{origin.side && <p className="mt-1 text-xs text-slate-500">Side: {origin.side}</p>}</div>)}</div></div><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Evidence</p><div className="mt-2 space-y-2">{(selectedProblem.evidence ?? []).map((evidence: any) => { const supportingDocument = evidence.documentId ? supportingDocumentation.find((candidate) => candidate.id === evidence.documentId) : null; return <div key={evidence.id} className="rounded-lg border border-slate-200 p-3"><p className="text-sm font-semibold text-slate-800">{evidence.type === 'DOCUMENT' ? supportingDocument?.title ?? 'Supporting document' : evidence.type === 'TRANSCRIPT' ? 'MediKiosk conversation' : 'MediKiosk intake'}</p>{evidence.excerpt && <p className="mt-1 text-xs leading-5 text-slate-600">“{evidence.excerpt}”</p>}<div className="mt-2 flex flex-wrap gap-2">{evidence.type !== 'DOCUMENT' && <button type="button" onClick={() => globalThis.document.getElementById('intake-transcript')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-lg border border-teal-200 px-2.5 py-1.5 text-xs font-semibold text-teal-700">View conversation</button>}{supportingDocument && evidence.originalFileAvailable && <button type="button" onClick={() => void viewDocument(supportingDocument)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Open original file</button>}</div></div>; })}</div></div></div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-600">Status: {problemStatusLabel(selectedProblem)}</span>{!selectedProblem.clinicianConfirmed && <button type="button" onClick={() => void confirmProblem(selectedProblem)} className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Confirm problem</button>}<button type="button" onClick={() => document.getElementById('intake-facts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Edit source fact</button></div>
          </div>}
        </section>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Patient record passport</p><h3 className="mt-1 text-lg font-bold text-slate-900">{ticket?.patient?.displayName ?? encounter.patient?.displayName}</h3><p className="mt-1 text-xs text-slate-500">Synthetic ABHA ID: {encounter.patient?.externalId ?? encounter.patientId} · {patientAge(encounter.patient?.dateOfBirth, encounter.patient?.age)}{encounter.patient?.gender ? ` · ${encounter.patient.gender}` : ''}{encounter.patient?.bloodGroup ? ` · ${encounter.patient.bloodGroup}` : ''}</p><p className="mt-1 text-xs text-slate-500">Preferred language: {encounter.patient?.preferredLanguage ?? 'Not recorded'} · Visit: {new Date(encounter.startedAt).toLocaleDateString()}</p></div><FileText className="h-6 w-6 text-teal-600" /></div>
            <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-800"><span className="mr-2 text-teal-600">＋</span>View captured intake fields</summary>
              <p className="mt-3 text-xs text-slate-500">Patient-reported fields retained as source context. The problem cards above are the clinician’s quick starting point.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{REPORT_FIELDS.map(([key, label]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">{label}</p><span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Captured</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{presentClinicalValue(reportData[key])}</p></div>)}</div>
            </details>
            <button type="button" onClick={() => void confirmReport()} className="mt-3 flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4" /> Confirm history</button>
            {pdfUrl && <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Patient-verified hospital report</p><iframe title="Patient-verified hospital intake report" src={pdfUrl} className="mt-2 h-96 w-full rounded-xl border border-slate-200" /><a href={pdfUrl} download="sanctuary-plus-intake-report.pdf" className="mt-2 block text-center rounded-xl border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-700">Download report copy</a></div>}
          </section>
          <section className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5"><div className="flex items-center gap-2 text-sm font-bold text-amber-900"><ShieldAlert className="h-5 w-5" /> Safety signals</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-amber-900">{presentClinicalValue(displayKioskSession?.safetySignals ?? 'None reported')}</p><p className="mt-5 text-xs text-amber-800">AI signals require clinical review and never constitute a diagnosis.</p></div>{Boolean(reportData.clinicianTriage) && <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5"><div className="flex items-center gap-2 text-sm font-bold text-indigo-900"><Brain className="h-5 w-5" /> Clinical assessment support</div><div className="mt-4 rounded-xl bg-white/70 p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Suggested queue priority</p><p className="mt-1 text-2xl font-black text-indigo-950">{String(triage.priority ?? 'NORMAL').replace('_', ' ')}</p><p className="mt-1 text-xs text-indigo-700">{triage.mode === 'ACTIVE' ? 'Configured for validated queue automation.' : 'Shadow mode: recorded for review; it has not moved the patient in the queue.'}</p></div><p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-indigo-700">Possible clinical categories</p><div className="mt-2 space-y-2">{(Array.isArray(triage.possibleConditions) ? triage.possibleConditions : []).map((condition: string) => <div key={condition} className="rounded-xl border border-indigo-100 bg-white p-3 text-sm font-semibold text-indigo-950">{condition}</div>)}</div>{Array.isArray(triage.possibleDiagnoses) && triage.possibleDiagnoses.length > 0 && <><p className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700"><Stethoscope className="h-3.5 w-3.5" /> Clinical possibilities to assess</p><div className="mt-2 space-y-2">{triage.possibleDiagnoses.map((diagnosis: any) => <div key={`${diagnosis.name}-${diagnosis.certainty}`} className="rounded-xl border border-indigo-100 bg-white p-3"><p className="text-sm font-bold text-indigo-950">{diagnosis.name}</p><p className="mt-1 text-xs text-indigo-700">{String(diagnosis.certainty ?? 'suggested').replace('_', ' ')} · not a diagnosis</p>{Array.isArray(diagnosis.supportingEvidence) && <p className="mt-2 text-xs leading-5 text-slate-600">Supporting evidence: {diagnosis.supportingEvidence.join('; ')}</p>}</div>)}</div></>}<p className="mt-4 text-sm leading-6 text-indigo-950"><strong>Why this was elevated:</strong> {String(triage.reason ?? 'No automated emergency red flag was identified.')}</p><p className="mt-3 text-xs leading-5 text-indigo-700">{String(triage.disclaimer ?? 'Clinician decision support only; confirm with clinical assessment.')}</p></div>}</section>
        </div>
        <section id="intake-transcript" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-teal-600" /><div><h3 className="text-sm font-bold text-slate-900">Conversation transcript</h3><p className="mt-1 text-xs text-slate-500">The complete saved conversation used for extraction.</p></div></div><div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">{transcriptEntries.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No transcript has been saved yet.</p> : transcriptEntries.map((entry, index) => <div key={`${entry.speaker}-${index}`} className={`rounded-2xl p-4 ${entry.speaker.toLowerCase().includes('patient') ? 'bg-teal-50' : 'bg-slate-50'}`}><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{entry.speaker.toLowerCase().includes('patient') ? 'Patient' : entry.speaker.toLowerCase().includes('assistant') || entry.speaker.toLowerCase().includes('model') ? 'MediKiosk' : entry.speaker}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{entry.text}</p></div>)}</div></section>
        <section id="intake-facts" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-sm font-bold text-slate-900">Prior records and documents</h3><p className="mt-1 text-xs text-slate-500">Source records and their extracted details. Review the original record before relying on an automated reading.</p></div>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          {supportingDocumentation.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No existing documentation record is linked to this patient yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">
            {supportingDocumentation.map((doc) => {
              const isPatientUpload = doc.sourceSystem === 'MediKiosk Patient Portal';
              const isPendingReview = doc.status === 'OCR_REVIEWED';
              const patientConfirmed = Boolean(doc.provenance?.patientConfirmedAt);
              return <article key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-bold text-slate-900">{doc.title}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-teal-700">{readableDocumentType(doc.documentType)}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isPendingReview ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{isPendingReview ? 'Review needed' : 'Clinician reviewed'}</span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p><strong>Source:</strong> {doc.sourceOrganization}</p>
                  <p><strong>Record:</strong> {doc.sourceSystem}{doc.documentNumber ? ` · ${doc.documentNumber}` : ''}</p>
                  <p><strong>Date:</strong> {new Date(doc.documentDate).toLocaleDateString()} · <strong>Language:</strong> {doc.language ?? 'Not identified'}</p>
                </div>
                <div className="mt-3 rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Extracted details</p>{documentDetails(doc.extractedData).length === 0 ? <p className="mt-2 text-xs italic text-slate-500">No extracted details recorded.</p> : <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-700">{documentDetails(doc.extractedData).map((detail, index) => <li key={`${doc.id}-detail-${index}`}>{detail}</li>)}</ul>}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {doc.originalFilename && <button type="button" onClick={() => void viewDocument(doc)} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><View className="h-3.5 w-3.5" /> View original</button>}
                  {isPendingReview && <button type="button" onClick={() => void reviewDocument(doc)} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Mark reviewed</button>}
                </div>
                <p className="mt-3 text-[11px] text-slate-500">{isPatientUpload ? `Uploaded by patient${patientConfirmed ? ' · patient confirmed the extraction' : ' · awaiting patient confirmation'}` : 'Imported synthetic clinical record for local workflow validation'}</p>
              </article>;
            })}
          </div>}
        </section>
        {triage.departmentExtension && <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Approved extension recommended</p>
          <h3 className="mt-1 text-base font-bold text-indigo-950">{String(triage.departmentExtension.name)} · v{String(triage.departmentExtension.version)}</h3>
          <p className="mt-2 text-sm leading-6 text-indigo-900">{String(triage.departmentExtension.purpose)}</p>
          <p className="mt-2 text-xs text-indigo-700">Clinical owner: {String(triage.departmentExtension.clinicianOwner)}. This is a versioned template recommendation, not permission for Live to generate more questions.</p>
        </section>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Record Passport</p><h3 className="mt-1 text-base font-bold text-slate-900">Patient history at a glance</h3><p className="mt-1 text-xs text-slate-500">Cross-visit context retained separately from today’s intake.</p></div><FileText className="h-5 w-5 text-teal-600" /></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Previous visits</p>{(encounter.patient?.encounters ?? []).length === 0 ? <p className="mt-2 text-xs text-slate-500">No visits recorded.</p> : <div className="mt-2 space-y-2">{(encounter.patient?.encounters ?? []).filter((visit: any) => visit.id !== encounter.id).slice(0, 4).map((visit: any) => <div key={visit.id} className="border-l-2 border-teal-300 pl-2 text-xs text-slate-700"><p className="font-semibold">{new Date(visit.startedAt).toLocaleDateString()} · {visit.type}</p><p>{readableDocumentType(visit.status)}</p></div>)}{(encounter.patient?.encounters ?? []).filter((visit: any) => visit.id !== encounter.id).length === 0 && <p className="text-xs text-slate-500">Today is the first recorded visit.</p>}</div>}</div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Medication timeline</p>{(encounter.patient?.medications ?? []).length === 0 ? <p className="mt-2 text-xs text-slate-500">No medicines recorded.</p> : <div className="mt-2 space-y-2">{(encounter.patient?.medications ?? []).slice(0, 4).map((medication: any) => <div key={medication.id} className="text-xs text-slate-700"><p className="font-semibold">{medication.name}</p><p>{medication.dose} {medication.unit} · {medication.frequency}</p></div>)}</div>}</div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Allergies</p>{(encounter.patient?.allergies ?? []).length === 0 ? <p className="mt-2 text-xs text-slate-500">No allergies recorded.</p> : <div className="mt-2 space-y-2">{(encounter.patient?.allergies ?? []).slice(0, 4).map((allergy: any) => <div key={allergy.id} className="text-xs text-slate-700"><p className="font-semibold">{allergy.substance}</p><p>{allergy.reaction}{allergy.severity ? ` · ${allergy.severity}` : ''}</p></div>)}</div>}</div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-700"><strong>Laboratory records:</strong> {(encounter.patient?.documents ?? []).filter((document: any) => document.documentType === 'LAB_REPORT').length}</div><div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-700"><strong>Imaging records:</strong> {(encounter.patient?.documents ?? []).filter((document: any) => document.documentType === 'IMAGING_REPORT').length}</div></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Evidence from the intake</h3>
          <p className="mt-1 text-xs text-slate-500">Each card shows the source, wording, confidence, and clinician review state when available.</p>
          {(displayKioskSession?.facts ?? []).length === 0 ? <p className="mt-3 text-xs text-slate-500">No additional facts have been persisted yet.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {displayKioskSession.facts.map((fact: any) => {
              const reviewLabel = String(fact.reviewStatus ?? 'PENDING').toLowerCase();
              const isEditing = editingFactId === fact.id;
              return <div key={fact.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2"><strong>{humanizeClinicalKey(fact.key)}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${fact.reviewStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : fact.reviewStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' : fact.reviewStatus === 'UNCERTAIN' ? 'bg-amber-100 text-amber-800' : 'bg-white text-teal-700'}`}>{reviewLabel}</span></div>
                <p className="mt-2 whitespace-pre-wrap font-medium">{presentClinicalValue(fact.correctedValue ?? fact.value)}</p>
                {fact.correctedValue !== null && fact.correctedValue !== undefined && <p className="mt-1 text-xs text-slate-500">Clinician-corrected value</p>}
                {fact.transcriptEntry?.text ? <div className="mt-3 border-l-2 border-teal-300 pl-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Patient wording</p><p className="mt-1 text-xs leading-5 text-slate-600">“{fact.transcriptEntry.text}”</p><p className="mt-1 text-[10px] text-slate-400">Captured {new Date(fact.transcriptEntry.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></div> : <p className="mt-3 text-xs text-slate-500">{fact.provenance === 'CLINICIAN_CONFIRMED' ? 'Source: clinician-entered triage or registration record.' : 'Supporting source wording was not retained for this fact.'}</p>}
                <p className="mt-2 text-[11px] text-slate-500">Source: {factSourceLabel(fact.provenance)} · Language: {fact.sourceLanguage ?? 'Not classified'} · Extraction confidence: {typeof fact.extractionConfidence === 'number' ? `${Math.round(fact.extractionConfidence * 100)}%` : 'Not recorded'}</p>
                {fact.reviewedBy && <p className="mt-1 text-[11px] text-slate-500">Reviewed by {fact.reviewedBy}{fact.reviewedAt ? ` · ${new Date(fact.reviewedAt).toLocaleString()}` : ''}</p>}
                <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void reviewFact(fact, 'ACCEPTED')} className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white">Accept</button><button type="button" onClick={() => { setEditingFactId(isEditing ? null : fact.id); setFactCorrection(String(fact.correctedValue ?? fact.value ?? '')); }} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">Edit</button><button type="button" onClick={() => void reviewFact(fact, 'UNCERTAIN')} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">Uncertain</button><button type="button" onClick={() => void reviewFact(fact, 'REJECTED')} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800">Reject</button></div>
                {isEditing && <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3"><label className="block text-xs font-bold text-slate-700">Corrected clinical value</label><textarea value={factCorrection} onChange={(event) => setFactCorrection(event.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => void reviewFact(fact, 'ACCEPTED')} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Save and accept</button><button type="button" onClick={() => setEditingFactId(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button></div></div>}
              </div>;
            })}
          </div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Consultation</h3>{!consultation && <button type="button" onClick={() => void beginConsultation()} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Play className="h-4 w-4" /> Start consultation</button>}</div>{consultation && <div className="mt-4 space-y-4"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-slate-800">Consultation recording</h4>{recording ? <button type="button" onClick={stopRecording} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Stop recording</button> : <button type="button" disabled={transcribing} onClick={() => void startRecording()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{transcribing ? 'Transcribing…' : 'Record doctor + patient'}</button>}</div><div className="mt-3 max-h-40 space-y-2 overflow-y-auto">{readableTranscript(consultation.transcript).map((entry, index) => <div key={`${entry.speaker}-${index}`} className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{entry.speaker}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{entry.text}</p></div>)}</div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-3"><h4 className="text-sm font-bold text-slate-800">Final prescription</h4>{Object.entries(prescription).map(([key, value]) => <input key={key} value={value} placeholder={key} onChange={(event) => setPrescription((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />)}</div><div className="space-y-3"><h4 className="text-sm font-bold text-slate-800">Patient next step</h4><select value={nextStep.type} onChange={(event) => setNextStep((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"><option>LAB_TEST</option><option>IMAGING</option><option>REFERRAL</option><option>FOLLOW_UP</option><option>OTHER</option></select>{Object.entries(nextStep).filter(([key]) => key !== 'type').map(([key, value]) => <input key={key} value={value} placeholder={key} onChange={(event) => setNextStep((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />)}<button type="button" onClick={() => void finalize()} className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"><Save className="h-4 w-4" /> Finalize clinical decisions</button></div></div></div>}</section>
      </>}
    </div>
  );
}
