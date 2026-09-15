export const REPORT_FIELDS = [
  ['symptoms', 'Symptoms and chief complaint'],
  ['problemStarted', 'When the problem started'],
  ['findings', 'Findings'],
  ['vitals', 'Vitals'],
  ['medications', 'Medications'],
  ['allergies', 'Allergies and reactions'],
  ['history', 'Medical, family, and lifestyle history'],
] as const;

export function presentClinicalValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not reported';
  if (Array.isArray(value)) return value.length ? value.map((item) => presentClinicalValue(item)).join('\n') : 'Not reported';
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if ('name' in item && 'value' in item) {
      return `${String(item.name)}: ${String(item.value)}${item.unit ? ` ${String(item.unit)}` : ''}`;
    }
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${humanizeClinicalKey(key)}: ${presentClinicalValue(item)}`)
      .join('\n');
  }
  return String(value);
}

export function editableClinicalValue(value: unknown): string {
  return presentClinicalValue(value);
}

export function clinicalValueFromText(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function humanizeClinicalKey(value: string): string {
  return value.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
