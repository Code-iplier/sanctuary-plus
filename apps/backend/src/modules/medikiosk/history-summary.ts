type EvidenceSource = 'MEDIKIOSK_SESSION' | 'TRANSCRIPT' | 'DOCUMENT' | 'CLINICIAN_ENTRY';

export type HistoryEvidence = {
  id: string;
  type: EvidenceSource;
  sourceId: string;
  documentId?: string;
  excerpt?: string;
  originalFileAvailable: boolean;
};

export type ProblemOrigin = {
  type: 'PATIENT_HISTORY' | 'FAMILY_HISTORY' | 'DOCUMENT' | 'AYUSH_HISTORY' | 'CLINICIAN_ENTERED';
  relativeId?: string;
  relationship?: string;
  side?: string;
  sourceSessionId?: string;
  documentId?: string;
  evidenceIds: string[];
  details?: string;
};

export type ClinicalProblem = {
  id: string;
  name: string;
  normalizedName: string;
  summary: string;
  status: 'REPORTED' | 'DOCUMENTED' | 'MULTI_SOURCE' | 'REVIEW_REQUIRED';
  origins: ProblemOrigin[];
  evidence: HistoryEvidence[];
  patientVisible: boolean;
  clinicianConfirmed: boolean;
};

export type HistorySummary = {
  generatedAt: string;
  importantProblems: ClinicalProblem[];
  personal: {
    currentProblems: ClinicalProblem[];
    pastConditions: ClinicalProblem[];
    medications: ClinicalProblem[];
    allergies: ClinicalProblem[];
    surgeriesHospitalizations: ClinicalProblem[];
    lifestyle: ClinicalProblem[];
  };
  family: {
    problems: ClinicalProblem[];
    treeAvailable: boolean;
  };
  ayush: {
    items: ClinicalProblem[];
    formalAssessments: string[];
  };
  conflicts: Array<{
    problemName: string;
    patientStatement?: string;
    documentStatement?: string;
    evidenceIds: string[];
  }>;
};

type Fact = {
  id?: string;
  key?: string;
  value?: unknown;
  provenance?: string;
  clinicianConfirmedAt?: string | Date | null;
  transcriptEntry?: { id?: string; text?: string; occurredAt?: string | Date } | null;
};

type Document = {
  id?: string;
  documentType?: string;
  title?: string;
  documentText?: string;
  extractedData?: unknown;
  originalFilename?: string | null;
  status?: string;
};

type SummaryInput = {
  patientId: string;
  sessionId: string;
  report: Record<string, unknown>;
  facts?: Fact[];
  documents?: Document[];
};

const NO_INFORMATION = /^(?:no|none|nil|nothing|unknown|not known|not applicable|n\/a|not reported|no known|without|denies|denied|not taking|no similar|कोई नहीं|नहीं|पता नहीं|मालूम नहीं|कोई बीमारी नहीं|कोई पुरानी बीमारी नहीं|কিছু নেই|নেই|জানি না|ಯಾವುದೂ ಇಲ್ಲ|ಇಲ್ಲ|తెలియదు|ఏమీ లేదు|नाही|काही नाही|தெரியாது|இல்லை|ഒന്നുമില്ല|അറിയില്ല|ନାହିଁ|କିଛି ନାହିଁ|ਕੁਝ ਨਹੀਂ|ਨਹੀਂ|کچھ نہیں|نہیں)$/iu;
const NEGATIVE_STATEMENT = /^(?:no|none|nil|nothing|unknown|not known|not applicable|n\/a|not reported|no known|without|denies|denied|not taking|not on|do not take|don't take|no relevant|no previous|no major|no history|कोई|नहीं|पता नहीं|मालूम नहीं|নেই|কিছু নেই|জানি না|ಇಲ್ಲ|ಯಾವುದೂ ಇಲ್ಲ|తెలియదు|ఏమీ లేదు|नाही|काही नाही|இல்லை|தெரியாது|ഒന്നുമില്ല|അറിയില്ല|ନାହିଁ|କିଛି ନାହିଁ|ਕੁਝ ਨਹੀਂ|ਨਹੀਂ|کچھ نہیں|نہیں)\b/iu;

function items(value: unknown): unknown[] {
  if (value === null || value === undefined || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function valueText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join('; ');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.name && record.value !== undefined) return `${String(record.name)}: ${String(record.value)}${record.unit ? ` ${String(record.unit)}` : ''}`;
    return Object.entries(record).map(([key, entry]) => `${key}: ${valueText(entry)}`).filter((entry) => !entry.endsWith(': ')).join('; ');
  }
  return '';
}

