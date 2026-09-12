export type MedicationStatus =
  'active' | 'review' | 'held' | 'discontinued' | 'flagged';
export type MedicationRisk = 'low' | 'moderate' | 'high';
export type MedicationVerificationStatus =
  'unverified' | 'verified' | 'rejected';

export type Medication = {
  id: string;
  name: string;
  dose: string;
  unit?: string;
  status: MedicationStatus;
  route: string;
  scheduled: string;
  allergies: string[];
  risk: MedicationRisk;
  verificationStatus?: MedicationVerificationStatus;
  patientId?: string;
  genericName?: string;
  rxCui?: string;
  strength?: string;
  frequency?: string;
  source?: 'home' | 'hospital' | 'external' | 'discharge';
  createdAt?: string;
  updatedAt?: string;
};

export function filterMedications(
  items: Medication[],
  search: string,
  status: MedicationStatus | 'all',
): Medication[] {
  const query = search.trim().toLowerCase();

  return items.filter((item) => {
    const matchesStatus = status === 'all' ? true : item.status === status;
    const matchesSearch =
      query.length === 0 ||
      item.name.toLowerCase().includes(query) ||
      item.dose.toLowerCase().includes(query) ||
      item.route.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });
}

export function summarizeMedications(items: Medication[]) {
  return {
    active: items.filter((item) => item.status === 'active').length,
    review: items.filter((item) => item.status === 'review').length,
    flagged: items.filter((item) => item.status === 'flagged').length,
    highRisk: items.filter((item) => item.risk === 'high').length,
    total: items.length,
  };
}
