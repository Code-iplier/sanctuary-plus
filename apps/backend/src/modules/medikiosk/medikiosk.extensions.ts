export type DepartmentExtension = {
  id: 'EMERGENCY' | 'GENERAL_MEDICINE' | 'PAEDIATRICS' | 'OBSTETRICS_GYNAECOLOGY' | 'CARDIOLOGY' | 'RESPIRATORY' | 'DERMATOLOGY' | 'MENTAL_HEALTH' | 'AYUSH';
  name: string;
  version: string;
  clinicianOwner: string;
  purpose: string;
};

// Static and versioned: Live must never invent specialty questions or expand the bounded intake.
export const APPROVED_DEPARTMENT_EXTENSIONS: DepartmentExtension[] = [
  { id: 'EMERGENCY', name: 'Emergency safety review', version: '1.0', clinicianOwner: 'Emergency Medicine Lead', purpose: 'Immediate red-flag review and nurse escalation.' },
  { id: 'GENERAL_MEDICINE', name: 'General medicine review', version: '1.0', clinicianOwner: 'General Medicine Lead', purpose: 'Common adult medical presentations and follow-up context.' },
  { id: 'PAEDIATRICS', name: 'Paediatric review', version: '1.0', clinicianOwner: 'Paediatrics Lead', purpose: 'Age-appropriate symptoms, feeding and caregiver observations.' },
  { id: 'OBSTETRICS_GYNAECOLOGY', name: 'Obstetrics and gynaecology review', version: '1.0', clinicianOwner: 'OB-GYN Lead', purpose: 'Pregnancy and reproductive-health context.' },
  { id: 'CARDIOLOGY', name: 'Cardiology review', version: '1.0', clinicianOwner: 'Cardiology Lead', purpose: 'Cardiac symptom and risk-factor context.' },
  { id: 'RESPIRATORY', name: 'Respiratory review', version: '1.0', clinicianOwner: 'Respiratory Medicine Lead', purpose: 'Breathing symptoms, inhaler use and exposure context.' },
  { id: 'DERMATOLOGY', name: 'Dermatology review', version: '1.0', clinicianOwner: 'Dermatology Lead', purpose: 'Skin symptoms, exposures and treatment history.' },
  { id: 'MENTAL_HEALTH', name: 'Mental-health review', version: '1.0', clinicianOwner: 'Mental Health Lead', purpose: 'Clinician-supervised mental-health context and safety assessment.' },
  { id: 'AYUSH', name: 'AYUSH history review', version: '1.0', clinicianOwner: 'AYUSH Clinical Lead', purpose: 'Approved AYUSH constitutional, diet and lifestyle history.' },
];

export function recommendDepartmentExtension(report: Record<string, unknown>, priority: 'URGENT' | 'NORMAL' | 'FOLLOW_UP'): DepartmentExtension {
  const text = JSON.stringify(report).toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => text.includes(term));
  const byId = (id: DepartmentExtension['id']) => APPROVED_DEPARTMENT_EXTENSIONS.find((extension) => extension.id === id)!;
  if (priority === 'URGENT') return byId('EMERGENCY');
  if (has('pregnan', 'period', 'menstrual', 'vaginal', 'gynaec')) return byId('OBSTETRICS_GYNAECOLOGY');
  if (has('child', 'baby', 'infant', 'feeding', 'school-age')) return byId('PAEDIATRICS');
  if (has('chest pain', 'palpitation', 'heart', 'blood pressure')) return byId('CARDIOLOGY');
  if (has('breath', 'wheez', 'cough', 'asthma', 'inhaler')) return byId('RESPIRATORY');
  if (has('rash', 'itch', 'skin', 'hives', 'acne')) return byId('DERMATOLOGY');
  if (has('anxiety', 'depression', 'self-harm', 'sleep', 'panic')) return byId('MENTAL_HEALTH');
  if (has('ayurved', 'ayush', 'prakriti', 'agni', 'dosha')) return byId('AYUSH');
  return byId('GENERAL_MEDICINE');
}
