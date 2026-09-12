import type {
  ClinicalEncounter,
  ClinicalVitalSign,
  DiagnosisItem,
  PrescriptionItem,
  FhirBundle,
  FhirBundleEntry,
} from './documentation.types';

/**
 * Deterministic FHIR R4 Serializer.
 * In accordance with healthcare interoperability standards, all conversions from
 * validated internal ClinicalEncounter models into FHIR R4 resources are strictly
 * deterministic with standard coding systems (LOINC, ICD-10, HL7 v3), eliminating
 * any LLM hallucination risks.
 */
export class FhirSerializer {
  /**
   * Converts a ClinicalEncounter into a FHIR R4 Encounter resource.
   */
  static serializeEncounter(
    encounter: ClinicalEncounter,
  ): Record<string, unknown> {
    const classMapping: Record<
      string,
      { code: string; display: string }
    > = {
      inpatient: { code: 'IMP', display: 'inpatient encounter' },
      outpatient: { code: 'AMB', display: 'ambulatory' },
      ambulatory: { code: 'AMB', display: 'ambulatory' },
      emergency: { code: 'EMER', display: 'emergency' },
      telehealth: { code: 'VR', display: 'virtual' },
    };

    const encounterClass = classMapping[encounter.type] || {
      code: 'AMB',
      display: 'ambulatory',
    };

    const status =
      encounter.status === 'finalized' || encounter.status === 'reviewed'
        ? 'finished'
        : 'in-progress';

    const resource: Record<string, unknown> = {
      resourceType: 'Encounter',
      id: encounter.id,
      status,
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounterClass.code,
        display: encounterClass.display,
      },
      subject: {
        reference: `Patient/${encounter.patientId}`,
      },
      period: {
        start: encounter.dateTime,
      },
    };

    if (encounter.clinicianId) {
      resource['participant'] = [
        {
          individual: {
            reference: `Practitioner/${encounter.clinicianId}`,
          },
        },
      ];
    }