function meaningful(value: unknown): boolean {
  const text = valueText(value);
  return Boolean(text) && !NO_INFORMATION.test(text.trim());
}

function positiveClinicalValue(value: unknown): boolean {
  const text = valueText(value).trim();
  return meaningful(text) && !NEGATIVE_STATEMENT.test(text);
}

function isNonProblemFinding(name: string): boolean {
  return /^(?:normal|within reference range|counts within reference range|no acute abnormality|unremarkable|no significant abnormality)$/iu.test(name.trim());
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function conditionName(value: string): string {
  const text = value.toLocaleLowerCase();
  if (/(?:chest\s+(?:mein\s+)?pain|chest\s+pain|सीने में दर्द|छाती में दर्द|বুকে ব্যথা|বুকের ব্যথা|ಎದೆ ನೋವು|ఛాతీ నొప్పి|छातीत दुखणे|மார்பு வலி|നെഞ്ചുവേദന|ଛାତି ଯନ୍ତ୍ରଣା|ਛਾਤੀ ਵਿੱਚ ਦਰਦ|سینے میں درد)/iu.test(text)) return 'Chest pain';
  if (/(?:breath(?:ing)?\s+difficulty|shortness\s+of\s+breath|difficulty\s+breathing|saans\s+(?:lene|mein|ki)|सांस लेने में दिक्कत|सांस फूलना|শ্বাসকষ্ট|শ্বাস নিতে কষ্ট|ಉಸಿರಾಟದ ತೊಂದರೆ|శ్వాస తీసుకోవడంలో ఇబ్బంది|श्वास घेण्यास त्रास|श्वास घेण्यास अडचण|மூச்சுத்திணறல்|ശ്വാസംമുട്ടൽ|ଶ୍ୱାସକଷ୍ଟ|ਸਾਹ ਲੈਣ ਵਿੱਚ ਮੁਸ਼ਕਲ|سانس لینے میں دشواری)/iu.test(text)) return 'Breathing difficulty';
  if (/(?:fever|bukhar|बुखार|জ্বর|ಜ್ವರ|జ్వరం|ताप|காய்ச்சல்|പനി|ଜ୍ୱର|ਬੁਖਾਰ|بخار)/iu.test(text)) return 'Fever';
  if (/(?:cough|खांसी|खाँसी|কাশি|ಕೆಮ್ಮು|దగ్గు|खोकला|இருமல்|ചുമ|କାଶ|ਖੰਘ|کھانسی)/iu.test(text)) return 'Cough';
  if (/(?:abdominal\s+pain|stomach\s+pain|पेट में दर्द|पोटदुखी|পেটে ব্যথা|ಹೊಟ್ಟೆ ನೋವು|కడుపు నొప్పి|வயிற்று வலி|വയറുവേദന|ପେଟ ଯନ୍ତ୍ରଣା|ਢਿੱਡ ਦਰਦ|پیٹ میں درد)/iu.test(text)) return 'Abdominal pain';
  if (/(?:diabet|sugar|शुगर|डायब|ডায়াব|ಮಧುಮೇಹ|మధుమేహ|मधुमेह|நீரிழிவு|പ്രമേഹം|ଡାଇବେଟ|ਸ਼ੂਗਰ|ذیابیط)/iu.test(text)) return 'Diabetes';
  if (/(?:hypertension|high blood pressure|blood pressure|\bbp\b|ब्लड प्रेशर|रक्तदाब|রক্তচাপ|ಅಧಿಕ ರಕ್ತದೊತ್ತಡ|అధిక రక్తపోటు|उच्च रक्तदाब|உயர் இரத்த அழுத்தம்|ഉയർന്ന രക്തസമ്മർദ്ദം|ଉଚ୍ଚ ରକ୍ତଚାପ|ਹਾਈ ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ|بلڈ پریشر)/iu.test(text)) return 'Hypertension';
  if (/(?:asthma|दमा|অ্যাজমা|ಆಸ್ತಮಾ|ఆస్తమా|दमा|ஆஸ்துமா|ആസ്ത്മ|ଆସ୍ଥମା|ਦਮਾ|دمہ)/iu.test(text)) return 'Asthma';
  if (/(?:copd|chronic obstructive|सीओपीडी)/iu.test(text)) return 'COPD';
  if (/(?:thyroid|hypothyroid|hyperthyroid|थायर|থাইরয়েড|ಥೈರಾಯ್ಡ್|థైరాయిడ్|தைராய்டு|തൈറോയ്ഡ്|ଥାଇରଏଡ୍|ਥਾਇਰਾਇਡ|تھائیرائڈ)/iu.test(text)) return 'Thyroid disease';
  if (/(?:kidney|renal|nephro|गुर्दा|কিডনি|ಮೂತ್ರಪಿಂಡ|కిడ్నీ|मूत्रपिंड|சிறுநீரகம்|വൃക്ക|କିଡନୀ|ਗੁਰਦਾ|گردہ)/iu.test(text)) return 'Kidney disease';
  if (/(?:coronary|heart attack|myocardial|heart disease|cardiac|stent|angioplasty|हृदय|दिल का दौरा|হৃদরোগ|হার্ট অ্যাটাক|ಹೃದಯ|గుండె|హార్ట్ అటాక్|हृदयविकार|हृदयविकाराचा झटका|இதயம்|ഹൃദയം|ହୃଦୟ|ਦਿਲ|دل کا دورہ)/iu.test(text)) return 'Heart disease';
  if (/(?:eczema|एक्जिमा|একজিমা|ಎಕ್ಸಿಮಾ|తామర|எக்ஸிமா|എക്സിമ|ଏକ୍ଜିମା|ਚੰਬਲ|اگزما)/iu.test(text)) return 'Eczema';
  if (/(?:gallstone|gall bladder|पित्त|পিত্তথলি|ಪಿತ್ತಕೋಶ|పిత్తాశయం|பித்தப்பை|പിത്താശയം|ପିତ୍ତଥଳି|ਪਿੱਤ ਦੀ ਪੱਥਰੀ|پتہ)/iu.test(text)) return 'Gallstone disease';
  return value.trim().replace(/^[\-•]+\s*/, '').slice(0, 90) || 'Unspecified clinical problem';
}

function medicationProblem(value: string): string {
  const condition = conditionName(value);
  if (['Hypertension', 'Diabetes', 'Asthma', 'COPD', 'Thyroid disease', 'Kidney disease', 'Heart disease'].includes(condition)) return `${condition} / treatment`;
  // Link common medicines to the condition they are explicitly used for,
  // while keeping the list intentionally conservative. Unknown medicines
  // remain medication-only rather than becoming an invented diagnosis.
  if (/(?:amlodipine|losartan|telmisartan|enalapril|lisinopril|metoprolol|atenolol)\b/iu.test(value)) return 'Hypertension / treatment';
  if (/(?:insulin|metformin|glimepiride)\b/iu.test(value)) return 'Diabetes / treatment';
  if (/(?:salbutamol|albuterol|budesonide|montelukast)\b/iu.test(value)) return 'Asthma / treatment';
  if (/(?:levothyroxine|thyroxine)\b/iu.test(value)) return 'Thyroid disease / treatment';
  const first = value.split(/[;,]/)[0]?.trim() || value;
  const withoutDose = first.replace(/\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|μg|ug|ml|iu|units?)\b/giu, '').replace(/\s{2,}/g, ' ').trim();
  return `Medication: ${(withoutDose || first).slice(0, 70)}`;
}

