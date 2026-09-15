import { Logger, OnModuleInit, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

const REFERENCE_DATE = new Date('2026-09-15T09:00:00.000Z');
const SYNTHETIC_COHORT_ID = 'sanctuary-plus-local-cohort-v1';

type DocumentType =
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'DISCHARGE_SUMMARY'
  | 'IMAGING_REPORT'
  | 'REFERRAL'
  | 'IMMUNIZATION_RECORD'
  | 'AYUSH_CONSULTATION';

type MedicationSeed = {
  id: string;
  name: string;
  dose: string;
  unit: string;
  strength: string;
  route: string;
  frequency: string;
  scheduled: string;
  source: 'HOME' | 'EXTERNAL' | 'DISCHARGE';
};

type DocumentSeed = {
  id: string;
  documentType: DocumentType;
  title: string;
  sourceOrganization: string;
  sourceSystem: string;
  documentNumber: string;
  documentDate: string;
  language: string;
  documentText: string;
  extractedData: Record<string, unknown>;
};

type SyntheticCase = {
  patientId: string;
  externalId: string;
  encounterId: string;
  kioskSessionId: string;
  displayName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  preferredLanguage: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  department: string;
  tokenNumber: string;
  visitType: 'NEW' | 'FOLLOW_UP' | 'REVIEW' | 'OTHER';
  encounterStatus: string;
  answerLanguage: string;
  answers: [string, string, string, string, string, string];
  symptoms: string[];
  onset: string[];
  findings: string[];
  vitals: Array<{ name: string; value: string; unit: string }>;
  medications: string[];
  allergies: string[];
  history: { medical: string[]; family: string[]; lifestyle: string[] };
  triage: {
    priority: 'URGENT' | 'NORMAL' | 'FOLLOW_UP';
    score: number;
    possibleConditions: string[];
    reason: string;
    redFlags: string[];
    possibleDiagnoses: Array<{
      name: string;
      certainty: 'suspected' | 'probable' | 'confirmed';
      supportingEvidence: string[];
    }>;
  };
  medicationRecords: MedicationSeed[];
  allergiesRecords: Array<{ id: string; substance: string; normalizedSubstance: string; reaction: string; severity: 'LOW' | 'MODERATE' | 'HIGH' }>;
  documents: DocumentSeed[];
};

const daysAgo = (days: number): Date => new Date(REFERENCE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
const dateAt = (isoDate: string): Date => new Date(`${isoDate}T09:00:00.000Z`);
const json = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const document = (
  id: string,
  documentType: DocumentType,
  title: string,
  sourceOrganization: string,
  sourceSystem: string,
  documentNumber: string,
  documentDate: string,
  language: string,
  documentText: string,
  extractedData: Record<string, unknown>,
): DocumentSeed => ({
  id,
  documentType,
  title,
  sourceOrganization,
  sourceSystem,
  documentNumber,
  documentDate,
  language,
  documentText,
  extractedData,
});

const cases: SyntheticCase[] = [
  {
    patientId: 'PAT-SYN-0001', externalId: 'ABHA-SYN-10001', encounterId: 'ENC-SYN-0001-OPD-20260915', kioskSessionId: 'KSK-SYN-0001',
    displayName: 'Ananya Sharma', phone: '9000011111', dateOfBirth: '1998-04-14', gender: 'Female', bloodGroup: 'O+', preferredLanguage: 'Hindi / Hinglish',
    address: 'Aliganj, Lucknow, Uttar Pradesh', emergencyContactName: 'Rakesh Sharma (father)', emergencyContactPhone: '9000011101', department: 'General Medicine', tokenNumber: 'GEN-101', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'hi-IN',
    answers: [
      'मुझे तीन दिन से बुखार है, ठंड लगती है, सूखी खाँसी और पूरे शरीर में दर्द है।',
      'बुखार तीन दिन पहले शुरू हुआ और कल रात 101.8 डिग्री तक गया। आज थकान ज्यादा है।',
      'मुझे कोई पुरानी बीमारी नहीं है और पहले अस्पताल में भर्ती या सर्जरी नहीं हुई।',
      'कल से पैरासिटामोल 500 मिलीग्राम जरूरत पर ले रही हूँ। किसी दवा या खाने से एलर्जी नहीं है।',
      'माँ को टाइप 2 डायबिटीज है। मैं स्कूल टीचर हूँ, धूम्रपान या शराब नहीं करती और घर का खाना खाती हूँ।',
      'अभी सांस लेने में परेशानी या सीने में दर्द नहीं है।',
    ],
    symptoms: ['Fever with chills', 'Dry cough', 'Generalized body ache', 'Fatigue'], onset: ['Started 3 days ago', 'Fever reached 101.8°F last night'],
    findings: ['Febrile at triage', 'Mild pharyngeal erythema', 'No focal chest crepitations reported'],
    vitals: [{ name: 'Temperature', value: '101.4', unit: '°F' }, { name: 'Blood Pressure', value: '112/72', unit: 'mmHg' }, { name: 'Heart Rate', value: '96', unit: 'bpm' }, { name: 'SpO2', value: '98', unit: '%' }],
    medications: ['Paracetamol 500 mg as needed since yesterday'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['No known chronic illness', 'No previous surgery or hospital admission'], family: ['Mother has type 2 diabetes'], lifestyle: ['School teacher', 'No tobacco or alcohol', 'Home-cooked diet'] },
    triage: { priority: 'NORMAL', score: 32, possibleConditions: ['Acute febrile respiratory illness'], reason: 'No automated emergency red flag identified; stable oxygen saturation and no breathing difficulty reported.', redFlags: [], possibleDiagnoses: [{ name: 'Viral upper respiratory infection', certainty: 'probable', supportingEvidence: ['Fever with chills, dry cough and body ache for three days', 'Stable SpO2 at 98%'] }, { name: 'Influenza-like illness', certainty: 'suspected', supportingEvidence: ['Acute fever, fatigue and generalized myalgia'] }] },
    medicationRecords: [{ id: 'MED-SYN-0001-01', name: 'Paracetamol', dose: '500', unit: 'mg', strength: '500 mg', route: 'oral', frequency: 'as needed up to three times daily', scheduled: 'PRN', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0001-01', 'LAB_REPORT', 'Complete blood count', 'Lucknow Diagnostics Centre', 'EXTERNAL_LAB_SIMULATION', 'LDC-CBC-250912-0001', '2026-09-12', 'hi-IN', 'LUCKNOW DIAGNOSTICS CENTRE\nPatient: Ananya Sharma | ABHA ID (Synthetic): ABHA-SYN-10001\nCBC: Hb 12.4 g/dL; WBC 8,900 /µL; Platelets 2.46 lakh /µL.\nComment: Counts within reference range. Correlate clinically.', { test: 'CBC', hemoglobin: '12.4 g/dL', wbc: '8900 /µL', platelets: '2.46 lakh /µL', impression: 'Counts within reference range' }),
      document('DOC-SYN-0001-02', 'PRESCRIPTION', 'Outpatient fever prescription', 'Shanti Family Clinic', 'EXTERNAL_CLINIC_SIMULATION', 'SFC-RX-250913-0001', '2026-09-13', 'hi-IN', 'SHANTI FAMILY CLINIC\nPatient: Ananya Sharma\nAssessment at external visit: Acute febrile illness.\nPrescription: Paracetamol 500 mg by mouth when required for fever; oral fluids; review if symptoms worsen.', { assessment: 'Acute febrile illness', medications: ['Paracetamol 500 mg oral PRN'], advice: 'Oral fluids and review if worsening' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0002', externalId: 'ABHA-SYN-10002', encounterId: 'ENC-SYN-0002-OPD-20260915', kioskSessionId: 'KSK-SYN-0002',
    displayName: 'Rohan Patel', phone: '9000022222', dateOfBirth: '1970-11-22', gender: 'Male', bloodGroup: 'B+', preferredLanguage: 'Gujarati / English',
    address: 'Navrangpura, Ahmedabad, Gujarat', emergencyContactName: 'Kiran Patel (wife)', emergencyContactPhone: '9000022202', department: 'Cardiology', tokenNumber: 'CARD-201', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'gu-IN',
    answers: [
      'છેલ્લા બે કલાકથી છાતીમાં દબાણ છે, જે ડાબા હાથ અને જડબા સુધી જાય છે. પરસેવો અને ઊબકા પણ આવે છે.',
      'આ સીડી ચઢ્યા પછી અચાનક શરૂ થયું અને આરામ કર્યા પછી પણ સંપૂર્ણ રીતે ગયું નથી.',
      'મને આઠ વર્ષથી બ્લડ પ્રેશર અને પાંચ વર્ષથી ડાયાબિટીસ છે. કોઈ મોટી સર્જરી થઈ નથી.',
      'Amlodipine 5 mg, metformin 500 mg અને atorvastatin 40 mg લઉં છું. Penicillinથી hives થાય છે.',
      'પિતા ને 62 વર્ષની ઉંમરે heart attack આવ્યો હતો. હું પહેલાં ધુમ્રપાન કરતો હતો, બે વર્ષ પહેલાં બંધ કર્યું; ઓફિસમાં બેસવાનું કામ છે.',
      'શ્વાસ થોડો ચડે છે અને દુખાવો હજુ છ છે દસમાંથી.',
    ],
    symptoms: ['Exertional crushing chest pressure', 'Pain radiating to left arm and jaw', 'Shortness of breath', 'Diaphoresis', 'Nausea'], onset: ['Sudden onset 2 hours ago after climbing stairs', 'Pain persists at rest, rated 6/10'],
    findings: ['Diaphoretic and visibly uncomfortable', 'Tachycardic at triage', 'No syncope reported'],
    vitals: [{ name: 'Blood Pressure', value: '168/96', unit: 'mmHg' }, { name: 'Heart Rate', value: '108', unit: 'bpm' }, { name: 'Respiratory Rate', value: '24', unit: 'breaths/min' }, { name: 'SpO2', value: '95', unit: '%' }],
    medications: ['Amlodipine 5 mg once daily', 'Metformin 500 mg twice daily', 'Atorvastatin 40 mg once daily'], allergies: ['Penicillin — hives'],
    history: { medical: ['Hypertension for 8 years', 'Type 2 diabetes for 5 years', 'No prior surgery'], family: ['Father had myocardial infarction at age 62'], lifestyle: ['Former smoker; stopped 2 years ago', 'Sedentary office occupation'] },
    triage: { priority: 'URGENT', score: 100, possibleConditions: ['Possible acute cardiopulmonary condition'], reason: 'Chest pressure radiating to the arm and jaw with diaphoresis, dyspnea and persistent symptoms requires immediate clinical assessment.', redFlags: ['Chest or breathing red flag'], possibleDiagnoses: [{ name: 'Acute coronary syndrome', certainty: 'probable', supportingEvidence: ['Exertional crushing chest pressure radiating to left arm and jaw', 'Diaphoresis, nausea and persistent pain', 'Diabetes, hypertension and family history'] }, { name: 'Acute myocardial infarction', certainty: 'suspected', supportingEvidence: ['Persistent pressure at rest after exertional onset', 'Tachycardia and diaphoresis'] }, { name: 'Gastroesophageal reflux disease', certainty: 'suspected', supportingEvidence: ['Retrosternal discomfort; requires exclusion after emergency assessment'] }] },
    medicationRecords: [{ id: 'MED-SYN-0002-01', name: 'Amlodipine', dose: '5', unit: 'mg', strength: '5 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'HOME' }, { id: 'MED-SYN-0002-02', name: 'Metformin', dose: '500', unit: 'mg', strength: '500 mg', route: 'oral', frequency: 'twice daily with meals', scheduled: 'Morning and evening', source: 'HOME' }, { id: 'MED-SYN-0002-03', name: 'Atorvastatin', dose: '40', unit: 'mg', strength: '40 mg', route: 'oral', frequency: 'once daily', scheduled: 'Night', source: 'HOME' }],
    allergiesRecords: [{ id: 'ALG-SYN-0002-01', substance: 'Penicillin', normalizedSubstance: 'penicillin', reaction: 'Hives', severity: 'MODERATE' }],
    documents: [
      document('DOC-SYN-0002-01', 'LAB_REPORT', 'Emergency cardiac markers', 'Ahmedabad Heart Diagnostics', 'EXTERNAL_LAB_SIMULATION', 'AHD-TROP-250915-0002', '2026-09-15', 'gu-IN', 'AHMEDABAD HEART DIAGNOSTICS\nPatient: Rohan Patel | ABHA ID (Synthetic): ABHA-SYN-10002\nHigh-sensitivity Troponin-I: 38 ng/L (above local reference; urgent correlation advised).\nRandom glucose: 214 mg/dL. Creatinine: 1.1 mg/dL.', { tests: [{ name: 'High-sensitivity Troponin-I', value: '38 ng/L', flag: 'Above local reference' }, { name: 'Random glucose', value: '214 mg/dL' }, { name: 'Creatinine', value: '1.1 mg/dL' }], comment: 'Urgent clinical correlation advised' }),
      document('DOC-SYN-0002-02', 'IMAGING_REPORT', '12-lead ECG report', 'Metro Heart Hospital', 'EXTERNAL_CARDIOLOGY_SIMULATION', 'MHH-ECG-250915-0002', '2026-09-15', 'en-IN', 'METRO HEART HOSPITAL\nECG: Sinus tachycardia at 106 bpm. ST-T changes in anterior leads; comparison unavailable.\nImpression: Abnormal ECG. Immediate cardiology review advised.', { study: '12-lead ECG', rhythm: 'Sinus tachycardia', rate: '106 bpm', finding: 'ST-T changes in anterior leads', impression: 'Abnormal ECG; immediate review advised' }),
      document('DOC-SYN-0002-03', 'PRESCRIPTION', 'Chronic cardiac medicines', 'Patel Family Physician', 'EXTERNAL_CLINIC_SIMULATION', 'PFP-RX-250801-0002', '2026-08-01', 'gu-IN', 'PATEL FAMILY PHYSICIAN\nLong-term medicines: Amlodipine 5 mg daily; Metformin 500 mg twice daily; Atorvastatin 40 mg at night.\nDrug allergy recorded: Penicillin causes hives.', { medications: ['Amlodipine 5 mg daily', 'Metformin 500 mg twice daily', 'Atorvastatin 40 mg nightly'], allergies: ['Penicillin: hives'] }),
    ],
  },
  {
    patientId: 'PAT-SYN-0003', externalId: 'ABHA-SYN-10003', encounterId: 'ENC-SYN-0003-OPD-20260915', kioskSessionId: 'KSK-SYN-0003',
    displayName: 'Neha Das', phone: '9000033333', dateOfBirth: '1984-06-03', gender: 'Female', bloodGroup: 'A+', preferredLanguage: 'Bengali / English',
    address: 'Salt Lake, Kolkata, West Bengal', emergencyContactName: 'Arindam Das (husband)', emergencyContactPhone: '9000033303', department: 'Cardiology', tokenNumber: 'CARD-202', visitType: 'FOLLOW_UP', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'bn-IN',
    answers: [
      'আমার angioplasty-এর পর follow-up-এর জন্য এসেছি। এখন বুকে ব্যথা নেই, তবে সিঁড়ি উঠলে একটু ক্লান্ত লাগে।',
      'এই হালকা ক্লান্তি প্রায় দুই সপ্তাহ ধরে আছে, বাড়ছে না।',
      '২০২৪ সালের মার্চে একটি coronary stent বসানো হয়েছিল এবং আমার high blood pressure আছে।',
      'Aspirin 75 mg এবং atorvastatin 40 mg প্রতিদিন নিই। কোনো ওষুধে allergy নেই।',
      'বাবারও coronary artery disease ছিল। আমি ধূমপান করি না, হাঁটি, আর লবণ কম খাওয়ার চেষ্টা করি।',
      'হঠাৎ বুক ব্যথা, অজ্ঞান হওয়া বা বিশ্রামে শ্বাসকষ্ট নেই।',
    ],
    symptoms: ['Mild exertional fatigue', 'No current chest pain'], onset: ['Mild fatigue for approximately 2 weeks; stable'],
    findings: ['Post-PCI follow-up', 'No acute distress reported'],
    vitals: [{ name: 'Blood Pressure', value: '128/78', unit: 'mmHg' }, { name: 'Heart Rate', value: '72', unit: 'bpm' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Aspirin 75 mg once daily', 'Atorvastatin 40 mg once daily'], allergies: ['No known drug allergies reported'],
    history: { medical: ['Coronary stent placed March 2024', 'Hypertension'], family: ['Father had coronary artery disease'], lifestyle: ['Non-smoker', 'Walks regularly', 'Reduced-salt diet'] },
    triage: { priority: 'FOLLOW_UP', score: 26, possibleConditions: ['Stable post-PCI follow-up'], reason: 'Stable follow-up symptoms without chest pain, syncope or rest dyspnea; routine cardiology review is appropriate.', redFlags: [], possibleDiagnoses: [{ name: 'Stable coronary artery disease, post-PCI follow-up', certainty: 'probable', supportingEvidence: ['History of coronary stent', 'No current chest pain and stable vitals'] }, { name: 'Deconditioning or medication-related fatigue', certainty: 'suspected', supportingEvidence: ['Mild stable exertional fatigue for two weeks'] }] },
    medicationRecords: [{ id: 'MED-SYN-0003-01', name: 'Aspirin', dose: '75', unit: 'mg', strength: '75 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'DISCHARGE' }, { id: 'MED-SYN-0003-02', name: 'Atorvastatin', dose: '40', unit: 'mg', strength: '40 mg', route: 'oral', frequency: 'once daily', scheduled: 'Night', source: 'DISCHARGE' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0003-01', 'DISCHARGE_SUMMARY', 'Coronary angioplasty discharge summary', 'Eastern Cardiac Institute', 'EXTERNAL_HOSPITAL_SIMULATION', 'ECI-DC-240318-0003', '2024-03-18', 'bn-IN', 'EASTERN CARDIAC INSTITUTE\nPatient: Neha Das | ABHA ID (Synthetic): ABHA-SYN-10003\nProcedure: PCI with one coronary stent in March 2024.\nDischarge medicines: Aspirin 75 mg daily and Atorvastatin 40 mg nightly.\nFollow-up: Cardiology review with lipid profile.', { procedure: 'PCI with one coronary stent', date: 'March 2024', medications: ['Aspirin 75 mg daily', 'Atorvastatin 40 mg nightly'], followUp: 'Cardiology review and lipid profile' }),
      document('DOC-SYN-0003-02', 'LAB_REPORT', 'Lipid profile', 'Bengal Health Labs', 'EXTERNAL_LAB_SIMULATION', 'BHL-LIPID-250901-0003', '2026-09-01', 'bn-IN', 'BENGAL HEALTH LABS\nPatient: Neha Das\nTotal cholesterol 164 mg/dL; LDL 82 mg/dL; HDL 48 mg/dL; Triglycerides 168 mg/dL.\nComment: Continue clinician-directed cardiovascular risk management.', { totalCholesterol: '164 mg/dL', ldl: '82 mg/dL', hdl: '48 mg/dL', triglycerides: '168 mg/dL' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0004', externalId: 'ABHA-SYN-10004', encounterId: 'ENC-SYN-0004-OPD-20260915', kioskSessionId: 'KSK-SYN-0004',
    displayName: 'Zaid Ali', phone: '9000044444', dateOfBirth: '2020-02-19', gender: 'Male', bloodGroup: 'O+', preferredLanguage: 'Hindi / Urdu',
    address: 'Old Delhi, Delhi', emergencyContactName: 'Imran Ali (father)', emergencyContactPhone: '9000044404', department: 'Pediatrics', tokenNumber: 'PED-401', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'hi-IN',
    answers: [
      'मेरे बेटे को दो दिन से बुखार, सूखी खाँसी और हाथों पर छोटे लाल दाने हैं।',
      'बुखार दो दिन पहले शुरू हुआ, अधिकतम 101.2 डिग्री था; दाने आज सुबह दिखे।',
      'उसे कोई पुरानी बीमारी नहीं है, कोई भर्ती या सर्जरी नहीं हुई। टीके उम्र के अनुसार लगे हैं।',
      'Paracetamol syrup 5 mL दिया है। किसी दवा या खाने से एलर्जी मालूम नहीं है।',
      'घर में किसी को ऐसा बुखार नहीं है। वह स्कूल जाता है और घर में धुआँ या smoking नहीं है।',
      'वह पानी पी रहा है और सांस लेने में दिक्कत नहीं है।',
    ],
    symptoms: ['Fever', 'Dry cough', 'Fine red rash on hands'], onset: ['Fever and cough for 2 days', 'Rash noticed this morning', 'Maximum temperature 101.2°F'],
    findings: ['Febrile child, alert and drinking fluids', 'Fine maculopapular rash on hands', 'No respiratory distress reported'],
    vitals: [{ name: 'Temperature', value: '101.2', unit: '°F' }, { name: 'Heart Rate', value: '118', unit: 'bpm' }, { name: 'Respiratory Rate', value: '26', unit: 'breaths/min' }, { name: 'SpO2', value: '97', unit: '%' }],
    medications: ['Paracetamol syrup 250 mg/5 mL, 5 mL as needed'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['No known chronic illness', 'Immunizations reported up to date', 'No previous admission or surgery'], family: ['No similar illness at home'], lifestyle: ['School-going child', 'No household tobacco smoke reported'] },
    triage: { priority: 'NORMAL', score: 36, possibleConditions: ['Acute viral febrile illness with exanthem'], reason: 'Child is alert, drinking and has no breathing difficulty or altered consciousness reported.', redFlags: [], possibleDiagnoses: [{ name: 'Viral exanthem', certainty: 'probable', supportingEvidence: ['Fever, dry cough and new fine rash', 'Child remains alert and drinking'] }, { name: 'Viral upper respiratory infection', certainty: 'suspected', supportingEvidence: ['Acute cough and fever for two days'] }] },
    medicationRecords: [{ id: 'MED-SYN-0004-01', name: 'Paracetamol syrup', dose: '5', unit: 'mL', strength: '250 mg/5 mL', route: 'oral', frequency: 'as needed for fever', scheduled: 'PRN', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0004-01', 'IMMUNIZATION_RECORD', 'Child immunization record', 'Delhi Child Wellness Centre', 'EXTERNAL_PEDIATRIC_SIMULATION', 'DCW-IMM-250201-0004', '2025-02-01', 'hi-IN', 'DELHI CHILD WELLNESS CENTRE\nChild: Zaid Ali | ABHA ID (Synthetic): ABHA-SYN-10004\nImmunization review: Routine primary series and age-appropriate boosters documented as given.\nNo vaccine reaction documented.', { immunizationStatus: 'Reported up to date', reactions: 'None documented', childName: 'Zaid Ali' }),
      document('DOC-SYN-0004-02', 'PRESCRIPTION', 'Paediatric fever prescription', 'Old Delhi Paediatric Clinic', 'EXTERNAL_CLINIC_SIMULATION', 'ODP-RX-250914-0004', '2026-09-14', 'hi-IN', 'OLD DELHI PAEDIATRIC CLINIC\nChild: Zaid Ali\nParacetamol syrup 250 mg/5 mL: 5 mL orally when required for fever.\nReview for persistent fever, breathing difficulty, poor intake or worsening rash.', { medication: 'Paracetamol syrup 250 mg/5 mL, 5 mL PRN', safetyAdvice: ['Persistent fever', 'Breathing difficulty', 'Poor intake', 'Worsening rash'] }),
    ],
  },
  {
    patientId: 'PAT-SYN-0005', externalId: 'ABHA-SYN-10005', encounterId: 'ENC-SYN-0005-OPD-20260915', kioskSessionId: 'KSK-SYN-0005',
    displayName: 'Priya Nambiar', phone: '9000055555', dateOfBirth: '1992-08-30', gender: 'Female', bloodGroup: 'AB+', preferredLanguage: 'Malayalam / English',
    address: 'Kakkanad, Kochi, Kerala', emergencyContactName: 'Anil Nambiar (husband)', emergencyContactPhone: '9000055505', department: 'General Medicine', tokenNumber: 'GEN-102', visitType: 'REVIEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'ml-IN',
    answers: [
      'എനിക്ക് ക്ഷീണം, തണുപ്പ് സഹിക്കാനാകാത്തത്, മലബന്ധം, കഴിഞ്ഞ രണ്ട് മാസത്തിൽ നാല് കിലോ ഭാരം കൂടിയത് എന്നിവയുണ്ട്.',
      'ഇവ പതുക്കെ രണ്ട് മാസം കൊണ്ട് തുടങ്ങി; കഴിഞ്ഞ മൂന്ന് ആഴ്ചയായി കൂടുതൽ ശ്രദ്ധിക്കുന്നു.',
      'മൂന്ന് വർഷമായി hypothyroidism ഉണ്ട്. ആശുപത്രിയിൽ കിടന്നിട്ടില്ല, surgery ഉണ്ടായിട്ടില്ല.',
      'Levothyroxine 50 micrograms രാവിലെ കഴിക്കുന്നു. മരുന്നിനോ ഭക്ഷണത്തിനോ allergy ഇല്ല.',
      'അമ്മയ്ക്കും thyroid പ്രശ്നമുണ്ട്. ഞാൻ accountant ആണ്, പുകവലി/മദ്യപാനം ഇല്ല, exercise കുറവാണ്.',
      'നെഞ്ചുവേദനയോ ശ്വാസംമുട്ടലോ തലകറക്കമോ ഇല്ല.',
    ],
    symptoms: ['Fatigue', 'Cold intolerance', 'Constipation', '4 kg weight gain'], onset: ['Gradual onset over 2 months; more noticeable for 3 weeks'],
    findings: ['Dry skin reported', 'Pulse 58 bpm', 'No acute distress reported'],
    vitals: [{ name: 'Blood Pressure', value: '118/76', unit: 'mmHg' }, { name: 'Heart Rate', value: '58', unit: 'bpm' }, { name: 'Temperature', value: '97.4', unit: '°F' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Levothyroxine 50 mcg once daily before breakfast'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['Primary hypothyroidism for 3 years', 'No prior admission or surgery'], family: ['Mother has thyroid disease'], lifestyle: ['Accountant', 'No tobacco or alcohol', 'Low physical activity'] },
    triage: { priority: 'NORMAL', score: 29, possibleConditions: ['Thyroid and metabolic symptoms'], reason: 'Gradual stable symptoms with normal blood pressure, oxygen saturation and no acute safety signal.', redFlags: [], possibleDiagnoses: [{ name: 'Hypothyroidism with possible under-replacement', certainty: 'probable', supportingEvidence: ['Known hypothyroidism with fatigue, cold intolerance, constipation and weight gain', 'Bradycardic pulse of 58 bpm'] }, { name: 'Iron-deficiency or other nutritional anaemia', certainty: 'suspected', supportingEvidence: ['Fatigue; laboratory correlation required'] }] },
    medicationRecords: [{ id: 'MED-SYN-0005-01', name: 'Levothyroxine', dose: '50', unit: 'mcg', strength: '50 mcg', route: 'oral', frequency: 'once daily before breakfast', scheduled: 'Morning', source: 'EXTERNAL' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0005-01', 'LAB_REPORT', 'Thyroid function test', 'Kerala Endocrine Lab', 'EXTERNAL_LAB_SIMULATION', 'KEL-TFT-250908-0005', '2026-09-08', 'ml-IN', 'KERALA ENDOCRINE LAB\nPatient: Priya Nambiar | ABHA ID (Synthetic): ABHA-SYN-10005\nTSH: 8.6 mIU/L (high); Free T4: 0.72 ng/dL (low-normal).\nComment: Correlate with adherence, timing of levothyroxine and clinical assessment.', { tests: [{ name: 'TSH', value: '8.6 mIU/L', flag: 'High' }, { name: 'Free T4', value: '0.72 ng/dL', flag: 'Low-normal' }], comment: 'Correlate with adherence and clinical assessment' }),
      document('DOC-SYN-0005-02', 'PRESCRIPTION', 'Endocrinology prescription', 'Kochi Family Practice', 'EXTERNAL_CLINIC_SIMULATION', 'KFP-RX-250101-0005', '2026-01-01', 'ml-IN', 'KOCHI FAMILY PRACTICE\nPatient: Priya Nambiar\nLevothyroxine 50 mcg by mouth every morning 30 minutes before food.\nRepeat thyroid function test in 8–12 weeks.', { medication: 'Levothyroxine 50 mcg each morning before food', followUp: 'Repeat thyroid function test in 8–12 weeks' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0006', externalId: 'ABHA-SYN-10006', encounterId: 'ENC-SYN-0006-OPD-20260915', kioskSessionId: 'KSK-SYN-0006',
    displayName: 'Suresh Kumar', phone: '9000066666', dateOfBirth: '1959-01-11', gender: 'Male', bloodGroup: 'A+', preferredLanguage: 'Tamil / English',
    address: 'Adyar, Chennai, Tamil Nadu', emergencyContactName: 'Meena Kumar (wife)', emergencyContactPhone: '9000066606', department: 'General Medicine', tokenNumber: 'GEN-103', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'ta-IN',
    answers: [
      'மூன்று நாட்களாக மூச்சுத்திணறல் அதிகமாகி, வீசிங் மற்றும் மஞ்சள் சளியுடன் இருமல் உள்ளது.',
      'மூன்று நாட்களுக்கு முன் தொடங்கியது; இன்று காலை நடக்கும்போதும் மூச்சு மிகவும் கஷ்டமாக இருந்தது.',
      'எனக்கு COPD மற்றும் high blood pressure உள்ளது. 2019ல் pneumonia-க்காக hospital admission இருந்தது; surgery இல்லை.',
      'Tiotropium inhaler தினமும், budesonide-formoterol inhaler தினமும், amlodipine 5 mg எடுத்துக்கொள்கிறேன். allergy இல்லை.',
      '45 pack-years smoking history; ஐந்து ஆண்டுகளுக்கு முன் நிறுத்தினேன். ஓய்வு பெற்ற bus driver; வீட்டில் wood-smoke exposure சில நேரம் உண்டு.',
      'இப்போது பேசும்போது வாக்கியம் முடிக்க மூச்சு வாங்க வேண்டியுள்ளது.',
    ],
    symptoms: ['Worsening shortness of breath', 'Wheeze', 'Productive cough with yellow sputum'], onset: ['Worsening for 3 days', 'Breathlessness became severe while walking this morning', 'Needs pauses while speaking'],
    findings: ['Tachypnoeic with accessory muscle use', 'Diffuse expiratory wheeze', 'Low oxygen saturation at triage'],
    vitals: [{ name: 'Blood Pressure', value: '148/86', unit: 'mmHg' }, { name: 'Heart Rate', value: '112', unit: 'bpm' }, { name: 'Respiratory Rate', value: '30', unit: 'breaths/min' }, { name: 'SpO2', value: '88', unit: '%' }],
    medications: ['Tiotropium inhaler once daily', 'Budesonide-formoterol inhaler twice daily', 'Amlodipine 5 mg once daily'], allergies: ['No known drug allergies reported'],
    history: { medical: ['COPD', 'Hypertension', 'Pneumonia admission in 2019', 'No surgery'], family: ['No relevant family respiratory history reported'], lifestyle: ['45 pack-year former smoker; quit 5 years ago', 'Retired bus driver', 'Occasional household wood-smoke exposure'] },
    triage: { priority: 'URGENT', score: 99, possibleConditions: ['Possible acute respiratory exacerbation'], reason: 'Severe worsening breathlessness with tachypnoea, accessory muscle use and SpO2 88% requires immediate clinical assessment.', redFlags: ['Chest or breathing red flag', 'Severe or rapidly worsening symptom'], possibleDiagnoses: [{ name: 'Acute exacerbation of COPD', certainty: 'probable', supportingEvidence: ['Known COPD with increased dyspnea, wheeze and purulent sputum', 'Respiratory rate 30 and SpO2 88%'] }, { name: 'Community-acquired pneumonia', certainty: 'suspected', supportingEvidence: ['Worsening cough with yellow sputum and acute breathlessness', 'Fever and imaging correlation required'] }, { name: 'Acute hypoxemic respiratory failure', certainty: 'suspected', supportingEvidence: ['SpO2 88% with accessory muscle use and difficulty speaking full sentences'] }] },
    medicationRecords: [{ id: 'MED-SYN-0006-01', name: 'Tiotropium', dose: '18', unit: 'mcg', strength: '18 mcg inhalation capsule', route: 'inhaled', frequency: 'once daily', scheduled: 'Morning', source: 'EXTERNAL' }, { id: 'MED-SYN-0006-02', name: 'Budesonide-formoterol', dose: '2', unit: 'puffs', strength: '160/4.5 mcg per puff', route: 'inhaled', frequency: 'twice daily', scheduled: 'Morning and evening', source: 'EXTERNAL' }, { id: 'MED-SYN-0006-03', name: 'Amlodipine', dose: '5', unit: 'mg', strength: '5 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0006-01', 'IMAGING_REPORT', 'Chest radiograph report', 'Chennai Pulmonary Imaging', 'EXTERNAL_RADIOLOGY_SIMULATION', 'CPI-CXR-250914-0006', '2026-09-14', 'ta-IN', 'CHENNAI PULMONARY IMAGING\nPatient: Suresh Kumar | ABHA ID (Synthetic): ABHA-SYN-10006\nChest X-ray PA view: Hyperinflation with coarse peribronchial markings. No focal lobar consolidation or pleural effusion.\nImpression: Chronic obstructive changes; correlate for acute exacerbation.', { study: 'Chest X-ray PA view', findings: ['Hyperinflation', 'Coarse peribronchial markings', 'No focal lobar consolidation', 'No pleural effusion'], impression: 'Chronic obstructive changes; correlate clinically' }),
      document('DOC-SYN-0006-02', 'DISCHARGE_SUMMARY', 'Prior COPD admission summary', 'Tamil Nadu District Hospital', 'EXTERNAL_HOSPITAL_SIMULATION', 'TNDH-DC-190722-0006', '2019-07-22', 'ta-IN', 'TAMIL NADU DISTRICT HOSPITAL\nPatient: Suresh Kumar\nAdmission: Community-acquired pneumonia with COPD exacerbation in July 2019; improved with inpatient treatment.\nChronic medicines at discharge included inhaled maintenance therapy. Smoking cessation counselling provided.', { priorAdmission: 'July 2019', reason: 'Pneumonia with COPD exacerbation', outcome: 'Improved', counselling: 'Smoking cessation' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0007', externalId: 'ABHA-SYN-10007', encounterId: 'ENC-SYN-0007-OPD-20260915', kioskSessionId: 'KSK-SYN-0007',
    displayName: 'Ayesha Khan', phone: '9000077777', dateOfBirth: '1997-12-09', gender: 'Female', bloodGroup: 'B+', preferredLanguage: 'Hindi / Urdu',
    address: 'Bhopal, Madhya Pradesh', emergencyContactName: 'Nusrat Khan (sister)', emergencyContactPhone: '9000077707', department: 'Dermatology', tokenNumber: 'DERM-501', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'ur-IN',
    answers: [
      'چار گھنٹے پہلے جھینگا کھانے کے بعد پورے جسم پر خارش والی چھپاکی ہو گئی ہے۔',
      'یہ تقریباً چار گھنٹے پہلے شروع ہوئی اور بازوؤں سے جسم پر پھیل گئی۔',
      'مجھے بچپن سے کبھی کبھار eczema ہوتا ہے، لیکن asthma یا کوئی بڑی بیماری نہیں ہے۔',
      'ایک cetirizine tablet لی ہے۔ shellfish سے ایسی ہی allergy پہلے بھی ہوئی تھی؛ penicillin سے کوئی مسئلہ نہیں۔',
      'بہن کو eczema ہے۔ میں office میں کام کرتی ہوں، smoking نہیں، alcohol کبھی کبھار، اور کوئی نیا صابن استعمال نہیں کیا۔',
      'گلے میں سوجن، سانس لینے میں دقت یا چکر نہیں آ رہے۔',
    ],
    symptoms: ['Generalized itchy hives after shrimp ingestion'], onset: ['Started 4 hours ago after eating shrimp', 'Previous similar shellfish reaction'],
    findings: ['Widespread urticaria', 'No throat swelling or respiratory compromise reported'],
    vitals: [{ name: 'Blood Pressure', value: '122/78', unit: 'mmHg' }, { name: 'Heart Rate', value: '88', unit: 'bpm' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Cetirizine 10 mg single dose taken today'], allergies: ['Shellfish — itchy hives'],
    history: { medical: ['Intermittent eczema since childhood', 'No asthma reported'], family: ['Sister has eczema'], lifestyle: ['Office worker', 'No tobacco', 'Occasional alcohol'] },
    triage: { priority: 'NORMAL', score: 48, possibleConditions: ['Acute allergic skin reaction without airway symptoms'], reason: 'Generalized hives need clinical review; no throat swelling, breathing difficulty, syncope or low oxygen reported.', redFlags: [], possibleDiagnoses: [{ name: 'Acute urticaria due to food exposure', certainty: 'probable', supportingEvidence: ['Itchy generalized hives four hours after shrimp', 'Previous similar shellfish reaction'] }, { name: 'Early allergic reaction requiring observation', certainty: 'suspected', supportingEvidence: ['Widespread symptoms; patient currently denies airway symptoms'] }] },
    medicationRecords: [{ id: 'MED-SYN-0007-01', name: 'Cetirizine', dose: '10', unit: 'mg', strength: '10 mg', route: 'oral', frequency: 'single dose today', scheduled: 'One dose', source: 'HOME' }],
    allergiesRecords: [{ id: 'ALG-SYN-0007-01', substance: 'Shellfish', normalizedSubstance: 'shellfish', reaction: 'Itchy hives', severity: 'HIGH' }],
    documents: [
      document('DOC-SYN-0007-01', 'PRESCRIPTION', 'Dermatology allergy prescription', 'Bhopal Skin and Allergy Clinic', 'EXTERNAL_CLINIC_SIMULATION', 'BSAC-RX-250915-0007', '2026-09-15', 'ur-IN', 'BHOPAL SKIN AND ALLERGY CLINIC\nPatient: Ayesha Khan | ABHA ID (Synthetic): ABHA-SYN-10007\nWorking impression: Acute urticaria after shellfish exposure.\nAllergy documented: Shellfish causes itchy hives. Avoidance and emergency warning signs explained.', { impression: 'Acute urticaria after shellfish', allergy: 'Shellfish: itchy hives', advice: 'Avoid shellfish; seek urgent care for airway symptoms' }),
      document('DOC-SYN-0007-02', 'REFERRAL', 'Allergy evaluation referral', 'Bhopal Community Health Centre', 'EXTERNAL_REFERRAL_SIMULATION', 'BCHC-REF-250701-0007', '2026-07-01', 'ur-IN', 'BHOPAL COMMUNITY HEALTH CENTRE\nReferral: Recurrent food-associated urticaria for allergy evaluation and trigger counselling.\nNo previous anaphylaxis documented.', { reason: 'Recurrent food-associated urticaria', referralTo: 'Allergy / Dermatology', priorAnaphylaxis: false }),
    ],
  },
  {
    patientId: 'PAT-SYN-0008', externalId: 'ABHA-SYN-10008', encounterId: 'ENC-SYN-0008-OPD-20260915', kioskSessionId: 'KSK-SYN-0008',
    displayName: 'Arjun Menon', phone: '9000088888', dateOfBirth: '1978-03-27', gender: 'Male', bloodGroup: 'O+', preferredLanguage: 'Kannada / English',
    address: 'Indiranagar, Bengaluru, Karnataka', emergencyContactName: 'Suma Menon (wife)', emergencyContactPhone: '9000088808', department: 'Orthopedics', tokenNumber: 'ORTH-301', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'kn-IN',
    answers: [
      'ಬಲ ಮೊಣಕಾಲಿನಲ್ಲಿ ಆರು ತಿಂಗಳಿಂದ ನೋವು ಇದೆ; ಮೆಟ್ಟಿಲು ಏರುವಾಗ ಮತ್ತು ಬಹಳ ಹೊತ್ತು ನಿಂತಾಗ ಹೆಚ್ಚಾಗುತ್ತದೆ.',
      'ಆರು ತಿಂಗಳಿಂದ ನಿಧಾನವಾಗಿ ಇದೆ, ಆದರೆ ಕಳೆದ ಒಂದು ತಿಂಗಳಲ್ಲಿ ಕೆಲಸಕ್ಕೆ ತೊಂದರೆ ಆಗುವಷ್ಟು ಹೆಚ್ಚಾಗಿದೆ.',
      'ನನಗೆ high blood pressure ಇದೆ. ಹಿಂದೆ ಯಾವುದೇ joint surgery ಅಥವಾ hospital admission ಆಗಿಲ್ಲ.',
      'Amlodipine 5 mg ಪ್ರತಿದಿನ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ; ಕೆಲವೊಮ್ಮೆ diclofenac gel ಬಳಸುತ್ತೇನೆ. ಯಾವುದೇ allergy ಇಲ್ಲ.',
      'ತಾಯಿಗೆ knee arthritis ಇತ್ತು. ನಾನು software manager, exercise ಕಡಿಮೆ, smoking ಇಲ್ಲ, weekend ನಲ್ಲಿ ಒಂದು ಅಥವಾ ಎರಡು drinks.',
      'ಜ್ವರ, ಬೀಳುವಿಕೆ ಅಥವಾ ಕಾಲಿನಲ್ಲಿ numbness ಇಲ್ಲ.',
    ],
    symptoms: ['Right knee pain', 'Pain worse on stairs and prolonged standing'], onset: ['Gradual onset over 6 months', 'Functionally worse over the last month'],
    findings: ['Knee crepitus reported', 'Mild reduction in flexion', 'No acute injury or fever reported'],
    vitals: [{ name: 'Blood Pressure', value: '136/82', unit: 'mmHg' }, { name: 'Heart Rate', value: '76', unit: 'bpm' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Amlodipine 5 mg once daily', 'Diclofenac topical gel occasionally'], allergies: ['No known drug allergies reported'],
    history: { medical: ['Hypertension', 'No previous joint surgery or admission'], family: ['Mother had knee osteoarthritis'], lifestyle: ['Software manager', 'Low exercise', 'No tobacco', 'One to two alcoholic drinks on weekends'] },
    triage: { priority: 'NORMAL', score: 24, possibleConditions: ['Chronic mechanical knee pain'], reason: 'Chronic stable musculoskeletal symptoms without acute injury, fever or neurovascular red flag.', redFlags: [], possibleDiagnoses: [{ name: 'Knee osteoarthritis', certainty: 'probable', supportingEvidence: ['Gradual six-month pain worse with stairs and standing', 'Crepitus and reduced flexion'] }, { name: 'Meniscal or other internal derangement', certainty: 'suspected', supportingEvidence: ['Functional knee pain; imaging and examination required'] }] },
    medicationRecords: [{ id: 'MED-SYN-0008-01', name: 'Amlodipine', dose: '5', unit: 'mg', strength: '5 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'HOME' }, { id: 'MED-SYN-0008-02', name: 'Diclofenac topical gel', dose: 'Apply', unit: 'g', strength: '1% gel', route: 'topical', frequency: 'as needed', scheduled: 'PRN', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0008-01', 'IMAGING_REPORT', 'Right knee radiograph', 'Bengaluru Bone Imaging', 'EXTERNAL_RADIOLOGY_SIMULATION', 'BBI-XR-250910-0008', '2026-09-10', 'kn-IN', 'BENGALURU BONE IMAGING\nPatient: Arjun Menon | ABHA ID (Synthetic): ABHA-SYN-10008\nRight knee X-ray: Medial compartment joint-space narrowing with marginal osteophytes. No acute fracture.\nImpression: Mild-to-moderate medial compartment osteoarthritic change.', { study: 'Right knee X-ray', findings: ['Medial compartment joint-space narrowing', 'Marginal osteophytes', 'No acute fracture'], impression: 'Mild-to-moderate medial compartment osteoarthritis' }),
      document('DOC-SYN-0008-02', 'REFERRAL', 'Physiotherapy referral', 'Indiranagar Family Clinic', 'EXTERNAL_REFERRAL_SIMULATION', 'IFC-REF-250911-0008', '2026-09-11', 'kn-IN', 'INDIRANAGAR FAMILY CLINIC\nReferral for physiotherapy assessment, quadriceps strengthening and weight-bearing activity counselling for chronic right knee pain.', { referralTo: 'Physiotherapy', reason: 'Chronic right knee pain', goals: ['Quadriceps strengthening', 'Activity modification'] }),
    ],
  },
  {
    patientId: 'PAT-SYN-0009', externalId: 'ABHA-SYN-10009', encounterId: 'ENC-SYN-0009-OPD-20260915', kioskSessionId: 'KSK-SYN-0009',
    displayName: 'Meera Joshi', phone: '9000099999', dateOfBirth: '2002-10-17', gender: 'Female', bloodGroup: 'A-', preferredLanguage: 'Hindi',
    address: 'Malviya Nagar, Jaipur, Rajasthan', emergencyContactName: 'Sunil Joshi (father)', emergencyContactPhone: '9000099909', department: 'Dermatology', tokenNumber: 'DERM-502', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'hi-IN',
    answers: [
      'मेरे चेहरे पर pimples और दर्द वाले दाने लगभग आठ महीने से हैं, खासकर गालों और ठोड़ी पर।',
      'आठ महीने पहले शुरू हुआ; periods के आसपास दाने बढ़ जाते हैं और पिछले दो महीने में कुछ निशान हुए हैं।',
      'कोई पुरानी बीमारी, बड़ी बीमारी, admission या surgery नहीं हुई।',
      'OTC benzoyl peroxide face wash कभी-कभी लगाती हूँ। कोई दवा या food allergy नहीं है।',
      'माँ को भी teenage acne था। मैं college student हूँ, smoking नहीं करती और कोई regular medicine नहीं लेती।',
      'आँखों के पास swelling, fever या तेजी से फैलता हुआ rash नहीं है।',
    ],
    symptoms: ['Inflammatory facial acne', 'Tender facial lesions', 'Post-inflammatory marks'], onset: ['Acne for 8 months; worsens around menstruation', 'Scarring noticed for 2 months'],
    findings: ['Papules and pustules reported on cheeks and chin', 'No fever or rapidly spreading rash'],
    vitals: [{ name: 'Blood Pressure', value: '110/70', unit: 'mmHg' }, { name: 'Heart Rate', value: '74', unit: 'bpm' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Over-the-counter benzoyl peroxide face wash intermittently'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['No chronic illness', 'No previous admission or surgery'], family: ['Mother had adolescent acne'], lifestyle: ['College student', 'No tobacco', 'No regular medicines'] },
    triage: { priority: 'NORMAL', score: 21, possibleConditions: ['Chronic inflammatory skin condition'], reason: 'Stable localized dermatologic symptoms without fever, airway symptoms or rapidly spreading rash.', redFlags: [], possibleDiagnoses: [{ name: 'Inflammatory acne vulgaris', certainty: 'probable', supportingEvidence: ['Facial papules and pustules for eight months', 'Cyclical worsening around menstruation'] }, { name: 'Post-inflammatory hyperpigmentation', certainty: 'suspected', supportingEvidence: ['New marks reported after inflammatory lesions'] }] },
    medicationRecords: [{ id: 'MED-SYN-0009-01', name: 'Benzoyl peroxide face wash', dose: 'Use', unit: 'application', strength: 'Over-the-counter', route: 'topical', frequency: 'intermittently', scheduled: 'Evening', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0009-01', 'PRESCRIPTION', 'Dermatology acne prescription', 'Jaipur Skin Centre', 'EXTERNAL_CLINIC_SIMULATION', 'JSC-RX-250901-0009', '2026-09-01', 'hi-IN', 'JAIPUR SKIN CENTRE\nPatient: Meera Joshi | ABHA ID (Synthetic): ABHA-SYN-10009\nAssessment: Moderate inflammatory acne.\nPrior over-the-counter benzoyl peroxide use documented. Dermatology review advised for treatment planning.', { assessment: 'Moderate inflammatory acne', priorTreatment: 'OTC benzoyl peroxide', followUp: 'Dermatology review' }),
      document('DOC-SYN-0009-02', 'REFERRAL', 'Primary care dermatology referral', 'Malviya Nagar Health Centre', 'EXTERNAL_REFERRAL_SIMULATION', 'MNHC-REF-250829-0009', '2026-08-29', 'hi-IN', 'MALVIYA NAGAR HEALTH CENTRE\nReferral for persistent facial acne with tender lesions and early marks despite over-the-counter wash.', { reason: 'Persistent facial acne', duration: '8 months', referralTo: 'Dermatology' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0010', externalId: 'ABHA-SYN-10010', encounterId: 'ENC-SYN-0010-OPD-20260915', kioskSessionId: 'KSK-SYN-0010',
    displayName: 'Rajiv Bose', phone: '9000001112', dateOfBirth: '1963-05-08', gender: 'Male', bloodGroup: 'B+', preferredLanguage: 'Bengali / English',
    address: 'Ballygunge, Kolkata, West Bengal', emergencyContactName: 'Mita Bose (daughter)', emergencyContactPhone: '9000001102', department: 'General Medicine', tokenNumber: 'GEN-104', visitType: 'REVIEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'bn-IN',
    answers: [
      'দুই সপ্তাহ ধরে দুই পায়ে ফোলা, দুর্বলতা এবং রাতে শুয়ে থাকলে হালকা শ্বাসকষ্ট হচ্ছে। প্রস্রাবও আগের চেয়ে কম।',
      'ফোলা দুই সপ্তাহ ধরে, গত তিন দিনে বেশি হয়েছে; urine output গত এক সপ্তাহে কম মনে হচ্ছে।',
      'চৌদ্দ বছর ধরে diabetes, তিন বছর ধরে CKD stage 3 এবং hypertension আছে। ২০২২ সালে admission হয়েছিল, surgery হয়নি।',
      'Insulin glargine রাতে, telmisartan 40 mg এবং furosemide 20 mg নিই। কোনো drug allergy নেই।',
      'বাবার kidney disease ছিল। আমি অবসরপ্রাপ্ত bank clerk, আগে smoking করতাম না, লবণ কমানোর চেষ্টা করি।',
      'শুয়ে থাকলে শ্বাস একটু কষ্ট হয়, কিন্তু এখন কথা বলতে পারছি।',
    ],
    symptoms: ['Bilateral leg swelling', 'Fatigue', 'Mild orthopnea', 'Reduced urine output'], onset: ['Leg swelling for 2 weeks; worse over last 3 days', 'Reduced urine for approximately 1 week'],
    findings: ['Bilateral pitting oedema reported', 'Pallor reported', 'Possible fluid overload symptoms'],
    vitals: [{ name: 'Blood Pressure', value: '154/92', unit: 'mmHg' }, { name: 'Heart Rate', value: '88', unit: 'bpm' }, { name: 'Respiratory Rate', value: '22', unit: 'breaths/min' }, { name: 'SpO2', value: '94', unit: '%' }],
    medications: ['Insulin glargine nightly', 'Telmisartan 40 mg once daily', 'Furosemide 20 mg once daily'], allergies: ['No known drug allergies reported'],
    history: { medical: ['Type 2 diabetes for 14 years', 'Chronic kidney disease stage 3 for 3 years', 'Hypertension', 'Admission in 2022; no surgery'], family: ['Father had kidney disease'], lifestyle: ['Retired bank clerk', 'No tobacco history reported', 'Reduced-salt diet'] },
    triage: { priority: 'URGENT', score: 86, possibleConditions: ['Possible renal or cardiac fluid overload'], reason: 'Reduced urine output with worsening oedema, orthopnea, CKD and SpO2 94% requires prompt clinician assessment.', redFlags: ['Severe or rapidly worsening symptom'], possibleDiagnoses: [{ name: 'Fluid overload related to chronic kidney disease', certainty: 'probable', supportingEvidence: ['Known CKD with reduced urine and worsening bilateral oedema', 'Orthopnea and elevated blood pressure'] }, { name: 'Acute-on-chronic kidney injury', certainty: 'suspected', supportingEvidence: ['Reduced urine output over one week in a patient with CKD'] }, { name: 'Congestive cardiac failure', certainty: 'suspected', supportingEvidence: ['Bilateral oedema, orthopnea and borderline low oxygen saturation'] }] },
    medicationRecords: [{ id: 'MED-SYN-0010-01', name: 'Insulin glargine', dose: '18', unit: 'units', strength: '100 units/mL', route: 'subcutaneous', frequency: 'once nightly', scheduled: 'Bedtime', source: 'EXTERNAL' }, { id: 'MED-SYN-0010-02', name: 'Telmisartan', dose: '40', unit: 'mg', strength: '40 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'EXTERNAL' }, { id: 'MED-SYN-0010-03', name: 'Furosemide', dose: '20', unit: 'mg', strength: '20 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'EXTERNAL' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0010-01', 'LAB_REPORT', 'Renal and metabolic profile', 'Bose Clinical Laboratory', 'EXTERNAL_LAB_SIMULATION', 'BCL-RFT-250914-0010', '2026-09-14', 'bn-IN', 'BOSE CLINICAL LABORATORY\nPatient: Rajiv Bose | ABHA ID (Synthetic): ABHA-SYN-10010\nCreatinine 2.1 mg/dL; eGFR 34 mL/min/1.73m²; potassium 4.9 mmol/L; HbA1c 8.2%.\nComment: Compare with baseline and correlate with reduced urine output.', { creatinine: '2.1 mg/dL', egfr: '34 mL/min/1.73m²', potassium: '4.9 mmol/L', hba1c: '8.2%', comment: 'Compare with baseline' }),
      document('DOC-SYN-0010-02', 'IMAGING_REPORT', 'Echocardiogram summary', 'Kolkata Heart and Kidney Centre', 'EXTERNAL_CARDIOLOGY_SIMULATION', 'KHKC-ECHO-250601-0010', '2026-06-01', 'bn-IN', 'KOLKATA HEART AND KIDNEY CENTRE\nPatient: Rajiv Bose\nEchocardiogram: LVEF 48%; mild concentric LV hypertrophy; grade I diastolic dysfunction.\nSuggested: Clinical correlation and blood pressure optimisation.', { study: 'Echocardiogram', lvef: '48%', findings: ['Mild LV hypertrophy', 'Grade I diastolic dysfunction'], suggestion: 'Clinical correlation' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0011', externalId: 'ABHA-SYN-10011', encounterId: 'ENC-SYN-0011-OPD-20260915', kioskSessionId: 'KSK-SYN-0011',
    displayName: 'Lakshmi Devi', phone: '9000002223', dateOfBirth: '1955-09-18', gender: 'Female', bloodGroup: 'O+', preferredLanguage: 'Tamil',
    address: 'Madurai, Tamil Nadu', emergencyContactName: 'Karthik Devi (son)', emergencyContactPhone: '9000002203', department: 'Orthopedics', tokenNumber: 'ORTH-302', visitType: 'FOLLOW_UP', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'ta-IN',
    answers: [
      'எனக்கு நீண்ட நாட்களாக கீழ் முதுகு மற்றும் இரு முழங்கால்களில் வலி உள்ளது; நடக்கும்போது அதிகமாகிறது.',
      'முதுகுவலி பல ஆண்டுகளாக உள்ளது, முழங்கால் வலி கடந்த ஒரு வருடமாக மெதுவாக அதிகரிக்கிறது.',
      'Diabetes அல்லது heart disease இல்லை. 2021ல் cataract surgery நடந்தது; வேறு admission இல்லை.',
      'Paracetamol சில நாட்களில் எடுத்துக் கொள்கிறேன். எந்த மருந்து அல்லது உணவு allergy இல்லை.',
      'அம்மாவுக்கும் joint pain இருந்தது. நான் retired homemaker; தினமும் சிறிது நடைப்பயிற்சி, tobacco இல்லை.',
      'காலில் பலவீனம், numbness, bladder அல்லது bowel பிரச்சனை இல்லை.',
    ],
    symptoms: ['Chronic low back pain', 'Bilateral knee pain', 'Pain with walking'], onset: ['Low back pain for several years', 'Knee pain gradually worsening for 1 year'],
    findings: ['Chronic mechanical pain pattern', 'No weakness, sensory loss or bladder/bowel symptoms reported'],
    vitals: [{ name: 'Blood Pressure', value: '130/78', unit: 'mmHg' }, { name: 'Heart Rate', value: '80', unit: 'bpm' }, { name: 'SpO2', value: '98', unit: '%' }],
    medications: ['Paracetamol 500 mg occasionally for pain'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['Cataract surgery in 2021', 'No diabetes or heart disease'], family: ['Mother had chronic joint pain'], lifestyle: ['Retired homemaker', 'Light daily walking', 'No tobacco'] },
    triage: { priority: 'FOLLOW_UP', score: 23, possibleConditions: ['Chronic degenerative musculoskeletal pain'], reason: 'Long-standing stable mechanical pain without neurological or systemic red flags.', redFlags: [], possibleDiagnoses: [{ name: 'Multi-joint osteoarthritis', certainty: 'probable', supportingEvidence: ['Gradual knee pain with walking and chronic back pain', 'No systemic symptoms reported'] }, { name: 'Mechanical low back pain', certainty: 'probable', supportingEvidence: ['Several-year course without weakness, sensory or sphincter symptoms'] }] },
    medicationRecords: [{ id: 'MED-SYN-0011-01', name: 'Paracetamol', dose: '500', unit: 'mg', strength: '500 mg', route: 'oral', frequency: 'occasionally as needed', scheduled: 'PRN', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0011-01', 'AYUSH_CONSULTATION', 'Ayurveda musculoskeletal consultation', 'Madurai Ayurveda Wellness Hospital', 'EXTERNAL_AYUSH_SIMULATION', 'MAWH-AYU-250820-0011', '2026-08-20', 'ta-IN', 'MADURAI AYURVEDA WELLNESS HOSPITAL\nPatient: Lakshmi Devi | ABHA ID (Synthetic): ABHA-SYN-10011\nAyurveda assessment recorded: Vata-predominant presentation considered by practitioner; Prakriti and Agni review documented.\nConcern: Chronic low back and knee pain. Continue practitioner-led review; no emergency symptoms recorded.', { assessmentFramework: 'Ayurveda', prakriti: 'Vata-predominant considered', agni: 'To be reviewed', concern: 'Chronic low back and knee pain', emergencySymptoms: 'None recorded' }),
      document('DOC-SYN-0011-02', 'IMAGING_REPORT', 'Lumbar spine and knee radiographs', 'Madurai District Imaging', 'EXTERNAL_RADIOLOGY_SIMULATION', 'MDI-XR-250821-0011', '2026-08-21', 'ta-IN', 'MADURAI DISTRICT IMAGING\nPatient: Lakshmi Devi\nLumbar spine: Mild multilevel spondylotic changes. Knees: Bilateral medial compartment narrowing, greater on the left. No acute fracture.', { studies: ['Lumbar spine X-ray', 'Bilateral knee X-rays'], findings: ['Mild lumbar spondylosis', 'Bilateral medial compartment narrowing', 'No acute fracture'] }),
    ],
  },
  {
    patientId: 'PAT-SYN-0012', externalId: 'ABHA-SYN-10012', encounterId: 'ENC-SYN-0012-OPD-20260915', kioskSessionId: 'KSK-SYN-0012',
    displayName: 'Nitin Verma', phone: '9000003334', dateOfBirth: '1987-01-26', gender: 'Male', bloodGroup: 'AB+', preferredLanguage: 'Hindi / Hinglish',
    address: 'Noida Sector 62, Uttar Pradesh', emergencyContactName: 'Pooja Verma (wife)', emergencyContactPhone: '9000003304', department: 'Orthopedics', tokenNumber: 'ORTH-303', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'hi-IN',
    answers: [
      'भारी सामान उठाने के बाद पांच दिन से कमर के निचले हिस्से में दर्द है जो दाहिनी जांघ के पीछे तक जाता है।',
      'दर्द पांच दिन पहले शुरू हुआ, बैठने और झुकने से बढ़ता है, लेकिन हर दिन थोड़ा बेहतर है।',
      'कोई पुरानी बीमारी, admission या surgery नहीं है।',
      'Ibuprofen 400 mg दो बार लिया है। कोई known allergy नहीं है।',
      'पिता को भी back pain रहता है। मैं warehouse supervisor हूँ, smoking नहीं करता, काम में lifting होती है।',
      'पैर में कमजोरी या सुन्नपन नहीं है और पेशाब या मल पर नियंत्रण सामान्य है।',
    ],
    symptoms: ['Acute low back pain', 'Pain radiating to posterior right thigh'], onset: ['Started 5 days ago after lifting', 'Improving slightly each day'],
    findings: ['Mechanical trigger', 'No weakness, numbness or sphincter symptoms reported'],
    vitals: [{ name: 'Blood Pressure', value: '124/80', unit: 'mmHg' }, { name: 'Heart Rate', value: '82', unit: 'bpm' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Ibuprofen 400 mg taken twice'], allergies: ['No known drug allergies reported'],
    history: { medical: ['No known chronic illness', 'No prior admission or surgery'], family: ['Father has recurrent back pain'], lifestyle: ['Warehouse supervisor', 'Frequent lifting at work', 'No tobacco'] },
    triage: { priority: 'NORMAL', score: 40, possibleConditions: ['Acute mechanical low back pain'], reason: 'Acute post-lifting pain is improving and no weakness, numbness or bladder/bowel red flag is reported.', redFlags: [], possibleDiagnoses: [{ name: 'Acute lumbar strain with radicular pain', certainty: 'probable', supportingEvidence: ['Onset after lifting with pain into posterior thigh', 'No neurological deficit reported'] }, { name: 'Lumbar disc irritation', certainty: 'suspected', supportingEvidence: ['Radiating posterior thigh pain; examination required'] }] },
    medicationRecords: [{ id: 'MED-SYN-0012-01', name: 'Ibuprofen', dose: '400', unit: 'mg', strength: '400 mg', route: 'oral', frequency: 'two doses taken', scheduled: 'Completed doses', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0012-01', 'IMAGING_REPORT', 'Lumbar spine radiograph', 'Noida Orthopaedic Imaging', 'EXTERNAL_RADIOLOGY_SIMULATION', 'NOI-XR-250913-0012', '2026-09-13', 'hi-IN', 'NOIDA ORTHOPAEDIC IMAGING\nPatient: Nitin Verma | ABHA ID (Synthetic): ABHA-SYN-10012\nLumbar spine X-ray: Alignment maintained. Mild L4-L5 disc-space reduction. No acute compression fracture.', { study: 'Lumbar spine X-ray', findings: ['Alignment maintained', 'Mild L4-L5 disc-space reduction', 'No acute compression fracture'] }),
      document('DOC-SYN-0012-02', 'REFERRAL', 'Orthopaedic evaluation referral', 'Sector 62 Primary Clinic', 'EXTERNAL_REFERRAL_SIMULATION', 'SPC-REF-250914-0012', '2026-09-14', 'hi-IN', 'SECTOR 62 PRIMARY CLINIC\nReferral for acute low back pain with posterior thigh radiation after lifting. No weakness or sphincter symptoms reported.', { referralTo: 'Orthopedics', reason: 'Acute low back pain with radiation', redFlagsDenied: ['Weakness', 'Bladder/bowel dysfunction'] }),
    ],
  },
  {
    patientId: 'PAT-SYN-0013', externalId: 'ABHA-SYN-10013', encounterId: 'ENC-SYN-0013-OPD-20260915', kioskSessionId: 'KSK-SYN-0013',
    displayName: 'Farah Begum', phone: '9000004445', dateOfBirth: '1974-07-02', gender: 'Female', bloodGroup: 'O-', preferredLanguage: 'Urdu / Hindi',
    address: 'Hyderabad, Telangana', emergencyContactName: 'Sameer Begum (son)', emergencyContactPhone: '9000004405', department: 'General Medicine', tokenNumber: 'GEN-105', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'ur-IN',
    answers: [
      'ایک ہفتے سے دائیں اوپری پیٹ میں درد ہے، تیل والا کھانا کھانے کے بعد بڑھتا ہے اور متلی ہوتی ہے۔',
      'ایک ہفتے پہلے شروع ہوا، کل رات درد پہلے سے زیادہ تھا اور تقریباً دو گھنٹے رہا۔',
      'مجھے cholesterol زیادہ ہے۔ کوئی بڑی بیماری، admission یا surgery نہیں ہوئی۔',
      'Atorvastatin 20 mg رات کو لیتی ہوں۔ کسی دوا سے allergy نہیں، کھانے سے بھی نہیں۔',
      'والدہ کو gallstones تھے۔ میں گھر پر کام کرتی ہوں، tobacco نہیں، کھانا زیادہ تر گھر کا ہے۔',
      'ابھی بخار، آنکھوں میں پیلا پن یا بے ہوشی نہیں ہے۔',
    ],
    symptoms: ['Right upper abdominal pain', 'Post-prandial worsening after oily food', 'Nausea'], onset: ['Started 1 week ago', 'More severe episode last night lasting approximately 2 hours'],
    findings: ['Right upper quadrant tenderness reported', 'No jaundice or syncope reported'],
    vitals: [{ name: 'Blood Pressure', value: '132/80', unit: 'mmHg' }, { name: 'Heart Rate', value: '92', unit: 'bpm' }, { name: 'Temperature', value: '99.3', unit: '°F' }, { name: 'SpO2', value: '98', unit: '%' }],
    medications: ['Atorvastatin 20 mg once nightly'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['Hyperlipidemia', 'No previous admission or surgery'], family: ['Mother had gallstones'], lifestyle: ['Homemaker', 'No tobacco', 'Mostly home-cooked diet'] },
    triage: { priority: 'NORMAL', score: 58, possibleConditions: ['Biliary or upper abdominal pain'], reason: 'Post-prandial right upper quadrant pain needs same-day clinical assessment, but no fever, jaundice, syncope or shock signal is reported.', redFlags: [], possibleDiagnoses: [{ name: 'Symptomatic gallstone disease', certainty: 'probable', supportingEvidence: ['Right upper quadrant pain after oily food', 'Family history of gallstones and nausea'] }, { name: 'Acute cholecystitis', certainty: 'suspected', supportingEvidence: ['More severe recent episode and right upper quadrant tenderness; fever and imaging need assessment'] }, { name: 'Dyspepsia or peptic disease', certainty: 'suspected', supportingEvidence: ['Post-prandial upper abdominal discomfort and nausea'] }] },
    medicationRecords: [{ id: 'MED-SYN-0013-01', name: 'Atorvastatin', dose: '20', unit: 'mg', strength: '20 mg', route: 'oral', frequency: 'once nightly', scheduled: 'Night', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0013-01', 'IMAGING_REPORT', 'Ultrasound abdomen report', 'Hyderabad Diagnostic Imaging', 'EXTERNAL_RADIOLOGY_SIMULATION', 'HDI-USG-250914-0013', '2026-09-14', 'ur-IN', 'HYDERABAD DIAGNOSTIC IMAGING\nPatient: Farah Begum | ABHA ID (Synthetic): ABHA-SYN-10013\nUltrasound abdomen: Multiple gallbladder calculi, largest 9 mm. No pericholecystic fluid; common bile duct not dilated.\nImpression: Cholelithiasis without sonographic acute cholecystitis.', { study: 'Ultrasound abdomen', findings: ['Multiple gallbladder calculi, largest 9 mm', 'No pericholecystic fluid', 'CBD not dilated'], impression: 'Cholelithiasis without sonographic acute cholecystitis' }),
      document('DOC-SYN-0013-02', 'LAB_REPORT', 'Liver function tests', 'Deccan Pathology Services', 'EXTERNAL_LAB_SIMULATION', 'DPS-LFT-250914-0013', '2026-09-14', 'ur-IN', 'DECCAN PATHOLOGY SERVICES\nPatient: Farah Begum\nTotal bilirubin 0.8 mg/dL; AST 28 U/L; ALT 31 U/L; ALP 104 U/L.\nComment: Values within stated reference intervals.', { tests: [{ name: 'Total bilirubin', value: '0.8 mg/dL' }, { name: 'AST', value: '28 U/L' }, { name: 'ALT', value: '31 U/L' }, { name: 'ALP', value: '104 U/L' }], impression: 'Within stated reference intervals' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0014', externalId: 'ABHA-SYN-10014', encounterId: 'ENC-SYN-0014-OPD-20260915', kioskSessionId: 'KSK-SYN-0014',
    displayName: 'Devika Rao', phone: '9000005556', dateOfBirth: '2018-11-30', gender: 'Female', bloodGroup: 'A+', preferredLanguage: 'Telugu / English',
    address: 'Vijayawada, Andhra Pradesh', emergencyContactName: 'Srinivas Rao (father)', emergencyContactPhone: '9000005506', department: 'Pediatrics', tokenNumber: 'PED-402', visitType: 'NEW', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'te-IN',
    answers: [
      'రాత్రి నుంచి wheezing మరియు శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంది. ఆమె పూర్తి వాక్యాలు మాట్లాడలేకపోతోంది.',
      'నిన్న రాత్రి మొదలైంది, ఈ ఉదయం నుంచి త్వరగా ఎక్కువైంది. Salbutamol inhalerతో కొద్దిసేపే ఉపశమనం వచ్చింది.',
      'నాలుగు సంవత్సరాల నుంచి asthma ఉంది. గత సంవత్సరం ఒకసారి hospital admission జరిగింది; surgery లేదు.',
      'Salbutamol inhaler అవసరమైనప్పుడు వాడుతుంది. Dust exposureతో symptoms పెరుగుతాయి; penicillin allergy లేదు.',
      'తల్లికి asthma ఉంది. పిల్ల schoolకి వెళుతుంది; ఇంట్లో smoking లేదు.',
      'ఇప్పుడు ఛాతీ బిగుతుగా ఉంది మరియు మాట్లాడటానికి మధ్యలో శ్వాస తీసుకోవాలి.',
    ],
    symptoms: ['Acute wheeze', 'Shortness of breath', 'Chest tightness', 'Unable to speak full sentences'], onset: ['Started last night and worsened rapidly this morning', 'Only brief relief from salbutamol'],
    findings: ['Marked respiratory distress', 'Intercostal retractions', 'Diffuse wheeze', 'Low oxygen saturation'],
    vitals: [{ name: 'Heart Rate', value: '132', unit: 'bpm' }, { name: 'Respiratory Rate', value: '34', unit: 'breaths/min' }, { name: 'SpO2', value: '90', unit: '%' }, { name: 'Temperature', value: '98.8', unit: '°F' }],
    medications: ['Salbutamol inhaler as needed'], allergies: ['Dust trigger reported; no known drug allergy'],
    history: { medical: ['Asthma for 4 years', 'One asthma admission last year', 'No surgery'], family: ['Mother has asthma'], lifestyle: ['School-going child', 'No household tobacco smoke reported', 'Dust exposure worsens symptoms'] },
    triage: { priority: 'URGENT', score: 100, possibleConditions: ['Possible acute asthma exacerbation'], reason: 'Rapidly worsening wheeze with respiratory distress, inability to speak full sentences and SpO2 90% requires immediate emergency assessment.', redFlags: ['Chest or breathing red flag', 'Severe or rapidly worsening symptom'], possibleDiagnoses: [{ name: 'Acute severe asthma exacerbation', certainty: 'probable', supportingEvidence: ['Known asthma with rapidly worsening wheeze and chest tightness', 'Unable to speak full sentences; RR 34 and SpO2 90%'] }, { name: 'Viral-triggered bronchospasm', certainty: 'suspected', supportingEvidence: ['Acute onset of wheeze; infection history needs assessment'] }] },
    medicationRecords: [{ id: 'MED-SYN-0014-01', name: 'Salbutamol inhaler', dose: '2', unit: 'puffs', strength: '100 mcg per puff', route: 'inhaled', frequency: 'as needed', scheduled: 'PRN', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0014-01', 'DISCHARGE_SUMMARY', 'Prior paediatric asthma admission', 'Vijayawada Children Hospital', 'EXTERNAL_HOSPITAL_SIMULATION', 'VCH-DC-250402-0014', '2025-04-02', 'te-IN', 'VIJAYAWADA CHILDREN HOSPITAL\nChild: Devika Rao | ABHA ID (Synthetic): ABHA-SYN-10014\nAdmission: Asthma exacerbation treated in April 2025; improved after bronchodilator and steroid therapy.\nTrigger counselling: Dust avoidance. Follow-up with paediatric respiratory clinic.', { priorAdmission: 'April 2025', reason: 'Asthma exacerbation', outcome: 'Improved', triggerAdvice: 'Dust avoidance', followUp: 'Paediatric respiratory clinic' }),
      document('DOC-SYN-0014-02', 'PRESCRIPTION', 'Paediatric asthma prescription', 'Andhra Child Respiratory Clinic', 'EXTERNAL_PEDIATRIC_SIMULATION', 'ACRC-RX-250601-0014', '2025-06-01', 'te-IN', 'ANDHRA CHILD RESPIRATORY CLINIC\nChild: Devika Rao\nSalbutamol metered-dose inhaler with spacer for relief symptoms. Written asthma action plan supplied.\nDust exposure reduction discussed.', { medication: 'Salbutamol inhaler with spacer', actionPlan: 'Provided', trigger: 'Dust' }),
    ],
  },
  {
    patientId: 'PAT-SYN-0015', externalId: 'ABHA-SYN-10015', encounterId: 'ENC-SYN-0015-OPD-20260915', kioskSessionId: 'KSK-SYN-0015',
    displayName: 'Harpreet Singh', phone: '9000006667', dateOfBirth: '1981-02-15', gender: 'Male', bloodGroup: 'B-', preferredLanguage: 'Punjabi / English',
    address: 'Mohali, Punjab', emergencyContactName: 'Jasleen Singh (wife)', emergencyContactPhone: '9000006607', department: 'General Medicine', tokenNumber: 'GEN-106', visitType: 'FOLLOW_UP', encounterStatus: 'TOKEN_GENERATED', answerLanguage: 'pa-IN',
    answers: [
      'ਮੇਰਾ blood pressure ਪਿਛਲੇ ਮਹੀਨੇ ਘਰ ਵਿੱਚ 150s ਦੇ ਆਸ-ਪਾਸ ਆ ਰਿਹਾ ਹੈ, ਪਰ ਮੈਨੂੰ ਕੋਈ ਲੱਛਣ ਨਹੀਂ ਹਨ।',
      'ਇਹ readings ਲਗਭਗ ਚਾਰ ਹਫ਼ਤਿਆਂ ਤੋਂ ਹਨ; ਦਵਾਈ ਨਾ ਛੱਡਣ ਦੇ ਬਾਵਜੂਦ ਕਦੇ ਕਦੇ ਵੱਧ ਹੁੰਦੀਆਂ ਹਨ।',
      'ਤਿੰਨ ਸਾਲ ਤੋਂ hypertension ਹੈ। ਕੋਈ heart, kidney disease, admission ਜਾਂ surgery ਨਹੀਂ।',
      'Losartan 50 mg ਸਵੇਰੇ ਲੈਂਦਾ ਹਾਂ। ਕੋਈ ਦਵਾਈ ਜਾਂ food allergy ਨਹੀਂ।',
      'ਪਿਤਾ ਨੂੰ stroke ਹੋਇਆ ਸੀ। ਮੈਂ shop owner ਹਾਂ, smoking ਨਹੀਂ, ਨਮਕ ਘੱਟ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰਦਾ ਹਾਂ ਪਰ exercise ਘੱਟ ਹੈ।',
      'ਛਾਤੀ ਦਰਦ, ਸਾਹ ਚੜ੍ਹਨਾ, ਤੇਜ਼ ਸਿਰ ਦਰਦ ਜਾਂ ਕਮਜ਼ੋਰੀ ਨਹੀਂ ਹੈ।',
    ],
    symptoms: ['Persistently elevated home blood pressure readings', 'No acute symptoms'], onset: ['Elevated readings for approximately 4 weeks'],
    findings: ['Asymptomatic hypertension follow-up', 'Home readings in 150s reported'],
    vitals: [{ name: 'Blood Pressure', value: '152/94', unit: 'mmHg' }, { name: 'Heart Rate', value: '78', unit: 'bpm' }, { name: 'SpO2', value: '99', unit: '%' }],
    medications: ['Losartan 50 mg once daily'], allergies: ['No known drug or food allergies reported'],
    history: { medical: ['Hypertension for 3 years', 'No heart or kidney disease', 'No prior admission or surgery'], family: ['Father had stroke'], lifestyle: ['Shop owner', 'No tobacco', 'Low exercise', 'Trying to reduce salt'] },
    triage: { priority: 'FOLLOW_UP', score: 27, possibleConditions: ['Uncontrolled essential hypertension'], reason: 'Repeated elevated home readings require medication and lifestyle review, but no acute neurological, cardiac or respiratory symptoms are reported.', redFlags: [], possibleDiagnoses: [{ name: 'Essential hypertension, suboptimally controlled', certainty: 'probable', supportingEvidence: ['Home readings in 150s for four weeks', 'Clinic BP 152/94 on losartan'] }, { name: 'White-coat or measurement-related elevation', certainty: 'suspected', supportingEvidence: ['Home technique and repeated validated readings need confirmation'] }] },
    medicationRecords: [{ id: 'MED-SYN-0015-01', name: 'Losartan', dose: '50', unit: 'mg', strength: '50 mg', route: 'oral', frequency: 'once daily', scheduled: 'Morning', source: 'HOME' }],
    allergiesRecords: [],
    documents: [
      document('DOC-SYN-0015-01', 'LAB_REPORT', 'Hypertension monitoring profile', 'Punjab Preventive Health Lab', 'EXTERNAL_LAB_SIMULATION', 'PPHL-RISK-250901-0015', '2026-09-01', 'pa-IN', 'PUNJAB PREVENTIVE HEALTH LAB\nPatient: Harpreet Singh | ABHA ID (Synthetic): ABHA-SYN-10015\nCreatinine 0.9 mg/dL; potassium 4.3 mmol/L; fasting glucose 102 mg/dL; LDL 116 mg/dL.\nComment: Review cardiovascular risk and home blood-pressure log with clinician.', { creatinine: '0.9 mg/dL', potassium: '4.3 mmol/L', fastingGlucose: '102 mg/dL', ldl: '116 mg/dL', comment: 'Review cardiovascular risk and BP log' }),
      document('DOC-SYN-0015-02', 'REFERRAL', 'Home blood-pressure monitoring referral', 'Mohali Primary Care Centre', 'EXTERNAL_REFERRAL_SIMULATION', 'MPCC-REF-250902-0015', '2026-09-02', 'pa-IN', 'MOHALI PRIMARY CARE CENTRE\nReferral for validated home blood-pressure log review and lifestyle counselling.\nNo emergency symptoms reported at referring visit.', { referralTo: 'General Medicine', reason: 'Repeated elevated home BP', requestedData: '7-day validated home BP log', emergencySymptoms: 'None reported' }),
    ],
  },
];

const questionPrompts = [
  'What is the main problem that brings you to the hospital today?',
  'How long has it been going on?',
  'Do you have any known medical conditions, previous major illnesses, hospitalizations, or surgeries?',
  'What medicines are you taking or have recently taken, and do you have any medicine or food allergies or reactions?',
  'Is there any relevant family medical history or lifestyle information, such as smoking, tobacco, alcohol, occupation, diet, or activity, that your doctor should know?',
  'Is there any other important medical information you want your doctor to know?',
] as const;

function transcriptFor(item: SyntheticCase): string {
  const lines = ['[ASSISTANT] Hello. I am MediKiosk. I will ask six focused questions so the doctor can understand your visit.'];
  item.answers.forEach((answer, index) => {
    lines.push(`[ASSISTANT] Question ${index + 1} of 6: ${questionPrompts[index]}`);
    lines.push(`[PATIENT] ${answer}`);
  });
  lines.push('[ASSISTANT] Thank you. I have captured your answers for the doctor. Please review the details shown on screen.');
  lines.push('[PATIENT] Yes, the details are correct.');
  lines.push('[ASSISTANT] Thank you. Your report has been sent to the doctor.');
  return lines.join('\n');
}

function reportFor(item: SyntheticCase, transcript: string): Record<string, unknown> {
  const source = (quote: string, values: string[], language: string, provenance = 'PATIENT_REPORTED', patientConfirmed = true) => values.map((value) => ({ value, sourceQuote: quote, source: provenance, language, confidence: provenance === 'PATIENT_REPORTED' ? 0.98 : 1, patientConfirmed }));
  return {
    patientId: item.patientId,
    encounterId: item.encounterId,
    generatedAt: REFERENCE_DATE.toISOString(),
    symptoms: item.symptoms,
    problemStarted: item.onset,
    findings: item.findings,
    vitals: item.vitals,
    medications: item.medications,
    allergies: item.allergies,
    history: item.history,
    transcript,
    patientVerificationStatus: 'VERIFIED',
    syntheticFixture: { cohortId: SYNTHETIC_COHORT_ID, generatedFrom: 'clinician-authored synthetic case', externalIdentity: item.externalId },
    extractionEvidence: {
      symptoms: source(item.answers[0], item.symptoms, item.answerLanguage),
      problemStarted: source(item.answers[1], item.onset, item.answerLanguage),
      findings: source('Clinician-entered synthetic triage observations.', item.findings, 'en-IN', 'CLINICIAN_CONFIRMED', false),
      vitals: source('Clinician-entered synthetic registration-desk vitals.', item.vitals.map((vital) => `${vital.name}: ${vital.value} ${vital.unit}`), 'en-IN', 'CLINICIAN_CONFIRMED', false),
      medications: source(item.answers[3], item.medications, item.answerLanguage),
      allergies: source(item.answers[3], item.allergies, item.answerLanguage),
      history: source(item.answers[2], item.history.medical, item.answerLanguage).concat(source(item.answers[4], [...item.history.family, ...item.history.lifestyle], item.answerLanguage)),
    },
    clinicianTriage: item.triage,
  };
}

function stateFor(item: SyntheticCase): Record<string, unknown> {
  return {
    symptoms: item.symptoms,
    problemStarted: item.onset,
    findings: item.findings,
    vitals: item.vitals,
    medications: item.medications,
    allergies: item.allergies,
    medicalHistory: item.history.medical,
    familyHistory: item.history.family,
    lifestyle: item.history.lifestyle,
    language: item.answerLanguage,
  };
}

export async function seedSyntheticCohort(prisma: PrismaClient): Promise<{ patients: number; encounters: number; documents: number }> {
  let documentCount = 0;
  for (const item of cases) {
    const startedAt = new Date(REFERENCE_DATE.getTime() - 30 * 60 * 1000 - cases.indexOf(item) * 60 * 1000);
    const transcript = transcriptFor(item);
    const report = reportFor(item, transcript);

    await prisma.patient.upsert({
      where: { id: item.patientId },
      update: { externalId: item.externalId, displayName: item.displayName, phone: item.phone, dateOfBirth: dateAt(item.dateOfBirth), gender: item.gender, bloodGroup: item.bloodGroup, preferredLanguage: item.preferredLanguage, address: item.address, emergencyContactName: item.emergencyContactName, emergencyContactPhone: item.emergencyContactPhone, isSynthetic: true },
      create: { id: item.patientId, externalId: item.externalId, displayName: item.displayName, phone: item.phone, dateOfBirth: dateAt(item.dateOfBirth), gender: item.gender, bloodGroup: item.bloodGroup, preferredLanguage: item.preferredLanguage, address: item.address, emergencyContactName: item.emergencyContactName, emergencyContactPhone: item.emergencyContactPhone, isSynthetic: true, createdAt: daysAgo(365) },
    });

    await prisma.encounter.upsert({
      where: { id: item.encounterId },
      update: { patientId: item.patientId, type: 'OPD', status: item.encounterStatus, startedAt },
      create: { id: item.encounterId, patientId: item.patientId, type: 'OPD', status: item.encounterStatus, startedAt, createdAt: startedAt },
    });

    await prisma.kioskSession.upsert({
      where: { id: item.kioskSessionId },
      update: { patientId: item.patientId, encounterId: item.encounterId, status: 'COMPLETED', currentStage: 'COMPLETED', questionIndex: 6, followUpCount: 0, clinicalState: json(stateFor(item)), safetySignals: json(item.triage.redFlags), patientVerified: true, startedAt, completedAt: new Date(startedAt.getTime() + 12 * 60 * 1000) },
      create: { id: item.kioskSessionId, patientId: item.patientId, encounterId: item.encounterId, status: 'COMPLETED', currentStage: 'COMPLETED', questionIndex: 6, followUpCount: 0, clinicalState: json(stateFor(item)), safetySignals: json(item.triage.redFlags), patientVerified: true, startedAt, completedAt: new Date(startedAt.getTime() + 12 * 60 * 1000), createdAt: startedAt },
    });

    const transcriptLines = transcript.split('\n');
    for (const [index, line] of transcriptLines.entries()) {
      const speaker = line.startsWith('[PATIENT]') ? 'PATIENT' : 'ASSISTANT';
      const text = line.replace(/^\[[^\]]+\]\s*/, '');
      await prisma.transcriptEntry.upsert({
        where: { id: `TRN-SYN-${item.patientId.slice(-4)}-${String(index + 1).padStart(2, '0')}` },
        update: { kioskSessionId: item.kioskSessionId, speaker, text, occurredAt: new Date(startedAt.getTime() + index * 20 * 1000) },
        create: { id: `TRN-SYN-${item.patientId.slice(-4)}-${String(index + 1).padStart(2, '0')}`, kioskSessionId: item.kioskSessionId, speaker, text, occurredAt: new Date(startedAt.getTime() + index * 20 * 1000) },
      });
    }

    const transcriptId = (answerNumber: number) => `TRN-SYN-${item.patientId.slice(-4)}-${String(answerNumber * 2 + 1).padStart(2, '0')}`;
    const factEntries: Array<{ key: string; value: unknown; provenance: 'PATIENT_REPORTED' | 'CLINICIAN_CONFIRMED'; sourceLanguage: string; sourceTranscriptId?: string }> = [
      { key: 'symptoms', value: item.symptoms, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(1) },
      { key: 'problem_started', value: item.onset, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(2) },
      { key: 'findings', value: item.findings, provenance: 'CLINICIAN_CONFIRMED', sourceLanguage: 'en-IN' },
      { key: 'vitals', value: item.vitals, provenance: 'CLINICIAN_CONFIRMED', sourceLanguage: 'en-IN' },
      { key: 'medications', value: item.medications, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(4) },
      { key: 'allergies', value: item.allergies, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(4) },
      { key: 'medical_history', value: item.history.medical, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(3) },
      { key: 'family_history', value: item.history.family, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(5) },
      { key: 'lifestyle', value: item.history.lifestyle, provenance: 'PATIENT_REPORTED', sourceLanguage: item.answerLanguage, sourceTranscriptId: transcriptId(5) },
    ];
    for (const [index, fact] of factEntries.entries()) {
      await prisma.clinicalFact.upsert({
        where: { id: `FACT-SYN-${item.patientId.slice(-4)}-${String(index + 1).padStart(2, '0')}` },
        update: { kioskSessionId: item.kioskSessionId, key: fact.key, value: json(fact.value), provenance: fact.provenance, transcriptEntryId: fact.sourceTranscriptId, sourceLanguage: fact.sourceLanguage, extractionConfidence: fact.provenance === 'PATIENT_REPORTED' ? 0.98 : 1, reviewStatus: 'ACCEPTED', reviewedAt: REFERENCE_DATE, reviewedBy: 'synthetic-clinical-review', clinicianConfirmedAt: REFERENCE_DATE, clinicianConfirmedBy: 'synthetic-clinical-review' },
        create: { id: `FACT-SYN-${item.patientId.slice(-4)}-${String(index + 1).padStart(2, '0')}`, kioskSessionId: item.kioskSessionId, key: fact.key, value: json(fact.value), provenance: fact.provenance, transcriptEntryId: fact.sourceTranscriptId, sourceLanguage: fact.sourceLanguage, extractionConfidence: fact.provenance === 'PATIENT_REPORTED' ? 0.98 : 1, reviewStatus: 'ACCEPTED', reviewedAt: REFERENCE_DATE, reviewedBy: 'synthetic-clinical-review', clinicianConfirmedAt: REFERENCE_DATE, clinicianConfirmedBy: 'synthetic-clinical-review' },
      });
    }

    await prisma.intakeReport.upsert({
      where: { kioskSessionId: item.kioskSessionId },
      update: { patientId: item.patientId, encounterId: item.encounterId, report: json(report), status: 'CLINICIAN_CONFIRMED', patientVerifiedAt: REFERENCE_DATE, clinicianConfirmedAt: REFERENCE_DATE, clinicianConfirmedBy: 'synthetic-clinical-review' },
      create: { patientId: item.patientId, encounterId: item.encounterId, kioskSessionId: item.kioskSessionId, report: json(report), status: 'CLINICIAN_CONFIRMED', patientVerifiedAt: REFERENCE_DATE, clinicianConfirmedAt: REFERENCE_DATE, clinicianConfirmedBy: 'synthetic-clinical-review', createdAt: startedAt },
    });

    for (const medication of item.medicationRecords) {
      await prisma.medication.upsert({
        where: { id: medication.id },
        update: { patientId: item.patientId, encounterId: item.encounterId, name: medication.name, dose: medication.dose, unit: medication.unit, strength: medication.strength, route: medication.route, frequency: medication.frequency, scheduled: medication.scheduled, source: medication.source, status: 'REVIEW', risk: 'MODERATE', verificationStatus: 'VERIFIED' },
        create: { id: medication.id, patientId: item.patientId, encounterId: item.encounterId, name: medication.name, dose: medication.dose, unit: medication.unit, strength: medication.strength, route: medication.route, frequency: medication.frequency, scheduled: medication.scheduled, source: medication.source, status: 'REVIEW', risk: 'MODERATE', verificationStatus: 'VERIFIED', createdAt: startedAt },
      });
    }

    for (const allergy of item.allergiesRecords) {
      await prisma.allergy.upsert({
        where: { id: allergy.id },
        update: { patientId: item.patientId, substance: allergy.substance, normalizedSubstance: allergy.normalizedSubstance, reaction: allergy.reaction, severity: allergy.severity, status: 'ACTIVE', verifiedAt: REFERENCE_DATE },
        create: { id: allergy.id, patientId: item.patientId, substance: allergy.substance, normalizedSubstance: allergy.normalizedSubstance, reaction: allergy.reaction, severity: allergy.severity, status: 'ACTIVE', verifiedAt: REFERENCE_DATE, createdAt: startedAt },
      });
    }

    for (const sourceDocument of item.documents) {
      await prisma.clinicalDocument.upsert({
        where: { id: sourceDocument.id },
        update: { patientId: item.patientId, encounterId: item.encounterId, documentType: sourceDocument.documentType, title: sourceDocument.title, sourceOrganization: sourceDocument.sourceOrganization, sourceSystem: sourceDocument.sourceSystem, documentNumber: sourceDocument.documentNumber, documentDate: dateAt(sourceDocument.documentDate), language: sourceDocument.language, mimeType: 'text/plain', status: 'CLINICIAN_VERIFIED', documentText: sourceDocument.documentText, extractedData: json(sourceDocument.extractedData), provenance: json({ cohortId: SYNTHETIC_COHORT_ID, synthetic: true, retrievalMode: 'simulated-consented-external-record', sourceDocumentId: sourceDocument.documentNumber, receivedBy: 'Sanctuary+ local integration fixture', originalPreserved: true, extractionStatus: 'clinician-verified fixture' }) },
        create: { id: sourceDocument.id, patientId: item.patientId, encounterId: item.encounterId, documentType: sourceDocument.documentType, title: sourceDocument.title, sourceOrganization: sourceDocument.sourceOrganization, sourceSystem: sourceDocument.sourceSystem, documentNumber: sourceDocument.documentNumber, documentDate: dateAt(sourceDocument.documentDate), receivedAt: REFERENCE_DATE, language: sourceDocument.language, mimeType: 'text/plain', status: 'CLINICIAN_VERIFIED', documentText: sourceDocument.documentText, extractedData: json(sourceDocument.extractedData), provenance: json({ cohortId: SYNTHETIC_COHORT_ID, synthetic: true, retrievalMode: 'simulated-consented-external-record', sourceDocumentId: sourceDocument.documentNumber, receivedBy: 'Sanctuary+ local integration fixture', originalPreserved: true, extractionStatus: 'clinician-verified fixture' }), createdAt: dateAt(sourceDocument.documentDate) },
      });
      documentCount += 1;
    }
  }
  return { patients: cases.length, encounters: cases.length, documents: documentCount };
}

@Injectable()
export class SyntheticCohortService implements OnModuleInit {
  private readonly logger = new Logger(SyntheticCohortService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const result = await seedSyntheticCohort(this.prisma);
    this.logger.log(`Loaded ${result.patients} synthetic patients, ${result.encounters} encounters and ${result.documents} source documents (${SYNTHETIC_COHORT_ID})`);
  }
}
