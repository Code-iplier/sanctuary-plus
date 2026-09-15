import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, PencilLine, Upload, View } from 'lucide-react';
import type { Session } from '../queue/types';
import { confirmPatientDocumentExtraction, getPatientDocumentContent, getPatientDocuments, uploadPatientDocument } from '../medikiosk/api';
import { presentClinicalValue } from '../medikiosk/presentation';

const TYPES = [
  ['LAB_REPORT', 'Laboratory report'],
  ['PRESCRIPTION', 'Printed prescription'],
  ['DISCHARGE_SUMMARY', 'Discharge summary'],
  ['IMAGING_REPORT', 'Imaging report'],
  ['REFERRAL', 'Referral letter'],
] as const;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

export default function PatientDocumentsPage({ session }: { session: Extract<Session, { role: 'patient' }> }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentType, setDocumentType] = useState<string>('LAB_REPORT');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [correctingDocumentId, setCorrectingDocumentId] = useState<string | null>(null);
  const [correction, setCorrection] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = () => void getPatientDocuments(session.accessToken ?? '', session.patientId).then(setDocuments).catch(() => setMessage('Unable to load your uploaded records.'));
  useEffect(refresh, [session.accessToken, session.patientId]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Please choose a PDF, JPG, PNG, or WEBP file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setMessage('Please choose a file smaller than 10 MB.'); return; }
    setUploading(true); setMessage('Reading your document and extracting the printed details…');
    try {
      await uploadPatientDocument(session.accessToken ?? '', { filename: file.name, mimeType: file.type, dataBase64: await readFile(file), documentType });
      setMessage('Document uploaded. The extracted details are ready for your doctor to review.');
      refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to upload this document.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const viewSource = async (id: string) => {
    try {
      const blob = await getPatientDocumentContent(session.accessToken ?? '', id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The original file is not available.'); }
  };

  const confirmExtraction = async (document: any) => {
    try {
      await confirmPatientDocumentExtraction(session.accessToken ?? '', document.id, document.extractedData ?? {});
      setMessage('Thank you. Your confirmation has been shared with the doctor.');
      refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save your confirmation.'); }
  };

  const saveCorrection = async (document: any) => {
    const note = correction.trim();
    if (!note) { setMessage('Please describe the correction for your doctor.'); return; }
    try {
      await confirmPatientDocumentExtraction(session.accessToken ?? '', document.id, {
        ...(document.extractedData ?? {}),
        patientCorrection: note,
      });
      setMessage('Your correction has been shared with the doctor. They will review the original record too.');
      setCorrection('');
      setCorrectingDocumentId(null);
      refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save your correction.'); }
  };

  return <section className="max-w-3xl mx-auto space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Your health records</p><h2 className="text-2xl font-bold text-slate-900">Upload a document</h2><p className="mt-1 text-sm text-slate-500">Upload a clear photo or PDF. We will read it and show the extracted details to your doctor for review.</p></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">What are you uploading?</label>
      <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
        {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" disabled={uploading} onClick={() => { if (fileRef.current) { fileRef.current.accept = 'application/pdf,image/jpeg,image/png,image/webp'; fileRef.current.removeAttribute('capture'); fileRef.current.click(); } }} className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload PDF or image</button><button type="button" disabled={uploading} onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click(); } }} className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 px-4 py-3 text-sm font-semibold text-teal-700 disabled:opacity-50"><Camera className="h-4 w-4" /> Take a photo</button></div>
      <p className="mt-3 text-xs text-slate-500">Printed records work best. If handwriting is unclear, your doctor will verify it before using it.</p>
    </div>
    {message && <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{message}</div>}
    <div className="space-y-3"><h3 className="text-lg font-bold text-slate-900">Uploaded records</h3>{documents.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-7 text-sm text-slate-500">No documents uploaded yet.</div> : documents.map((document) => <article key={document.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{String(document.documentType).replaceAll('_', ' ')}</p><h4 className="mt-1 text-base font-bold text-slate-900">{document.title}</h4><p className="mt-1 text-xs text-slate-500">{new Date(document.documentDate).toLocaleDateString()} · {document.status === 'OCR_REVIEWED' ? 'Read automatically — doctor review pending' : 'Clinician reviewed'}</p></div><button type="button" onClick={() => void viewSource(document.id)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><View className="h-3.5 w-3.5" /> View</button></div><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Extracted details</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{presentClinicalValue(document.extractedData)}</p></div><div className="mt-3 flex flex-wrap items-center gap-2">{document.provenance?.patientConfirmedAt ? <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> You reviewed these details</p> : <button type="button" onClick={() => void confirmExtraction(document)} className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-700">These details are correct</button>}<button type="button" onClick={() => { setCorrectingDocumentId(document.id); setCorrection(''); }} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><PencilLine className="h-3.5 w-3.5" /> Something needs correction</button></div>{correctingDocumentId === document.id && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><label className="block text-xs font-bold text-amber-900">Tell your doctor what needs correction</label><textarea value={correction} onChange={(event) => setCorrection(event.target.value)} rows={3} placeholder="For example: the medicine name or test date is not correct." className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm text-slate-700" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => void saveCorrection(document)} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Share correction</button><button type="button" onClick={() => setCorrectingDocumentId(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button></div></div>}</article>)}</div>
  </section>;
}