function relativeDetails(value: string): { relative?: string; relationship?: string; side?: string } {
  const match = value.match(/\b(mother|father|parent|sister|brother|sibling|grandmother|grandfather|son|daughter|माँ|माता|पिता|भाई|बहन|परिवार|মা|বাবা|ভাই|বোন|ಅಮ್ಮ|ಅಪ್ಪ|ತಾಯಿ|ತಂದೆ|అమ్మ|నాన్న|అన్న|అక్క|आई|वडील|भाऊ|बहीण|தாய்|தந்தை|சகோதரர்|சகோதரி|അമ്മ|അച്ഛൻ|സഹോദരൻ|ସାଙ୍ଗ|ମା|ବାପା|ଭାଇ|ଭଉଣୀ|ਮਾਂ|ਪਿਤਾ|ਭਰਾ|ਭੈਣ|والدہ|والد|بھائی|بہن)\b/iu);
  const relative = match?.[1];
  if (!relative) return {};
  const lower = relative.toLocaleLowerCase();
  const relationship = /mother|माँ|माता|মা|ಅಮ್ಮ|ತಾಯಿ|అమ్మ|आई|தாய்|അമ്മ|ମା|ਮਾਂ|والدہ/iu.test(lower) ? 'Mother'
    : /father|पिता|বাবা|ಅಪ್ಪ|ತಂದೆ|నాన్న|वडील|தந்தை|അച്ഛൻ|ବାପା|ਪਿਤਾ|والد/iu.test(lower) ? 'Father'
      : /sister|बहन|বোন|ಭଉଣୀ|అక్క|बहीण|சகோதரி|സഹോദരി|ଭଉଣୀ|ਭੈਣ|بہن/iu.test(lower) ? 'Sibling (sister)'
        : /brother|भाई|ভাই|ಅಣ್ಣ|అన్న|भाऊ|சகோதரர்|സഹോദരൻ|ଭାଇ|ਭਰਾ|بھائی/iu.test(lower) ? 'Sibling (brother)' : 'Family member';
  const side = relationship === 'Mother' ? 'Maternal' : relationship === 'Father' ? 'Paternal' : undefined;
  return { relative, relationship, side };
}

