import { buildHistorySummary, type ClinicalProblem, type HistorySummary } from './history-summary';

type FamilyFact = {
  id?: string;
  key?: string;
  value?: unknown;
  provenance?: string;
  clinicianConfirmedAt?: string | Date | null;
  transcriptEntry?: { id?: string; text?: string; occurredAt?: string | Date } | null;
};

type FamilyDocument = {
  id?: string;
  documentType?: string;
  title?: string;
  documentText?: string;
  extractedData?: unknown;
  originalFilename?: string | null;
  status?: string;
};

type FamilySession = {
  id: string;
  report?: { status: string; report: unknown; updatedAt: Date } | null;
  clinicalState: unknown;
  facts: FamilyFact[];
};

const VERIFIED_REPORTS = new Set(['PATIENT_VERIFIED', 'CLINICIAN_CONFIRMED']);

function reportForSession(session: FamilySession): Record<string, unknown> {
  if (session.report && VERIFIED_REPORTS.has(session.report.status) && session.report.report && typeof session.report.report === 'object' && !Array.isArray(session.report.report)) {
    const report = { ...(session.report.report as Record<string, unknown>) };
    // Clinical triage is intended for the treating team, not a family member
    // viewing a shared health record.
    delete report.clinicianTriage;
    return report;
  }
  return {};
}

function mergeProblem(existing: ClinicalProblem | undefined, incoming: ClinicalProblem): ClinicalProblem {
  if (!existing) return { ...incoming, origins: [...incoming.origins], evidence: [...incoming.evidence] };
  existing.origins.push(...incoming.origins.filter((origin) => !existing.origins.some((current) => JSON.stringify(current) === JSON.stringify(origin))));
  existing.evidence.push(...incoming.evidence.filter((evidence) => !existing.evidence.some((current) => current.id === evidence.id)));
  existing.clinicianConfirmed = existing.clinicianConfirmed || incoming.clinicianConfirmed;
  if (existing.status !== 'REVIEW_REQUIRED' && incoming.status === 'REVIEW_REQUIRED') existing.status = incoming.status;
  if (existing.status === 'REPORTED' && incoming.status === 'DOCUMENTED') existing.status = 'MULTI_SOURCE';
  if (!existing.summary && incoming.summary) existing.summary = incoming.summary;
  return existing;
}

function mergeProblemLists(summaries: HistorySummary[], pick: (summary: HistorySummary) => ClinicalProblem[]): ClinicalProblem[] {
  const merged = new Map<string, ClinicalProblem>();
  summaries.forEach((summary) => pick(summary).forEach((problem) => merged.set(problem.normalizedName, mergeProblem(merged.get(problem.normalizedName), problem))));
  return [...merged.values()];
}

export function buildFamilyHistorySummary(input: {
  patientId: string;
  sessions: FamilySession[];
  documents: FamilyDocument[];
}): HistorySummary {
  const sessionSummaries = input.sessions.map((session) => buildHistorySummary({
    patientId: input.patientId,
    sessionId: session.id,
    report: reportForSession(session),
    facts: session.facts,
    documents: [],
  }));
  const documentSummary = buildHistorySummary({
    patientId: input.patientId,
    sessionId: `family-documents-${input.patientId}`,
    report: {},
    facts: [],
    documents: input.documents,
  });
  const summaries = [...sessionSummaries, documentSummary];
  const merge = (pick: (summary: HistorySummary) => ClinicalProblem[]) => mergeProblemLists(summaries, pick);
  const importantProblems = merge((summary) => summary.importantProblems);
  const currentProblems = merge((summary) => summary.personal.currentProblems);
  const pastConditions = merge((summary) => summary.personal.pastConditions);
  const medications = merge((summary) => summary.personal.medications);
  const allergies = merge((summary) => summary.personal.allergies);
  const surgeriesHospitalizations = merge((summary) => summary.personal.surgeriesHospitalizations);
  const lifestyle = merge((summary) => summary.personal.lifestyle);
  const family = merge((summary) => summary.family.problems);
  const ayush = merge((summary) => summary.ayush.items);
  const conflictMap = new Map<string, HistorySummary['conflicts'][number]>();
  summaries.forEach((summary) => summary.conflicts.forEach((conflict) => {
    const existing = conflictMap.get(`${conflict.problemName}:${conflict.patientStatement ?? ''}:${conflict.documentStatement ?? ''}`);
    if (!existing) conflictMap.set(`${conflict.problemName}:${conflict.patientStatement ?? ''}:${conflict.documentStatement ?? ''}`, { ...conflict, evidenceIds: [...conflict.evidenceIds] });
    else existing.evidenceIds = [...new Set([...existing.evidenceIds, ...conflict.evidenceIds])];
  }));
  return {
    generatedAt: new Date().toISOString(),
    importantProblems,
    personal: { currentProblems, pastConditions, medications, allergies, surgeriesHospitalizations, lifestyle },
    family: { problems: family, treeAvailable: family.length > 0 },
    ayush: { items: ayush, formalAssessments: [] },
    conflicts: [...conflictMap.values()],
  };
}

