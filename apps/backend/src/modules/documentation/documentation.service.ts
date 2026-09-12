import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type {
  ClinicalEncounter,
  CreateEncounterDto,
  UpdateEncounterDto,
  TranscribeAudioDto,
  TranscriptionResponseDto,
  ClinicalExtraction,
  SoapNote,
  PrescriptionItem,
  ClinicalImpression,
  FhirBundle,
  PatientJourneyIntegrationSummary,
} from './documentation.types';
import { TranscriptionProvider } from './transcription.provider';
import { ExtractionProvider } from './extraction.provider';
import { SoapProvider } from './soap.provider';
import { PrescriptionProvider } from './prescription.provider';
import { DiagnosisProvider } from './diagnosis.provider';
import { FhirSerializer } from './fhir.serializer';

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

  // In-memory clinical encounters repository
  private encounters: Map<string, ClinicalEncounter> = new Map();

  constructor(
    private readonly transcriptionProvider: TranscriptionProvider,
    private readonly extractionProvider: ExtractionProvider,
    private readonly soapProvider: SoapProvider,
    private readonly prescriptionProvider: PrescriptionProvider,
    private readonly diagnosisProvider: DiagnosisProvider,
  ) {
    this.seedInitialEncounters();
  }

  private seedInitialEncounters(): void {
    const initialList: ClinicalEncounter[] = [
      {
        id: 'enc-101',
        patientId: '1',
        clinicianId: 'doc-smith',
        dateTime: new Date(Date.now() - 7200000).toISOString(),
        type: 'inpatient',
        status: 'finalized',
        finalizedAt: new Date(Date.now() - 3200000).toISOString(),
        finalizedBy: 'doc-smith',
        rawTranscript: `[Doctor]: Good morning, Mr. Doe. Can you tell me what brought you in today?
[Patient]: I was walking up the stairs and suddenly had this intense crushing chest pressure going into my left arm.
[Doctor]: Did you have any shortness of breath or cold sweats?
[Patient]: Yes, lots of sweating and difficulty breathing.
[Doctor]: Any drug allergies?
[Patient]: Allergic to Penicillin, gives me hives.`,
        audioDurationSeconds: 45,
        transcriptConfidence: 0.96,
        transcriptReviewed: true,
        reviewedAt: new Date(Date.now() - 3600000).toISOString(),
        reviewedByClinicianId: 'doc-smith',
        extraction: {
          symptoms: [
            'Intense crushing chest pressure',
            'Pain radiating to left arm',
            'Shortness of breath',
            'Cold sweats',
          ],
          clinicalFindings: ['Diaphoresis', 'Respiratory distress'],
          vitals: [
            { name: 'Blood Pressure', value: '164/98', unit: 'mmHg' },
            { name: 'Heart Rate', value: '102', unit: 'bpm' },
            { name: 'SpO2', value: '94', unit: '%' },
          ],
          currentMedications: ['Lisinopril 20mg daily', 'Atorvastatin 40mg'],
          allergies: ['Penicillin (hives)'],
          history: ['Hypertension for 5 years'],
          extractedAt: new Date(Date.now() - 3500000).toISOString(),
        },
        soapNote: {
          subjective:
            'Patient is a 58-year-old male who presents with sudden onset crushing substernal chest pressure while walking up stairs, radiating to the left arm. Associated with diaphoresis and acute shortness of breath. Reports allergy to Penicillin (hives).',
          objective:
            'Alert, visibly diaphoretic and in moderate distress. Vitals: BP 164/98 mmHg, HR 102 bpm, SpO2 94% on room air. Cardiopulmonary exam notable for tachypnea without focal rales.',
          assessment:
            'Acute coronary syndrome presentation vs acute myocardial ischemia with exertional onset and autonomic symptoms in a patient with hypertension.',
          plan:
            'Immediate 12-lead ECG and stat cardiac troponin markers. Administer chewed aspirin 324mg and establish IV access. Continuous cardiac telemetry monitoring. Cardiology consult requested.',
          generatedAt: new Date(Date.now() - 3400000).toISOString(),
          reviewedAt: new Date(Date.now() - 3300000).toISOString(),
          isReviewed: true,
        },
        prescriptions: [
          {
            id: 'rx-101-1',
            medication: 'Aspirin (Chewable)',
            dosage: '324mg',
            route: 'oral',
            frequency: 'Stat (once)',
            duration: 'Immediate',
            instructions: 'Chew immediately for acute chest discomfort',
            status: 'approved',
          },
          {
            id: 'rx-101-2',
            medication: 'Nitroglycerin Sublingual',
            dosage: '0.4mg',
            route: 'sublingual',
            frequency: 'every 5 minutes PRN',
            duration: 'Up to 3 doses',
            instructions: 'Dissolve under tongue for active chest pressure. Call EMS if unresolved.',
            status: 'approved',
          },
          {
            id: 'rx-101-3',
            medication: 'Atorvastatin',
            dosage: '80mg',
            route: 'oral',
            frequency: 'once daily',
            duration: '30 days',
            instructions: 'Take in the evening at bedtime',
            status: 'approved',
          },
          {
            id: 'rx-101-4',
            medication: 'Metoprolol Tartrate',
            dosage: '25mg',
            route: 'oral',
            frequency: 'twice daily',
            duration: '30 days',
            instructions: 'Take with or immediately after meals',
            status: 'suggested',
          },
        ],
        clinicalImpression: {
          summary:
            'Acute coronary syndrome presentation with exertional substernal crushing chest pressure radiating to the left arm and autonomic symptoms in a hypertensive patient.',
          diagnoses: [
            {
              id: 'diag-101-1',
              name: 'Acute Coronary Syndrome (Suspected)',
              code: 'I21.9',
              type: 'primary',
              certainty: 'probable',
              supportingEvidence: [
                'Crushing substernal chest pressure radiating to left arm',
                'Diaphoresis during exertional stair climbing',
                'Dyspnea on exertion',
              ],
              status: 'suggested',
            },
            {
              id: 'diag-101-2',
              name: 'Gastroesophageal Reflux Disease (GERD)',
              code: 'K21.9',
              type: 'differential',
              certainty: 'suspected',
              supportingEvidence: ['Retrosternal discomfort'],
              status: 'suggested',
            },
            {
              id: 'diag-101-3',
              name: 'Musculoskeletal Chest Wall Strain',
              code: 'R07.89',
              type: 'differential',
              certainty: 'suspected',
              supportingEvidence: ['Onset during exertion on stairs'],
              status: 'suggested',
            },
          ],
          generatedAt: new Date(Date.now() - 3400000).toISOString(),
          reviewedAt: new Date(Date.now() - 3300000).toISOString(),
          isReviewed: true,
        },
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'enc-102',
        patientId: '2',
        clinicianId: 'doc-smith',
        dateTime: new Date(Date.now() - 86400000).toISOString(),
        type: 'outpatient',
        status: 'reviewed',
        rawTranscript: `[Doctor]: Hello Jane, how has your blood pressure been this past month?
[Patient]: It has been stable around 125 over 80. No dizziness or headaches.
[Doctor]: Excellent. Are you continuing your Lisinopril 20mg daily?
[Patient]: Yes, every morning with breakfast.`,
        audioDurationSeconds: 30,
        transcriptConfidence: 0.98,
        transcriptReviewed: true,
        reviewedAt: new Date(Date.now() - 82800000).toISOString(),
        reviewedByClinicianId: 'doc-smith',
        extraction: {
          symptoms: ['No dizziness', 'No headaches'],
          clinicalFindings: ['Stable clinical course'],
          vitals: [
            { name: 'Blood Pressure', value: '125/80', unit: 'mmHg' },
          ],
          currentMedications: ['Lisinopril 20mg daily'],
          allergies: [],
          history: ['Essential hypertension'],
          extractedAt: new Date(Date.now() - 82700000).toISOString(),
        },
        soapNote: {
          subjective:
            'Patient is a 45-year-old female presenting for routine outpatient follow-up of essential hypertension. Reports feeling well with no headaches, visual disturbances, chest discomfort, or dizziness.',
          objective:
            'Well-appearing, resting comfortably. Vitals: BP 125/80 mmHg, HR 72 bpm regular. Physical examination unremarkable.',
          assessment:
            'Essential hypertension, well-controlled on current medical therapy without end-organ symptoms.',
          plan:
            'Continue Lisinopril 20mg orally once daily with morning meal. Encourage low-sodium diet and regular aerobic exercise. Routine metabolic panel in 6 months. Follow-up clinic visit in 6 months.',
          generatedAt: new Date(Date.now() - 82600000).toISOString(),
          reviewedAt: new Date(Date.now() - 82500000).toISOString(),
          isReviewed: true,
        },
        prescriptions: [
          {
            id: 'rx-102-1',
            medication: 'Lisinopril',
            dosage: '20mg',
            route: 'oral',
            frequency: 'once daily',
            duration: '90 days',
            instructions: 'Take in the morning with breakfast',
            status: 'approved',
          },
          {
            id: 'rx-102-2',
            medication: 'Hydrochlorothiazide',
            dosage: '12.5mg',
            route: 'oral',
            frequency: 'once daily',
            duration: '30 days',
            instructions: 'Take in the morning to prevent nocturnal diuresis',
            status: 'suggested',
          },
        ],
        clinicalImpression: {
          summary:
            'Essential hypertension, well-controlled on current medical therapy without target organ damage or acute symptoms.',
          diagnoses: [
            {
              id: 'diag-102-1',
              name: 'Essential (Primary) Hypertension',
              code: 'I10',
              type: 'primary',
              certainty: 'confirmed',
              supportingEvidence: [
                'Documented history of essential hypertension',
                'Stable clinic blood pressure on Lisinopril (125/80 mmHg)',
                'Absence of secondary hypertension symptoms',
              ],
              status: 'confirmed',
            },
            {
              id: 'diag-102-2',
              name: 'Secondary Hypertension (Renal Artery Stenosis rule-out)',
              code: 'I15.0',
              type: 'differential',
              certainty: 'suspected',
              supportingEvidence: ['Differential screening consideration in chronic hypertension'],
              status: 'ruled-out',
            },
          ],
          generatedAt: new Date(Date.now() - 82600000).toISOString(),
          reviewedAt: new Date(Date.now() - 82500000).toISOString(),
          isReviewed: true,
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 82800000).toISOString(),
      },
      {
        id: 'enc-103',
        patientId: '3',
        clinicianId: 'doc-smith',
        dateTime: new Date().toISOString(),
        type: 'emergency',
        status: 'draft',
        rawTranscript: '',
        audioDurationSeconds: 0,
        transcriptConfidence: 0,
        transcriptReviewed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const enc of initialList) {
      if (enc.status !== 'draft') {
        enc.fhirBundle = FhirSerializer.serializeToFhirBundle(enc);
      }
      this.encounters.set(enc.id, enc);
    }
    this.logger.log(`Initialized DocumentationService with ${initialList.length} encounters`);
  }

  async getEncounters(patientId?: string): Promise<ClinicalEncounter[]> {
    const list = Array.from(this.encounters.values());
    if (patientId) {
      return list.filter((e) => e.patientId === patientId);
    }
    return list.sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );
  }

  async getEncounterById(id: string): Promise<ClinicalEncounter> {
    const encounter = this.encounters.get(id);
    if (!encounter) {
      throw new NotFoundException(`Clinical encounter with ID "${id}" not found`);
    }
    return encounter;
  }

  async createEncounter(dto: CreateEncounterDto): Promise<ClinicalEncounter> {
    if (!dto.patientId) {
      throw new BadRequestException('patientId is required to create an encounter');
    }

    const id = `enc-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const encounter: ClinicalEncounter = {
      id,
      patientId: dto.patientId,
      clinicianId: dto.clinicianId || 'doc-smith',
      dateTime: now,
      type: dto.type || 'inpatient',
      status: 'draft',
      rawTranscript: dto.rawTranscript || '',
      audioDurationSeconds: dto.audioDurationSeconds || 0,
      transcriptConfidence: dto.transcriptConfidence || 0,
      transcriptReviewed: false,
      extraction: dto.extraction,
      soapNote: dto.soapNote,
      prescriptions: dto.prescriptions,
      clinicalImpression: dto.clinicalImpression,
      fhirBundle: dto.fhirBundle,
      finalizedAt: dto.finalizedAt,
      finalizedBy: dto.finalizedBy,
      createdAt: now,
      updatedAt: now,
    };

    this.encounters.set(id, encounter);
    this.logger.log(`Created encounter ${id} for patient ${dto.patientId}`);
    return encounter;
  }

  async updateEncounter(
    id: string,
    dto: UpdateEncounterDto,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    const updated: ClinicalEncounter = {
      ...encounter,
      clinicianId: dto.clinicianId || encounter.clinicianId,
      type: dto.type || encounter.type,
      status: dto.status || encounter.status,
      rawTranscript:
        dto.rawTranscript !== undefined ? dto.rawTranscript : encounter.rawTranscript,
      audioDurationSeconds:
        dto.audioDurationSeconds !== undefined
          ? dto.audioDurationSeconds
          : encounter.audioDurationSeconds,
      transcriptConfidence:
        dto.transcriptConfidence !== undefined
          ? dto.transcriptConfidence
          : encounter.transcriptConfidence,
      transcriptReviewed:
        dto.transcriptReviewed !== undefined
          ? dto.transcriptReviewed
          : encounter.transcriptReviewed,
      extraction: dto.extraction !== undefined ? dto.extraction : encounter.extraction,
      soapNote: dto.soapNote !== undefined ? dto.soapNote : encounter.soapNote,
      prescriptions:
        dto.prescriptions !== undefined ? dto.prescriptions : encounter.prescriptions,
      clinicalImpression:
        dto.clinicalImpression !== undefined
          ? dto.clinicalImpression
          : encounter.clinicalImpression,
      fhirBundle:
        dto.fhirBundle !== undefined ? dto.fhirBundle : encounter.fhirBundle,
      finalizedAt:
        dto.finalizedAt !== undefined ? dto.finalizedAt : encounter.finalizedAt,
      finalizedBy:
        dto.finalizedBy !== undefined ? dto.finalizedBy : encounter.finalizedBy,
      updatedAt: now,
    };

    this.encounters.set(id, updated);
    return updated;
  }

  async deleteEncounter(id: string): Promise<void> {
    if (!this.encounters.has(id)) {
      throw new NotFoundException(`Clinical encounter with ID "${id}" not found`);
    }
    this.encounters.delete(id);
    this.logger.log(`Deleted encounter ${id}`);
  }

  async transcribeAudio(
    id: string,
    dto: TranscribeAudioDto,
  ): Promise<TranscriptionResponseDto> {
    const encounter = await this.getEncounterById(id);

    this.logger.log(`Running real AI audio transcription for encounter ${id}`);
    const result = await this.transcriptionProvider.transcribe({
      audioBase64: dto.audioBase64,
      filename: dto.filename,
      mimeType: dto.mimeType,
      durationSeconds: dto.durationSeconds,
      encounterType: encounter.type,
      patientId: encounter.patientId,
    });

    const now = new Date().toISOString();
    encounter.rawTranscript = result.transcript;
    encounter.audioDurationSeconds = result.durationSeconds;
    encounter.transcriptConfidence = result.confidence;
    encounter.transcriptReviewed = false;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with transcript (${result.transcript.length} chars, duration: ${result.durationSeconds}s)`,
    );

    return {
      encounterId: id,
      transcript: result.transcript,
      language: result.language,
      durationSeconds: result.durationSeconds,
      confidence: result.confidence,
      segments: result.segments,
    };
  }

  async updateTranscript(
    id: string,
    transcript: string,
    clinicianId?: string,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.rawTranscript = transcript;
    encounter.transcriptReviewed = true;
    encounter.reviewedAt = now;
    encounter.reviewedByClinicianId = clinicianId || encounter.clinicianId || 'doc-smith';
    encounter.status = 'reviewed';
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Updated and reviewed transcript for encounter ${id}`);
    return encounter;
  }

  async extractClinicalInformation(id: string): Promise<ClinicalExtraction> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for extraction. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Extracting clinical information for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const extraction = await this.extractionProvider.extractClinicalInformation(
      encounter.rawTranscript,
    );

    const now = new Date().toISOString();
    encounter.extraction = extraction;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with extraction: ${extraction.symptoms.length} symptoms, ${extraction.clinicalFindings.length} findings, ${extraction.vitals.length} vitals`,
    );

    return extraction;
  }

  async updateExtraction(
    id: string,
    extraction: ClinicalExtraction,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.extraction = {
      ...extraction,
      extractedAt: extraction.extractedAt || now,
    };
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Updated clinical extraction for encounter ${id}`);
    return encounter;
  }

  async generateSoapNote(id: string): Promise<SoapNote> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for SOAP note generation. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Synthesizing SOAP note for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const soapNote = await this.soapProvider.generateSoapNote(
      encounter.rawTranscript,
      encounter.extraction,
    );

    const now = new Date().toISOString();
    encounter.soapNote = soapNote;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Encounter ${id} updated with generated SOAP note`);

    return soapNote;
  }

  async updateSoapNote(
    id: string,
    soapNote: SoapNote,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.soapNote = {
      ...soapNote,
      reviewedAt: now,
      isReviewed: true,
    };
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Updated and reviewed SOAP note for encounter ${id}`);
    return encounter;
  }

  async suggestPrescriptions(id: string): Promise<PrescriptionItem[]> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for prescription suggestions. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Suggesting prescriptions for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const suggestions = await this.prescriptionProvider.suggestPrescriptions(
      encounter.rawTranscript,
      encounter.extraction,
      encounter.soapNote,
    );

    const now = new Date().toISOString();
    encounter.prescriptions = suggestions;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with ${suggestions.length} suggested prescriptions`,
    );

    return suggestions;
  }

  async updatePrescriptions(
    id: string,
    prescriptions: PrescriptionItem[],
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.prescriptions = prescriptions;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Updated prescriptions for encounter ${id} (${prescriptions.length} items)`,
    );
    return encounter;
  }

  async suggestDiagnoses(id: string): Promise<ClinicalImpression> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for diagnosis synthesis. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Suggesting diagnoses and clinical impression for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const impression = await this.diagnosisProvider.suggestDiagnoses(
      encounter.rawTranscript,
      encounter.extraction,
      encounter.soapNote,
    );

    const now = new Date().toISOString();
    encounter.clinicalImpression = impression;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with synthesized clinical impression (${impression.diagnoses.length} diagnoses)`,
    );

    return impression;
  }

  async updateDiagnoses(
    id: string,
    clinicalImpression: ClinicalImpression,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.clinicalImpression = {
      ...clinicalImpression,
      reviewedAt: now,
      isReviewed: true,
    };
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Updated and reviewed clinical impression for encounter ${id} (${clinicalImpression.diagnoses.length} diagnoses)`,
    );
    return encounter;
  }

  async generateFhirBundle(id: string): Promise<FhirBundle> {
    const encounter = await this.getEncounterById(id);
    this.logger.log(`Generating deterministic FHIR R4 bundle for encounter ${id}`);

    const bundle = FhirSerializer.serializeToFhirBundle(encounter);
    const now = new Date().toISOString();

    encounter.fhirBundle = bundle;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Generated FHIR R4 bundle for encounter ${id} with ${bundle.total} resources`,
    );

    return bundle;
  }

  async getFhirBundle(id: string): Promise<FhirBundle> {
    const encounter = await this.getEncounterById(id);
    if (!encounter.fhirBundle) {
      return this.generateFhirBundle(id);
    }
    return encounter.fhirBundle;
  }

  async finalizeEncounter(
    id: string,
    clinicianId?: string,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);

    // Enforce clinical minimum documentation requirements before finalization
    const hasTranscript =
      encounter.rawTranscript && encounter.rawTranscript.trim().length > 10;
    const hasSoap = Boolean(encounter.soapNote);
    const hasExtraction = Boolean(encounter.extraction);
    const hasImpression = Boolean(encounter.clinicalImpression);

    if (!hasTranscript && !hasSoap && !hasExtraction && !hasImpression) {
      throw new BadRequestException(
        'Encounter cannot be finalized in an empty draft state. Complete transcript, clinical notes, extraction, or diagnoses first.',
      );
    }

    // Ensure deterministic FHIR R4 Bundle is generated & attached
    if (!encounter.fhirBundle) {
      encounter.fhirBundle = FhirSerializer.serializeToFhirBundle(encounter);
    }

    const now = new Date().toISOString();
    encounter.status = 'finalized';
    encounter.finalizedAt = now;
    encounter.finalizedBy = clinicianId || encounter.clinicianId || 'doc-smith';
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} successfully finalized and locked by ${encounter.finalizedBy}`,
    );

    return encounter;
  }

  async getIntegrationPayload(
    id: string,
  ): Promise<PatientJourneyIntegrationSummary> {
    const encounter = await this.getEncounterById(id);

    // Enforce clinical safety rule: only finalized encounters flow downstream
    if (encounter.status !== 'finalized') {
      throw new BadRequestException(
        `Downstream patient journey integration is restricted to finalized encounters. Encounter "${id}" is currently in "${encounter.status}" status.`,
      );
    }

    const approvedMeds = (encounter.prescriptions || [])
      .filter((rx) => rx.status === 'approved')
      .map((rx) => ({
        medication: rx.medication,
        dosage: rx.dosage,
        route: rx.route,
        frequency: rx.frequency,
        instructions: rx.instructions || '',
      }));

    const vitalsMap: Record<string, string> = {};
    (encounter.extraction?.vitals || []).forEach((v) => {
      vitalsMap[v.name] = v.unit ? `${v.value} ${v.unit}` : v.value;
    });

    const activeDiagnoses = (encounter.clinicalImpression?.diagnoses || [])
      .filter((d) => d.status === 'confirmed' || d.type === 'primary')
      .map((d) => (d.code ? `${d.name} (${d.code})` : d.name));

    const summaryText =
      encounter.soapNote?.assessment ||
      encounter.clinicalImpression?.summary ||
      encounter.rawTranscript?.substring(0, 160) ||
      'Clinical consultation documented and finalized.';

    const payload: PatientJourneyIntegrationSummary = {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      finalizedAt: encounter.finalizedAt || encounter.updatedAt,
      finalizedBy: encounter.finalizedBy || encounter.clinicianId || 'doc-smith',
      timelineEvent: {
        type: 'clinical-encounter',
        title: `${encounter.type.toUpperCase()} Consultation Note`,
        summary: summaryText,
        timestamp: encounter.finalizedAt || encounter.dateTime,
      },
      medReconciliationItems: approvedMeds,
      riskAssessmentInput: {
        diagnoses: activeDiagnoses,
        vitals: vitalsMap,
      },
      fhirBundleSummary: {
        totalResources: encounter.fhirBundle?.total || 0,
        bundleId:
          (encounter.fhirBundle?.entry?.[0]?.resource?.['id'] as string) ||
          undefined,
      },
    };

    return payload;
  }
}