function transcriptEvidence(sessionId: string, facts: Fact[], key: string, report: Record<string, unknown>): HistoryEvidence[] {
  const evidence: HistoryEvidence[] = [];
  const keyText = key.toLocaleLowerCase().replace(/[^a-z]/g, '');
  facts.filter((fact) => {
    const factKey = String(fact.key ?? '').toLocaleLowerCase().replace(/[^a-z]/g, '');
    return factKey === keyText || factKey.includes(keyText) || keyText.includes(factKey);
  }).forEach((fact, index) => {
    const transcript = fact.transcriptEntry;
    const sourceId = String(transcript?.id ?? fact.id ?? `${sessionId}-${key}-${index}`);
    evidence.push({ id: `transcript:${sourceId}`, type: transcript?.id ? 'TRANSCRIPT' : 'MEDIKIOSK_SESSION', sourceId, excerpt: transcript?.text, originalFileAvailable: false });
  });
  const extracted = report.extractionEvidence && typeof report.extractionEvidence === 'object' ? (report.extractionEvidence as Record<string, unknown>)[key] : undefined;
  items(extracted).forEach((entry, index) => {
    const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    const excerpt = String(record.sourceQuote ?? record.excerpt ?? '').trim();
    if (excerpt) evidence.push({ id: `session:${sessionId}:${key}:${index}`, type: 'MEDIKIOSK_SESSION', sourceId: sessionId, excerpt, originalFileAvailable: false });
  });
  if (!evidence.length) evidence.push({ id: `session:${sessionId}`, type: 'MEDIKIOSK_SESSION', sourceId: sessionId, originalFileAvailable: false });
  return evidence;
}

function documentEvidence(document: Document, excerpt?: string): HistoryEvidence {
  const sourceId = String(document.id ?? document.title ?? 'document');
  return { id: `document:${sourceId}`, type: 'DOCUMENT', sourceId, documentId: document.id, excerpt: excerpt || document.title, originalFileAvailable: Boolean(document.originalFilename) };
}

