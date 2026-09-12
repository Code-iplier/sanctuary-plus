import { describe, it, expect } from 'vitest';
import { FhirSerializer } from './fhir.serializer';
import type { ClinicalEncounter } from './documentation.types';

describe('FhirSerializer (Deterministic FHIR R4 Generation)', () => {
  const mockEncounter: ClinicalEncounter = {
    id: 'enc-test-1',
    patientId: 'patient-42',
    clinicianId: 'practitioner-99',
    dateTime: '2026-09-12T14:30:00.000Z',
    type: 'inpatient',
    status: 'reviewed',
    rawTranscript: '[Doctor]: Hello Mr. Test.\n[Patient]: I have severe chest pain.',
    audioDurationSeconds: 45,
    extraction: {
      symptoms: ['Severe chest pain'],
      clinicalFindings: ['Diaphoretic'],
      vitals: [
        { name: 'Blood Pressure', value: '150/90', unit: 'mmHg' },
        { name: 'Heart Rate', value: '98', unit: 'bpm' },
        { name: 'SpO2', value: '96', unit: '%' },
      ],
      currentMedications: ['Metformin 500mg'],
      allergies: ['Penicillin', 'Sulfa drugs'],
      history: ['Hypertension'],
    },
    soapNote: {
      subjective: 'Patient reports severe chest pain.',
      objective: 'BP 150/90 mmHg, HR 98 bpm.',
      assessment: 'Suspected acute coronary syndrome.',
      plan: 'Stat ECG and Aspirin 324mg.',
      reviewedAt: '2026-09-12T15:00:00.000Z',
      isReviewed: true,
    },
    prescriptions: [
      {
        id: 'rx-1',
        medication: 'Aspirin',
        dosage: '324mg',
        route: 'oral',
        frequency: 'once stat',
        duration: '1 day',
        instructions: 'Chew immediately',
        status: 'approved',
      },
      {
        id: 'rx-2',
        medication: 'Nitroglycerin',
        dosage: '0.4mg',
        route: 'sublingual',
        frequency: 'PRN',
        status: 'suggested',
      },
      {
        id: 'rx-3',
        medication: 'Penicillin',
        dosage: '500mg',
        route: 'oral',
        frequency: 'daily',
        status: 'rejected',
      },
    ],
    clinicalImpression: {
      summary: 'Patient presenting with signs of ACS.',
      diagnoses: [
        {
          id: 'diag-1',
          name: 'Acute Coronary Syndrome',
          code: 'I24.9',
          type: 'primary',
          certainty: 'probable',
          supportingEvidence: ['Chest pain', 'Diaphoresis'],
          status: 'confirmed',
        },
        {
          id: 'diag-2',
          name: 'Gastroesophageal Reflux Disease',
          code: 'K21.9',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Substernal discomfort'],
          status: 'ruled-out',
        },
      ],
      reviewedAt: '2026-09-12T15:10:00.000Z',
      isReviewed: true,
    },
    createdAt: '2026-09-12T14:30:00.000Z',
    updatedAt: '2026-09-12T15:10:00.000Z',
  };

  it('serializes Encounter resource deterministically with correct status, class, and references', () => {
    const encResource = FhirSerializer.serializeEncounter(mockEncounter);

    expect(encResource['resourceType']).toBe('Encounter');
    expect(encResource['id']).toBe('enc-test-1');
    expect(encResource['status']).toBe('finished');
    expect(encResource['class']).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'IMP',
      display: 'inpatient encounter',
    });
    expect(encResource['subject']).toEqual({ reference: 'Patient/patient-42' });
    expect(encResource['participant']).toEqual([
      { individual: { reference: 'Practitioner/practitioner-99' } },
    ]);
  });

  it('serializes Condition resources with correct clinicalStatus, verificationStatus, and ICD-10 codes', () => {
    const conditions = FhirSerializer.serializeConditions(mockEncounter);

    expect(conditions).toHaveLength(2);

    // Primary, confirmed diagnosis
    const cond1 = conditions[0];
    expect(cond1['resourceType']).toBe('Condition');
    expect(cond1['id']).toBe('condition-diag-1');
    expect(cond1['clinicalStatus']).toEqual({
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
    });
    expect(cond1['verificationStatus']).toEqual({
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        },
      ],
    });
    expect(cond1['category']).toEqual([
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis',
          },
        ],
      },
    ]);
    expect(cond1['code']).toEqual({
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: 'I24.9',
          display: 'Acute Coronary Syndrome',
        },
      ],
      text: 'Acute Coronary Syndrome',
    });
    expect(cond1['evidence']).toEqual([
      { code: [{ text: 'Chest pain' }] },
      { code: [{ text: 'Diaphoresis' }] },
    ]);

    // Ruled-out differential diagnosis
    const cond2 = conditions[1];
    expect(cond2['resourceType']).toBe('Condition');
    expect(cond2['id']).toBe('condition-diag-2');
    expect(cond2['clinicalStatus']).toEqual({
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'resolved',
          display: 'Resolved',
        },
      ],
    });
    expect(cond2['verificationStatus']).toEqual({
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'refuted',
          display: 'Refuted',
        },
      ],
    });
  });

  it('serializes Observation resources with standard LOINC codes for vitals, and exams for findings and symptoms', () => {
    const observations = FhirSerializer.serializeObservations(mockEncounter);

    // 3 vitals + 1 finding + 1 symptom = 5 observations
    expect(observations).toHaveLength(5);

    // Blood Pressure observation
    const bpObs = observations.find(
      (o) => (o['code'] as { text: string }).text === 'Blood Pressure',
    );
    expect(bpObs).toBeDefined();
    expect(bpObs!['category']).toEqual([
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ]);
    expect((bpObs!['code'] as { coding: Array<{ code: string }> }).coding[0].code).toBe(
      '85354-9',
    );
    expect(bpObs!['valueString']).toBe('150/90 mmHg');

    // Heart Rate numeric observation
    const hrObs = observations.find(
      (o) => (o['code'] as { text: string }).text === 'Heart Rate',
    );
    expect(hrObs).toBeDefined();
    expect(hrObs!['valueQuantity']).toEqual({
      value: 98,
      unit: 'bpm',
      system: 'http://unitsofmeasure.org',
    });

    // Clinical finding observation
    const findingObs = observations.find(
      (o) => (o['code'] as { text: string }).text === 'Clinical Finding',
    );
    expect(findingObs).toBeDefined();
    expect(findingObs!['valueString']).toBe('Diaphoretic');
  });

  it('serializes MedicationRequest resources with mapped status and dosage instructions', () => {
    const medReqs = FhirSerializer.serializeMedicationRequests(mockEncounter);

    expect(medReqs).toHaveLength(3);

    const approvedRx = medReqs.find((m) => m['id'] === 'medreq-rx-1');
    expect(approvedRx).toBeDefined();
    expect(approvedRx!['status']).toBe('active');
    expect(approvedRx!['intent']).toBe('order');
    expect(approvedRx!['medicationCodeableConcept']).toEqual({ text: 'Aspirin' });
    expect(approvedRx!['dosageInstruction']).toEqual([
      {
        text: '324mg oral once stat',
        route: { text: 'oral' },
        timing: { code: { text: 'once stat' } },
        additionalInstruction: [{ text: 'Chew immediately' }],
      },
    ]);

    const suggestedRx = medReqs.find((m) => m['id'] === 'medreq-rx-2');
    expect(suggestedRx!['status']).toBe('draft');

    const rejectedRx = medReqs.find((m) => m['id'] === 'medreq-rx-3');
    expect(rejectedRx!['status']).toBe('cancelled');
  });

  it('serializes AllergyIntolerance resources for documented allergies', () => {
    const allergies = FhirSerializer.serializeAllergies(mockEncounter);

    expect(allergies).toHaveLength(2);
    expect(allergies[0]['resourceType']).toBe('AllergyIntolerance');
    expect(allergies[0]['code']).toEqual({ text: 'Penicillin' });
    expect(allergies[0]['clinicalStatus']).toEqual({
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
    });
    expect(allergies[0]['patient']).toEqual({ reference: 'Patient/patient-42' });
  });

  it('serializes DocumentReference with attachments for SOAP note and consultation transcript', () => {
    const docRef = FhirSerializer.serializeDocumentReference(mockEncounter);

    expect(docRef).not.toBeNull();
    expect(docRef!['resourceType']).toBe('DocumentReference');
    expect(docRef!['id']).toBe('docref-enc-test-1');
    expect(docRef!['status']).toBe('current');
    expect(docRef!['type']).toEqual({
      coding: [
        {
          system: 'http://loinc.org',
          code: '11488-4',
          display: 'Consultation note',
        },
      ],
      text: 'Clinical Consultation SOAP Note & Transcript',
    });

    const content = docRef!['content'] as Array<{
      attachment: { contentType: string; title: string; data?: string };
    }>;
    expect(content).toHaveLength(2);
    expect(content[0].attachment.title).toBe('Structured SOAP Note');
    expect(content[1].attachment.title).toBe('Verbatim Consultation Transcript');

    // Verify base64 decoded content
    const decodedSoap = Buffer.from(content[0].attachment.data!, 'base64').toString('utf-8');
    expect(decodedSoap).toContain('SUBJECTIVE:');
    expect(decodedSoap).toContain('PLAN:');
  });

  it('assembles a full, compliant FHIR R4 Bundle collection', () => {
    const bundle = FhirSerializer.serializeToFhirBundle(mockEncounter);

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
    expect(bundle.total).toBeGreaterThan(0);
    expect(bundle.entry.length).toBe(bundle.total);

    // Verify every entry has valid fullUrl and resourceType
    bundle.entry.forEach((entry) => {
      expect(entry.fullUrl).toMatch(/^urn:uuid:/);
      expect(entry.resource.resourceType).toBeDefined();
    });

    // Check presence of key resource types
    const resourceTypes = bundle.entry.map((e) => e.resource.resourceType);
    expect(resourceTypes).toContain('Encounter');
    expect(resourceTypes).toContain('Condition');
    expect(resourceTypes).toContain('Observation');
    expect(resourceTypes).toContain('MedicationRequest');
    expect(resourceTypes).toContain('AllergyIntolerance');
    expect(resourceTypes).toContain('DocumentReference');
  });

  it('handles minimal encounter with empty fields gracefully', () => {
    const minimalEncounter: ClinicalEncounter = {
      id: 'enc-min',
      patientId: 'patient-minimal',
      dateTime: '2026-09-12T14:30:00.000Z',
      type: 'ambulatory',
      status: 'draft',
      createdAt: '2026-09-12T14:30:00.000Z',
      updatedAt: '2026-09-12T14:30:00.000Z',
    };

    const bundle = FhirSerializer.serializeToFhirBundle(minimalEncounter);

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.total).toBe(1); // Only Encounter resource
    expect(bundle.entry[0].resource.resourceType).toBe('Encounter');
    expect((bundle.entry[0].resource as { status: string }).status).toBe('in-progress');
  });
});