    return resource;
  }

  /**
   * Converts diagnosis items into FHIR R4 Condition resources.
   */
  static serializeConditions(
    encounter: ClinicalEncounter,
  ): Record<string, unknown>[] {
    if (!encounter.clinicalImpression?.diagnoses) {
      return [];
    }

    return encounter.clinicalImpression.diagnoses.map(
      (diag: DiagnosisItem) => {
        const isRuledOut = diag.status === 'ruled-out';
        const isConfirmed =
          diag.status === 'confirmed' || diag.certainty === 'confirmed';

        const clinicalStatusCode = isRuledOut ? 'resolved' : 'active';
        const verificationStatusCode = isRuledOut
          ? 'refuted'
          : isConfirmed
          ? 'confirmed'
          : diag.certainty === 'probable'
          ? 'provisional'
          : 'differential';

        const codings = [];
        if (diag.code) {
          codings.push({
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: diag.code,
            display: diag.name,
          });
        }

        const condition: Record<string, unknown> = {
          resourceType: 'Condition',
          id: `condition-${diag.id}`,
          clinicalStatus: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: clinicalStatusCode,
                display: isRuledOut ? 'Resolved' : 'Active',
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: verificationStatusCode,
                display:
                  verificationStatusCode.charAt(0).toUpperCase() +
                  verificationStatusCode.slice(1),
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/condition-category',
                  code:
                    diag.type === 'primary'
                      ? 'encounter-diagnosis'
                      : 'problem-list-item',
                  display:
                    diag.type === 'primary'
                      ? 'Encounter Diagnosis'
                      : 'Problem List Item',
                },
              ],
            },
          ],
          code: {
            coding: codings,
            text: diag.name,
          },
          subject: {
            reference: `Patient/${encounter.patientId}`,
          },
          encounter: {
            reference: `Encounter/${encounter.id}`,
          },
          recordedDate:
            encounter.clinicalImpression?.reviewedAt || encounter.dateTime,
        };

        if (diag.supportingEvidence && diag.supportingEvidence.length > 0) {
          condition['evidence'] = diag.supportingEvidence.map((ev) => ({
            code: [{ text: ev }],
          }));
        }

        return condition;
      },
    );
  }

  /**
   * Helper to resolve LOINC code for vital signs.
   */
  private static getVitalLoinc(name: string): { code: string; display: string } | null {
    const lower = name.toLowerCase();
    if (lower.includes('blood pressure') || lower.includes('bp')) {
      return { code: '85354-9', display: 'Blood pressure panel with all children optional' };
    }
    if (lower.includes('heart rate') || lower.includes('pulse') || lower.includes('hr')) {
      return { code: '8867-4', display: 'Heart rate' };
    }
    if (lower.includes('respirat') || lower.includes('rr')) {
      return { code: '9279-1', display: 'Respiratory rate' };
    }
    if (lower.includes('temp')) {
      return { code: '8310-5', display: 'Body temperature' };
    }
    if (lower.includes('spo2') || lower.includes('oxygen') || lower.includes('o2 sat')) {
      return { code: '2708-6', display: 'Oxygen saturation in Arterial blood' };
    }
    return null;
  }

  /**
   * Converts extracted vitals and clinical findings into FHIR R4 Observation resources.
   */
  static serializeObservations(
    encounter: ClinicalEncounter,
  ): Record<string, unknown>[] {
    const observations: Record<string, unknown>[] = [];
    const extraction = encounter.extraction;
    if (!extraction) {
      return observations;
    }

    // 1. Vital signs observations
    (extraction.vitals || []).forEach((vital: ClinicalVitalSign, idx: number) => {
      const loinc = FhirSerializer.getVitalLoinc(vital.name);
      const codings = [];
      if (loinc) {
        codings.push({
          system: 'http://loinc.org',
          code: loinc.code,
          display: loinc.display,
        });
      }

      const numVal = parseFloat(vital.value);
      const isNumeric = !isNaN(numVal) && !vital.value.includes('/');

      const obs: Record<string, unknown> = {
        resourceType: 'Observation',
        id: `obs-vital-${encounter.id}-${idx + 1}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: codings,
          text: vital.name,
        },
        subject: {
          reference: `Patient/${encounter.patientId}`,
        },
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: encounter.dateTime,
      };

      if (isNumeric) {
        obs['valueQuantity'] = {
          value: numVal,
          unit: vital.unit || '',
          system: 'http://unitsofmeasure.org',
        };
      } else {
        obs['valueString'] = vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
      }

      observations.push(obs);
    });

    // 2. Clinical findings observations
    (extraction.clinicalFindings || []).forEach((finding: string, idx: number) => {
      observations.push({
        resourceType: 'Observation',
        id: `obs-finding-${encounter.id}-${idx + 1}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'exam',
                display: 'Exam',
              },
            ],
          },
        ],
        code: {
          text: 'Clinical Finding',
        },
        subject: {
          reference: `Patient/${encounter.patientId}`,
        },
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: encounter.dateTime,
        valueString: finding,
      });
    });

    // 3. Symptoms observations
    (extraction.symptoms || []).forEach((symptom: string, idx: number) => {
      observations.push({
        resourceType: 'Observation',
        id: `obs-symptom-${encounter.id}-${idx + 1}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'exam',
                display: 'Exam',
              },
            ],
          },
        ],
        code: {
          text: 'Patient Reported Symptom',
        },
        subject: {
          reference: `Patient/${encounter.patientId}`,
        },
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: encounter.dateTime,
        valueString: symptom,
      });
    });

    return observations;
  }

  /**
   * Converts prescriptions into FHIR R4 MedicationRequest resources.
   */
  static serializeMedicationRequests(
    encounter: ClinicalEncounter,
  ): Record<string, unknown>[] {
    if (!encounter.prescriptions) {
      return [];
    }

    return encounter.prescriptions.map((rx: PrescriptionItem) => {
      const status =
        rx.status === 'approved'
          ? 'active'
          : rx.status === 'rejected'
          ? 'cancelled'
          : 'draft';

      const medReq: Record<string, unknown> = {
        resourceType: 'MedicationRequest',
        id: `medreq-${rx.id}`,
        status,
        intent: 'order',
        medicationCodeableConcept: {
          text: rx.medication,
        },
        subject: {
          reference: `Patient/${encounter.patientId}`,
        },
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        authoredOn: encounter.dateTime,
        dosageInstruction: [
          {
            text: `${rx.dosage} ${rx.route} ${rx.frequency}`.trim(),
            route: rx.route ? { text: rx.route } : undefined,
            timing: rx.frequency ? { code: { text: rx.frequency } } : undefined,
            additionalInstruction: rx.instructions
              ? [{ text: rx.instructions }]
              : undefined,
          },
        ],
      };

      if (encounter.clinicianId) {
        medReq['requester'] = {
          reference: `Practitioner/${encounter.clinicianId}`,
        };
      }

      if (rx.duration) {
        const numDays = parseInt(rx.duration, 10);
        if (!isNaN(numDays)) {
          medReq['dispenseRequest'] = {
            expectedSupplyDuration: {
              value: numDays,
              unit: rx.duration.includes('week') ? 'weeks' : 'days',
              system: 'http://unitsofmeasure.org',
            },
          };
        }
      }

      return medReq;
    });
  }

  /**
   * Converts documented allergies into FHIR R4 AllergyIntolerance resources.
   */
  static serializeAllergies(
    encounter: ClinicalEncounter,
  ): Record<string, unknown>[] {
    if (!encounter.extraction?.allergies) {
      return [];
    }

    return encounter.extraction.allergies.map(
      (allergy: string, idx: number) => ({
        resourceType: 'AllergyIntolerance',
        id: `allergy-${encounter.id}-${idx + 1}`,
        clinicalStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
              code: 'active',
              display: 'Active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
              code: 'confirmed',
              display: 'Confirmed',
            },
          ],
        },
        code: {
          text: allergy,
        },
        patient: {
          reference: `Patient/${encounter.patientId}`,
        },
        recordedDate: encounter.dateTime,
      }),
    );
  }

  /**
   * Converts SOAP note narrative and transcript into a FHIR R4 DocumentReference resource.
   */
  static serializeDocumentReference(
    encounter: ClinicalEncounter,
  ): Record<string, unknown> | null {
    if (!encounter.soapNote && !encounter.rawTranscript) {
      return null;
    }

    const docRef: Record<string, unknown> = {
      resourceType: 'DocumentReference',
      id: `docref-${encounter.id}`,
      status: 'current',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note',
          },
        ],
        text: 'Clinical Consultation SOAP Note & Transcript',
      },
      category: [
        {
          coding: [
            {
              system:
                'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
              code: 'clinical-note',
              display: 'Clinical Note',
            },
          ],
        },
      ],
      subject: {
        reference: `Patient/${encounter.patientId}`,
      },
      date:
        encounter.soapNote?.reviewedAt ||
        encounter.updatedAt ||
        encounter.dateTime,
      context: {
        encounter: [
          {
            reference: `Encounter/${encounter.id}`,
          },
        ],
      },
      content: [],
    };

    if (encounter.clinicianId) {
      docRef['author'] = [
        {
          reference: `Practitioner/${encounter.clinicianId}`,
        },
      ];
    }

    const contents: Array<{
      attachment: {
        contentType: string;
        title: string;
        data?: string;
      };
    }> = [];

    if (encounter.soapNote) {
      const soapText = `SUBJECTIVE:\n${encounter.soapNote.subjective}\n\nOBJECTIVE:\n${encounter.soapNote.objective}\n\nASSESSMENT:\n${encounter.soapNote.assessment}\n\nPLAN:\n${encounter.soapNote.plan}`;
      contents.push({
        attachment: {
          contentType: 'text/plain',
          title: 'Structured SOAP Note',
          data: Buffer.from(soapText, 'utf-8').toString('base64'),
        },
      });
    }

    if (encounter.rawTranscript) {
      contents.push({
        attachment: {
          contentType: 'text/plain',
          title: 'Verbatim Consultation Transcript',
          data: Buffer.from(encounter.rawTranscript, 'utf-8').toString('base64'),
        },
      });
    }

    docRef['content'] = contents;
    return docRef;
  }

  /**
   * Packages all serialized FHIR R4 resources into a valid FHIR R4 Bundle.
   */
  static serializeToFhirBundle(encounter: ClinicalEncounter): FhirBundle {
    const resources: Record<string, unknown>[] = [];

    // 1. Encounter resource
    resources.push(FhirSerializer.serializeEncounter(encounter));

    // 2. Conditions (Diagnoses)
    const conditions = FhirSerializer.serializeConditions(encounter);
    resources.push(...conditions);

    // 3. Observations (Vitals, findings, symptoms)
    const observations = FhirSerializer.serializeObservations(encounter);
    resources.push(...observations);

    // 4. MedicationRequests (Prescriptions)
    const medicationRequests =
      FhirSerializer.serializeMedicationRequests(encounter);
    resources.push(...medicationRequests);

    // 5. AllergyIntolerances
    const allergies = FhirSerializer.serializeAllergies(encounter);
    resources.push(...allergies);

    // 6. DocumentReference
    const docRef = FhirSerializer.serializeDocumentReference(encounter);
    if (docRef) {
      resources.push(docRef);
    }

    const entries: FhirBundleEntry[] = resources.map((resource) => {
      const resourceType = resource['resourceType'] as string;
      const resourceId = resource['id'] as string;
      return {
        fullUrl: `urn:uuid:${resourceId || resourceType}`,
        resource,
      };
    });

    return {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries,
    };
  }
}