export function buildHistorySummary(input: SummaryInput): HistorySummary {
  const report = input.report ?? {};
  const facts = input.facts ?? [];
  const documents = input.documents ?? [];
  const problems = new Map<string, ClinicalProblem>();
  const allProblemsFromMap = (map: Map<string, ClinicalProblem>): ClinicalProblem[] => [...map.values()];
  const currentProblems = new Set<string>();
  const pastConditions = new Set<string>();
  const medications = new Set<string>();
  const allergies = new Set<string>();
  const surgeriesHospitalizations = new Set<string>();
  const lifestyle = new Set<string>();
  const familyProblems = new Set<string>();
  const ayushItems = new Set<string>();
  const formalAssessments: string[] = [];

  const addProblem = (name: string, summary: string, origin: ProblemOrigin, evidence: HistoryEvidence[], bucket?: Set<string>, confirmed = false): ClinicalProblem | null => {
    if (!meaningful(name)) return null;
    const normalizedName = normalize(name);
    if (!normalizedName) return null;
    const existing = problems.get(normalizedName);
    if (existing) {
      existing.status = existing.origins.some((item) => item.type !== origin.type) ? 'MULTI_SOURCE' : existing.status;
      existing.origins.push(origin);
      evidence.forEach((item) => { if (!existing.evidence.some((current) => current.id === item.id)) existing.evidence.push(item); });
      existing.clinicianConfirmed = existing.clinicianConfirmed || confirmed;
      if (bucket) bucket.add(normalizedName);
      return existing;
    }
    const problem: ClinicalProblem = {
      id: `problem-${normalizedName.replace(/\s+/g, '-')}`,
      name,
      normalizedName,
      summary: summary || name,
      status: origin.type === 'DOCUMENT' ? 'DOCUMENTED' : confirmed ? 'DOCUMENTED' : 'REPORTED',
      origins: [origin],
      evidence: [...evidence],
      patientVisible: true,
      clinicianConfirmed: confirmed,
    };
    problems.set(normalizedName, problem);
    if (bucket) bucket.add(normalizedName);
    return problem;
  };

  const reportValues = (key: string): unknown[] => items(report[key]);
  const onset = reportValues('problemStarted').map(valueText).filter(Boolean).join('; ');
  reportValues('symptoms').filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    const name = conditionName(text);
    addProblem(name, onset ? `${text}. Started: ${onset}` : text, {
      type: 'PATIENT_HISTORY', sourceSessionId: input.sessionId, evidenceIds: transcriptEvidence(input.sessionId, facts, 'symptoms', report).map((entry) => entry.id),
    }, transcriptEvidence(input.sessionId, facts, 'symptoms', report), currentProblems);
  });

  const history = report.history && typeof report.history === 'object' && !Array.isArray(report.history)
    ? report.history as Record<string, unknown>
    : { medical: report.history };
  if (!report.history || typeof report.history !== 'object' || Array.isArray(report.history)) {
    reportValues('history').filter(positiveClinicalValue).forEach((item) => {
      const text = valueText(item);
      const name = conditionName(text);
      const evidence = transcriptEvidence(input.sessionId, facts, 'history', report);
      addProblem(name, text, { type: 'PATIENT_HISTORY', sourceSessionId: input.sessionId, evidenceIds: evidence.map((entry) => entry.id) }, evidence, pastConditions);
    });
  }
  items(history.medical ?? report.medicalHistory).filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    const name = conditionName(text);
    const problem = addProblem(name, text, { type: 'PATIENT_HISTORY', sourceSessionId: input.sessionId, evidenceIds: transcriptEvidence(input.sessionId, facts, 'medical_history', report).map((entry) => entry.id) }, transcriptEvidence(input.sessionId, facts, 'medical_history', report), pastConditions);
    if (problem && /(?:surgery|operation|hospital|admission|भर्ती|ऑपरेशन|सर्जरी|অপারেশন|হাসপাতাল|ಆಸ್ಪತ್ರೆ|శస్త్రచికిత్స|ఆసుపత్రి|शस्त्रक्रिया|रुग्णालय|அறுவை|மருத்துவமனை|ശസ്ത്രക്രിയ|ആശുപത്രി|ଅପରେସନ|ହସ୍ପିଟାଲ|ਸਰਜਰੀ|ਹਸਪਤਾਲ|سرجری|ہسپتال)/iu.test(text)) surgeriesHospitalizations.add(problem.normalizedName);
  });

  reportValues('medications').filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    const name = medicationProblem(text);
    addProblem(name, `Treatment reported: ${text}`, { type: 'PATIENT_HISTORY', sourceSessionId: input.sessionId, evidenceIds: transcriptEvidence(input.sessionId, facts, 'medications', report).map((entry) => entry.id) }, transcriptEvidence(input.sessionId, facts, 'medications', report), medications);
  });
  reportValues('allergies').filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    addProblem(`Allergy: ${text}`, `Patient-reported allergy or reaction: ${text}`, { type: 'PATIENT_HISTORY', sourceSessionId: input.sessionId, evidenceIds: transcriptEvidence(input.sessionId, facts, 'allergies', report).map((entry) => entry.id) }, transcriptEvidence(input.sessionId, facts, 'allergies', report), allergies);
  });
  items(history.lifestyle ?? report.lifestyle).filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    addProblem('Lifestyle information', text, { type: 'PATIENT_HISTORY', sourceSessionId: input.sessionId, evidenceIds: transcriptEvidence(input.sessionId, facts, 'lifestyle', report).map((entry) => entry.id) }, transcriptEvidence(input.sessionId, facts, 'lifestyle', report), lifestyle);
  });

  items(history.family ?? report.familyHistory).filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    const relation = relativeDetails(text);
    const name = conditionName(text);
    const evidence = transcriptEvidence(input.sessionId, facts, 'family_history', report);
    addProblem(name, text, { type: 'FAMILY_HISTORY', relationship: relation.relationship, side: relation.side, sourceSessionId: input.sessionId, evidenceIds: evidence.map((entry) => entry.id), details: relation.relative ? `Family member: ${relation.relative}` : undefined }, evidence, familyProblems);
  });

  const ayushSource = [...reportValues('ayush'), ...items(history.ayush), ...items(history.ayushHistory)];
  ayushSource.filter(positiveClinicalValue).forEach((item) => {
    const text = valueText(item);
    const lower = text.toLocaleLowerCase();
    const label = /(?:agni|digest|appetite|पाचन|भूख|অগ্নি|হজম|ಜೀರ್ಣ|ఆకలి|జీర్ణ|भूक|पचन|பசி|செரிமானம்|വിശപ്പ്|ദഹനം|ପାଚନ|ଭୋକ|ਭੁੱਖ|ہاضمہ)/iu.test(lower) ? 'Digestive pattern'
      : /(?:prakriti|प्रकृति|প্রকৃতি|ಪ್ರಕೃತಿ|ప్రకృతి|பிரகிருதி|പ്രകൃതി|ପ୍ରକୃତି|ਪ੍ਰਕਿਰਤੀ|فطرت)/iu.test(lower) ? 'Prakriti'
        : /(?:vikriti|विकृति|বিকৃতি|ವಿಕೃತಿ|వికృతి|விக்ருதி|വികൃതി|ବିକୃତି|ਵਿਕ੍ਰਿਤੀ|خرابی)/iu.test(lower) ? 'Vikriti'
          : /(?:diet|ahara|आहार|খাদ্য|ಆಹಾರ|ఆహారం|आहार|உணவு|ആഹാരം|ଆହାର|ਖੁਰਾਕ|غذا)/iu.test(lower) ? 'Diet' : 'AYUSH patient information';
    const evidence = transcriptEvidence(input.sessionId, facts, 'history', report);
    addProblem(label, text, { type: 'AYUSH_HISTORY', sourceSessionId: input.sessionId, evidenceIds: evidence.map((entry) => entry.id) }, evidence, ayushItems);
  });

  documents.forEach((document) => {
    const extracted = document.extractedData && typeof document.extractedData === 'object' ? document.extractedData as Record<string, unknown> : {};
    const evidence = documentEvidence(document);
    const type = String(document.documentType ?? '');
    if (type === 'AYUSH_CONSULTATION') {
      const text = valueText(document.extractedData) || String(document.documentText ?? '').slice(0, 220);
      if (meaningful(text)) addProblem('AYUSH consultation', text, { type: 'AYUSH_HISTORY', documentId: document.id, evidenceIds: [evidence.id], details: 'Document-derived AYUSH information; formal interpretation requires clinician review.' }, [evidence], ayushItems, document.status === 'CLINICIAN_VERIFIED');
      return;
    }
    ['assessment', 'impression', 'diagnosis', 'diagnoses', 'procedure', 'condition', 'conditions', 'finding', 'findings'].forEach((key) => {
      items(extracted[key]).filter(meaningful).forEach((item) => {
        const text = valueText(item);
        addProblem(conditionName(text), `Document reports: ${text}`, { type: 'DOCUMENT', documentId: document.id, evidenceIds: [evidence.id], details: document.title }, [documentEvidence(document, text)], undefined, document.status === 'CLINICIAN_VERIFIED');
      });
    });
    items(extracted.medications ?? extracted.medication).filter(meaningful).forEach((item) => {
      const text = valueText(item);
      addProblem(medicationProblem(text), `Document reports treatment: ${text}`, { type: 'DOCUMENT', documentId: document.id, evidenceIds: [evidence.id], details: document.title }, [documentEvidence(document, text)], medications, document.status === 'CLINICIAN_VERIFIED');
    });
    items(extracted.allergies ?? extracted.allergy).filter(meaningful).forEach((item) => {
      const text = valueText(item);
      addProblem(`Allergy: ${text}`, `Document reports allergy or reaction: ${text}`, { type: 'DOCUMENT', documentId: document.id, evidenceIds: [evidence.id], details: document.title }, [documentEvidence(document, text)], allergies, document.status === 'CLINICIAN_VERIFIED');
    });
  });

  // Synthetic fixtures and clinician review actions mark facts directly. Carry
  // that explicit review state into the problem card without changing the
  // original patient wording.
  problems.forEach((problem) => {
    problem.clinicianConfirmed = problem.clinicianConfirmed || problem.evidence.some((evidence) => facts.some((fact) => {
      const factEvidenceId = fact.transcriptEntry?.id ? `transcript:${fact.transcriptEntry.id}` : fact.id ? `transcript:${fact.id}` : '';
      return fact.clinicianConfirmedAt != null && factEvidenceId === evidence.id;
    }));
  });

  const family = [...familyProblems].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem));
  const allProblems = allProblemsFromMap(problems);
  const conflicts = allProblems.flatMap((problem) => {
    const patient = problem.origins.find((origin) => origin.type === 'PATIENT_HISTORY');
    const document = problem.origins.find((origin) => origin.type === 'DOCUMENT');
    if (!patient || !document) return [];
    const patientEvidence = problem.evidence.filter((entry) => patient.evidenceIds.includes(entry.id)).map((entry) => entry.excerpt).filter(Boolean).join('; ');
    const documentEvidenceText = problem.evidence.filter((entry) => document.evidenceIds.includes(entry.id)).map((entry) => entry.excerpt).filter(Boolean).join('; ');
    if (!patientEvidence || !documentEvidenceText || normalize(patientEvidence) === normalize(documentEvidenceText)) return [];
    return [{ problemName: problem.name, patientStatement: patientEvidence, documentStatement: documentEvidenceText, evidenceIds: [...new Set([...patient.evidenceIds, ...document.evidenceIds])] }];
  });
  allProblems.forEach((problem) => {
    if (conflicts.some((conflict) => conflict.problemName === problem.name)) problem.status = 'REVIEW_REQUIRED';
  });

  return {
    generatedAt: new Date().toISOString(),
    importantProblems: allProblems.filter((problem) => !problem.name.startsWith('Lifestyle information') && !problem.name.startsWith('Allergy:') && !isNonProblemFinding(problem.name)),
    personal: {
      currentProblems: [...currentProblems].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)),
      pastConditions: [...pastConditions].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)),
      medications: [...medications].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)),
      allergies: [...allergies].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)),
      surgeriesHospitalizations: [...surgeriesHospitalizations].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)),
      lifestyle: [...lifestyle].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)),
    },
    family: { problems: family, treeAvailable: family.length > 0 },
    ayush: { items: [...ayushItems].map((key) => problems.get(key)).filter((problem): problem is ClinicalProblem => Boolean(problem)), formalAssessments },
    conflicts,
  };
}
