import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Tabs, Alert } from '@heroui/react';
import {
  FileText,
  Calendar,
  Mic,
  MicOff,
  Save,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Clock,
  User,
  RefreshCw,
  Volume2,
  Activity,
  HeartPulse,
  Pill,
  AlertTriangle,
  History,
  Plus,
  X,
  Edit3,
  Trash2,
  Check,
  Ban,
} from 'lucide-react';

export type EncounterStatus = 'draft' | 'reviewed' | 'finalized';
export type EncounterType =
  | 'inpatient'
  | 'outpatient'
  | 'emergency'
  | 'telehealth'
  | 'ambulatory';

export interface ClinicalVitalSign {
  name: string;
  value: string;
  unit?: string;
}

export interface ClinicalExtraction {
  symptoms: string[];
  clinicalFindings: string[];
  vitals: ClinicalVitalSign[];
  currentMedications: string[];
  allergies: string[];
  history: string[];
  extractedAt?: string;
  rawExtractionJson?: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generatedAt?: string;
  reviewedAt?: string;
  isReviewed?: boolean;
}

export type PrescriptionStatus = 'suggested' | 'approved' | 'rejected';

export interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: PrescriptionStatus;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  clinicianId?: string;
  dateTime: string;
  type: EncounterType;
  status: EncounterStatus;
  rawTranscript?: string;
  audioDurationSeconds?: number;
  transcriptConfidence?: number;
  transcriptReviewed?: boolean;
  reviewedAt?: string;
  reviewedByClinicianId?: string;
  extraction?: ClinicalExtraction;
  soapNote?: SoapNote;
  prescriptions?: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

const INITIAL_ENCOUNTERS: ClinicalEncounter[] = [
  {
    id: 'enc-101',
    patientId: '1',
    clinicianId: 'doc-smith',
    dateTime: new Date(Date.now() - 7200000).toISOString(),
    type: 'inpatient',
    status: 'reviewed',
    rawTranscript: `[Doctor]: Good morning, Mr. Doe. Can you tell me what brought you in today?\n[Patient]: I was walking up the stairs and suddenly had this intense crushing chest pressure going into my left arm.\n[Doctor]: Did you have any shortness of breath or cold sweats?\n[Patient]: Yes, lots of sweating and difficulty breathing.\n[Doctor]: Any drug allergies?\n[Patient]: Allergic to Penicillin, gives me hives.`,
    audioDurationSeconds: 45,
    transcriptConfidence: 0.96,
    transcriptReviewed: true,
    reviewedAt: new Date(Date.now() - 3600000).toISOString(),
    reviewedByClinicianId: 'doc-smith',
    extraction: {
      symptoms: [
        'Crushing chest pressure radiating to left arm',
        'Dyspnea (shortness of breath)',
        'Diaphoresis (cold sweats)',
      ],
      clinicalFindings: [
        'Acute discomfort during stair climbing exertion',
        'Diaphoretic presentation',
      ],
      vitals: [
        { name: 'Blood Pressure', value: '142/88', unit: 'mmHg' },
        { name: 'Heart Rate', value: '98', unit: 'bpm' },
        { name: 'Oxygen Saturation', value: '96', unit: '%' },
      ],
      currentMedications: ['Aspirin 81mg daily', 'Atorvastatin 40mg'],
      allergies: ['Penicillin (causes hives)'],
      history: ['Coronary artery disease', 'Hypertension'],
      extractedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    soapNote: {
      subjective:
        'Patient is a 58-year-old male who presents with sudden onset crushing substernal chest pressure while walking up stairs, radiating to the left arm. Associated with diaphoresis and acute shortness of breath. Reports allergy to Penicillin (hives).',
      objective:
        'Alert, visibly diaphoretic and in moderate distress. Vitals: BP 142/88 mmHg, HR 98 bpm, SpO2 96% on room air. Cardiopulmonary exam notable for tachypnea without focal rales.',
      assessment:
        'Acute coronary syndrome presentation vs acute myocardial ischemia with exertional onset and autonomic symptoms in a patient with hypertension.',
      plan:
        'Immediate 12-lead ECG and stat cardiac troponin markers. Administer chewed aspirin 324mg and establish IV access. Continuous telemetry monitoring. Cardiology consult requested.',
      generatedAt: new Date(Date.now() - 3400000).toISOString(),
      reviewedAt: new Date(Date.now() - 3300000).toISOString(),
      isReviewed: true,
    },
    prescriptions: [
      {
        id: 'rx-101-1',
        medication: 'Aspirin',
        dosage: '81 mg',
        route: 'oral',
        frequency: 'once daily',
        duration: 'Ongoing',
        instructions: 'Take with food in the morning',
        status: 'approved',
      },
      {
        id: 'rx-101-2',
        medication: 'Nitroglycerin SL',
        dosage: '0.4 mg',
        route: 'sublingual',
        frequency: 'every 5 minutes PRN chest pain up to 3 doses',
        duration: '30 days',
        instructions: 'Place under tongue; call 911 if pain unrelieved after 3 doses',
        status: 'suggested',
      },
      {
        id: 'rx-101-3',
        medication: 'Atorvastatin',
        dosage: '80 mg',
        route: 'oral',
        frequency: 'once daily',
        duration: 'Ongoing',
        instructions: 'Take at bedtime',
        status: 'suggested',
      },
      {
        id: 'rx-101-4',
        medication: 'Metoprolol Tartrate',
        dosage: '25 mg',
        route: 'oral',
        frequency: 'twice daily',
        duration: '30 days',
        instructions: 'Hold if HR < 55 bpm or SBP < 100 mmHg',
        status: 'suggested',
      },
    ],
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
    rawTranscript: `[Doctor]: Hello Jane, how has your blood pressure been this past month?\n[Patient]: It has been stable around 125 over 80. No dizziness or headaches.\n[Doctor]: Excellent. Are you continuing your Lisinopril 20mg daily?\n[Patient]: Yes, every morning with breakfast.`,
    audioDurationSeconds: 30,
    transcriptConfidence: 0.98,
    transcriptReviewed: true,
    reviewedAt: new Date(Date.now() - 82800000).toISOString(),
    reviewedByClinicianId: 'doc-smith',
    extraction: {
      symptoms: ['No dizziness', 'No headaches'],
      clinicalFindings: ['Stable outpatient blood pressure'],
      vitals: [{ name: 'Blood Pressure', value: '125/80', unit: 'mmHg' }],
      currentMedications: ['Lisinopril 20mg daily'],
      allergies: ['No known drug allergies (NKDA)'],
      history: ['Essential hypertension'],
      extractedAt: new Date(Date.now() - 82800000).toISOString(),
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
        dosage: '20 mg',
        route: 'oral',
        frequency: 'once daily',
        duration: '90 days',
        instructions: 'Take every morning with breakfast',
        status: 'approved',
      },
      {
        id: 'rx-102-2',
        medication: 'Hydrochlorothiazide',
        dosage: '12.5 mg',
        route: 'oral',
        frequency: 'once daily',
        duration: '90 days',
        instructions: 'Take in the morning to prevent nocturia',
        status: 'suggested',
      },
    ],
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

export default function DocumentationPage() {
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(INITIAL_ENCOUNTERS);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('enc-103');
  const [editableTranscript, setEditableTranscript] = useState<string>('');

  // Phase 3: Clinical Extraction state
  const [extraction, setExtraction] = useState<ClinicalExtraction | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSavingExtraction, setIsSavingExtraction] = useState<boolean>(false);
  const [isEditingExtraction, setIsEditingExtraction] = useState<boolean>(false);

  // Phase 4: Structured SOAP Note state
  const [soapNote, setSoapNote] = useState<SoapNote | null>(null);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState<boolean>(false);
  const [isSavingSoap, setIsSavingSoap] = useState<boolean>(false);
  const [isEditingSoap, setIsEditingSoap] = useState<boolean>(false);
  const [soapSubjective, setSoapSubjective] = useState<string>('');
  const [soapObjective, setSoapObjective] = useState<string>('');
  const [soapAssessment, setSoapAssessment] = useState<string>('');
  const [soapPlan, setSoapPlan] = useState<string>('');

  // Phase 5: Prescription Management state
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isSuggestingPrescriptions, setIsSuggestingPrescriptions] = useState<boolean>(false);
  const [isSavingPrescriptions, setIsSavingPrescriptions] = useState<boolean>(false);

  // New Prescription manual addition state
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedDosage, setNewMedDosage] = useState<string>('');
  const [newMedRoute, setNewMedRoute] = useState<string>('oral');
  const [newMedFrequency, setNewMedFrequency] = useState<string>('once daily');
  const [newMedDuration, setNewMedDuration] = useState<string>('30 days');
  const [newMedInstructions, setNewMedInstructions] = useState<string>('');
  const [showAddPrescription, setShowAddPrescription] = useState<boolean>(false);

  // New item inputs for each category in extraction editor
  const [newSymptom, setNewSymptom] = useState<string>('');
  const [newFinding, setNewFinding] = useState<string>('');
  const [newMedication, setNewMedication] = useState<string>('');
  const [newAllergy, setNewAllergy] = useState<string>('');
  const [newHistory, setNewHistory] = useState<string>('');
  const [newVitalName, setNewVitalName] = useState<string>('');
  const [newVitalValue, setNewVitalValue] = useState<string>('');
  const [newVitalUnit, setNewVitalUnit] = useState<string>('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Status & Feedback state
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{
    type: 'success' | 'warning' | 'danger' | 'default';
    message: string;
  } | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeEncounter =
    encounters.find((e) => e.id === selectedEncounterId) || encounters[0];

  // Load active encounter transcript, extraction & SOAP into editor
  useEffect(() => {
    if (activeEncounter) {
      setEditableTranscript(activeEncounter.rawTranscript || '');
      setExtraction(activeEncounter.extraction || null);
      setIsEditingExtraction(false);
      setSoapNote(activeEncounter.soapNote || null);
      setSoapSubjective(activeEncounter.soapNote?.subjective || '');
      setSoapObjective(activeEncounter.soapNote?.objective || '');
      setSoapAssessment(activeEncounter.soapNote?.assessment || '');
      setSoapPlan(activeEncounter.soapNote?.plan || '');
      setIsEditingSoap(false);
      setPrescriptions(activeEncounter.prescriptions || []);
      setShowAddPrescription(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setUploadedFileName(null);
      setRecordingSeconds(activeEncounter.audioDurationSeconds || 0);
      setAlertInfo(null);
    }
  }, [selectedEncounterId]);

  // Sync encounters with backend on initial mount
  useEffect(() => {
    const fetchBackendEncounters = async () => {
      try {
        const res = await fetch('/api/encounters');
        if (res.ok) {
          const data: ClinicalEncounter[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setEncounters(data);
          }
        }
      } catch {
        // Fallback to initial demo encounters if backend is offline
      }
    };
    fetchBackendEncounters();
  }, []);

  // Clean up audio object URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  // Real Browser Microphone Recording via MediaRecorder
  const startRecording = async () => {
    setAlertInfo(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAlertInfo({
          type: 'danger',
          message:
            'Microphone access is not supported in this browser. Please upload an audio file instead.',
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(audioChunksRef.current, { type: blobType });
        setAudioBlob(finalBlob);

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const newUrl = URL.createObjectURL(finalBlob);
        setAudioUrl(newUrl);
        setUploadedFileName(null);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250); // Slice every 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Microphone permission denied or unavailable: ${error.message}`,
      });
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Real Audio File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlertInfo(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size === 0) {
        setAlertInfo({
          type: 'danger',
          message: 'Selected audio file is empty (0 bytes).',
        });
        return;
      }
      setAudioBlob(file);
      setUploadedFileName(file.name);

      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const newUrl = URL.createObjectURL(file);
      setAudioUrl(newUrl);
      setRecordingSeconds(Math.max(10, Math.round(file.size / 24000)));
    }
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Real Phase 2 Transcription: Sends Audio to Backend -> Gemini Flash
  const handleTranscribeAudio = async () => {
    if (!audioBlob) {
      setAlertInfo({
        type: 'warning',
        message: 'Please record consultation audio or upload an audio file first.',
      });
      return;
    }

    setAlertInfo(null);
    setIsTranscribing(true);

    try {
      const base64Data = await blobToBase64(audioBlob);

      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/transcribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: audioBlob.type || 'audio/webm',
            filename: uploadedFileName || 'recorded_audio.webm',
            durationSeconds: recordingSeconds,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Backend returned HTTP ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      setEditableTranscript(data.transcript);

      // Update encounter in local state
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id
            ? {
                ...enc,
                rawTranscript: data.transcript,
                audioDurationSeconds: data.durationSeconds,
                transcriptConfidence: data.confidence,
                transcriptReviewed: false,
                updatedAt: new Date().toISOString(),
              }
            : enc,
        ),
      );

      setAlertInfo({
        type: 'success',
        message: `Audio successfully transcribed with Gemini Flash (${data.durationSeconds}s, ${(data.confidence * 100).toFixed(0)}% confidence). Please review and save.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Transcription failed: ${error.message}`,
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // Real Transcript Review & Persist
  const handleSaveReviewedTranscript = async () => {
    if (!editableTranscript.trim()) {
      setAlertInfo({
        type: 'warning',
        message: 'Transcript text cannot be empty.',
      });
      return;
    }

    setIsSaving(true);
    setAlertInfo(null);

    try {
      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/transcript`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: editableTranscript,
            clinicianId: activeEncounter.clinicianId || 'doc-smith',
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to save transcript (HTTP ${response.status})`,
        );
      }

      const updatedEncounter: ClinicalEncounter = await response.json();

      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id ? updatedEncounter : enc,
        ),
      );

      setAlertInfo({
        type: 'success',
        message: `Transcript reviewed and saved for Encounter ${activeEncounter.id}. Status updated to Reviewed.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Failed to save reviewed transcript: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Real Phase 3: Clinical Information Extraction from Transcript
  const handleExtractClinicalInformation = async () => {
    const transcriptText = editableTranscript.trim();
    if (!transcriptText || transcriptText.length < 10) {
      setAlertInfo({
        type: 'warning',
        message:
          'Transcript is too short or empty for clinical information extraction. Please provide consultation text first.',
      });
      return;
    }

    setIsExtracting(true);
    setAlertInfo(null);

    try {
      // Ensure backend has current transcript if it was modified
      if (editableTranscript !== activeEncounter.rawTranscript) {
        await fetch(`/api/encounters/${activeEncounter.id}/transcript`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: editableTranscript,
            clinicianId: activeEncounter.clinicianId || 'doc-smith',
          }),
        });
      }

      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/extract`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Clinical extraction failed (HTTP ${response.status})`,
        );
      }

      const extractedData: ClinicalExtraction = await response.json();
      setExtraction(extractedData);
      setIsEditingExtraction(false);

      // Update in encounters list
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id
            ? {
                ...enc,
                extraction: extractedData,
                rawTranscript: editableTranscript,
                updatedAt: new Date().toISOString(),
              }
            : enc,
        ),
      );

      setAlertInfo({
        type: 'success',
        message:
          'Clinical information successfully extracted with Gemini NLP. Review and edit structured entities below.',
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Clinical extraction failed: ${error.message}`,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Save clinician-edited extraction entities
  const handleSaveExtraction = async () => {
    if (!extraction) return;

    setIsSavingExtraction(true);
    setAlertInfo(null);

    try {
      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/extraction`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extraction }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to save extraction (HTTP ${response.status})`,
        );
      }

      const updatedEncounter: ClinicalEncounter = await response.json();
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id ? updatedEncounter : enc,
        ),
      );
      setExtraction(updatedEncounter.extraction || extraction);
      setIsEditingExtraction(false);

      setAlertInfo({
        type: 'success',
        message: `Extracted clinical entities successfully saved and updated for Encounter ${activeEncounter.id}.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Failed to save extraction: ${error.message}`,
      });
    } finally {
      setIsSavingExtraction(false);
    }
  };

  // Entity editing helper functions
  const handleRemoveEntityItem = (
    field:
      | 'symptoms'
      | 'clinicalFindings'
      | 'currentMedications'
      | 'allergies'
      | 'history',
    index: number,
  ) => {
    if (!extraction) return;
    const updatedList = [...extraction[field]];
    updatedList.splice(index, 1);
    setExtraction({
      ...extraction,
      [field]: updatedList,
    });
  };

  const handleAddEntityItem = (
    field:
      | 'symptoms'
      | 'clinicalFindings'
      | 'currentMedications'
      | 'allergies'
      | 'history',
    value: string,
    setter: (val: string) => void,
  ) => {
    if (!value.trim() || !extraction) return;
    setExtraction({
      ...extraction,
      [field]: [...extraction[field], value.trim()],
    });
    setter('');
  };

  const handleRemoveVital = (index: number) => {
    if (!extraction) return;
    const updatedVitals = [...extraction.vitals];
    updatedVitals.splice(index, 1);
    setExtraction({
      ...extraction,
      vitals: updatedVitals,
    });
  };

  const handleAddVital = () => {
    if (!newVitalName.trim() || !newVitalValue.trim() || !extraction) return;
    setExtraction({
      ...extraction,
      vitals: [
        ...extraction.vitals,
        {
          name: newVitalName.trim(),
          value: newVitalValue.trim(),
          unit: newVitalUnit.trim() || undefined,
        },
      ],
    });
    setNewVitalName('');
    setNewVitalValue('');
    setNewVitalUnit('');
  };

  // Real Phase 4: Generate Structured SOAP Note from Transcript & Extraction
  const handleGenerateSoapNote = async () => {
    const transcriptText = editableTranscript.trim();
    if (!transcriptText || transcriptText.length < 10) {
      setAlertInfo({
        type: 'warning',
        message:
          'Transcript is too short or empty for SOAP note generation. Please provide consultation text first.',
      });
      return;
    }

    setIsGeneratingSoap(true);
    setAlertInfo(null);

    try {
      // Ensure backend has current transcript if modified
      if (editableTranscript !== activeEncounter.rawTranscript) {
        await fetch(`/api/encounters/${activeEncounter.id}/transcript`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: editableTranscript,
            clinicianId: activeEncounter.clinicianId || 'doc-smith',
          }),
        });
      }

      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/soap/generate`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `SOAP note generation failed (HTTP ${response.status})`,
        );
      }

      const generatedNote: SoapNote = await response.json();
      setSoapNote(generatedNote);
      setSoapSubjective(generatedNote.subjective);
      setSoapObjective(generatedNote.objective);
      setSoapAssessment(generatedNote.assessment);
      setSoapPlan(generatedNote.plan);
      setIsEditingSoap(false);

      // Update in encounters list
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id
            ? {
                ...enc,
                soapNote: generatedNote,
                rawTranscript: editableTranscript,
                updatedAt: new Date().toISOString(),
              }
            : enc,
        ),
      );

      setAlertInfo({
        type: 'success',
        message:
          'Structured SOAP clinical progress note successfully synthesized with Gemini. Review and edit sections below.',
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `SOAP generation failed: ${error.message}`,
      });
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  // Save clinician-reviewed SOAP note
  const handleSaveSoapNote = async () => {
    if (
      !soapSubjective.trim() &&
      !soapObjective.trim() &&
      !soapAssessment.trim() &&
      !soapPlan.trim()
    ) {
      setAlertInfo({
        type: 'warning',
        message: 'Cannot save an empty SOAP note.',
      });
      return;
    }

    setIsSavingSoap(true);
    setAlertInfo(null);

    const updatedNote: SoapNote = {
      subjective: soapSubjective.trim(),
      objective: soapObjective.trim(),
      assessment: soapAssessment.trim(),
      plan: soapPlan.trim(),
      generatedAt: soapNote?.generatedAt || new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      isReviewed: true,
    };

    try {
      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/soap`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soapNote: updatedNote }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to save SOAP note (HTTP ${response.status})`,
        );
      }

      const updatedEncounter: ClinicalEncounter = await response.json();
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id ? updatedEncounter : enc,
        ),
      );
      setSoapNote(updatedEncounter.soapNote || updatedNote);
      setIsEditingSoap(false);

      setAlertInfo({
        type: 'success',
        message: `SOAP clinical note reviewed and saved successfully for Encounter ${activeEncounter.id}.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Failed to save SOAP note: ${error.message}`,
      });
    } finally {
      setIsSavingSoap(false);
    }
  };

  // Real Phase 5: Suggest Prescriptions using Gemini
  const handleSuggestPrescriptions = async () => {
    const transcriptText = editableTranscript.trim();
    if (!transcriptText || transcriptText.length < 10) {
      setAlertInfo({
        type: 'warning',
        message:
          'Transcript is too short or empty to suggest prescriptions. Please provide consultation text first.',
      });
      return;
    }

    setIsSuggestingPrescriptions(true);
    setAlertInfo(null);

    try {
      if (editableTranscript !== activeEncounter.rawTranscript) {
        await fetch(`/api/encounters/${activeEncounter.id}/transcript`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: editableTranscript,
            clinicianId: activeEncounter.clinicianId || 'doc-smith',
          }),
        });
      }

      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/prescriptions/suggest`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Prescription suggestion failed (HTTP ${response.status})`,
        );
      }

      const suggestedItems: PrescriptionItem[] = await response.json();
      setPrescriptions(suggestedItems);

      // Update active encounter in encounters list
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id
            ? {
                ...enc,
                prescriptions: suggestedItems,
                rawTranscript: editableTranscript,
                updatedAt: new Date().toISOString(),
              }
            : enc,
        ),
      );

      setAlertInfo({
        type: 'success',
        message: `Generated ${suggestedItems.length} evidence-based prescription suggestions with allergy contraindication safety checks. Review each item below.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Failed to suggest prescriptions: ${error.message}`,
      });
    } finally {
      setIsSuggestingPrescriptions(false);
    }
  };

  // Save clinician-reviewed prescriptions list
  const handleSavePrescriptions = async () => {
    setIsSavingPrescriptions(true);
    setAlertInfo(null);

    try {
      const response = await fetch(
        `/api/encounters/${activeEncounter.id}/prescriptions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prescriptions }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to save prescriptions (HTTP ${response.status})`,
        );
      }

      const updatedEncounter: ClinicalEncounter = await response.json();
      setEncounters((prev) =>
        prev.map((enc) =>
          enc.id === activeEncounter.id ? updatedEncounter : enc,
        ),
      );
      setPrescriptions(updatedEncounter.prescriptions || prescriptions);

      setAlertInfo({
        type: 'success',
        message: `Prescriptions successfully saved and updated for Encounter ${activeEncounter.id}.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setAlertInfo({
        type: 'danger',
        message: `Failed to save prescriptions: ${error.message}`,
      });
    } finally {
      setIsSavingPrescriptions(false);
    }
  };

  const handleApprovePrescription = (id: string) => {
    setPrescriptions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'approved' as const } : item,
      ),
    );
  };

  const handleRejectPrescription = (id: string) => {
    setPrescriptions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'rejected' as const } : item,
      ),
    );
  };

  const handleDeletePrescription = (id: string) => {
    setPrescriptions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddManualPrescription = () => {
    if (!newMedName.trim() || !newMedDosage.trim()) {
      setAlertInfo({
        type: 'warning',
        message: 'Medication name and dosage are required to add a prescription.',
      });
      return;
    }

    const newItem: PrescriptionItem = {
      id: `rx-manual-${Date.now()}`,
      medication: newMedName.trim(),
      dosage: newMedDosage.trim(),
      route: newMedRoute.trim() || 'oral',
      frequency: newMedFrequency.trim() || 'once daily',
      duration: newMedDuration.trim() || '30 days',
      instructions: newMedInstructions.trim() || 'Take as directed',
      status: 'suggested',
    };

    setPrescriptions((prev) => [...prev, newItem]);
    setNewMedName('');
    setNewMedDosage('');
    setNewMedRoute('oral');
    setNewMedFrequency('once daily');
    setNewMedDuration('30 days');
    setNewMedInstructions('');
    setShowAddPrescription(false);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusBadgeVariant = (status: EncounterStatus) => {
    switch (status) {
      case 'reviewed':
        return 'success';
      case 'finalized':
        return 'accent';
      default:
        return 'warning';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header card with active encounter selection */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                Clinical Documentation & AI Transcription
              </h2>
              <Badge
                color={getStatusBadgeVariant(activeEncounter.status)}
                variant="soft"
              >
                {activeEncounter.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Phases 2, 3 & 4: Audio Transcription, Clinical Extraction & Structured SOAP Notes
            </p>
          </div>

          {/* Encounter switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Encounter:</span>
            <select
              value={selectedEncounterId}
              onChange={(e) => setSelectedEncounterId(e.target.value)}
              className="text-sm bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {encounters.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {enc.id} (Patient #{enc.patientId} • {enc.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Alert banner */}
      {alertInfo && (
        <Alert
          status={alertInfo.type === 'danger' ? 'danger' : alertInfo.type === 'success' ? 'success' : 'default'}
          className="rounded-lg"
        >
          <div className="flex items-center gap-2">
            {alertInfo.type === 'danger' ? (
              <AlertCircle size={18} />
            ) : alertInfo.type === 'success' ? (
              <CheckCircle size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            <span className="text-sm">{alertInfo.message}</span>
          </div>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultSelectedKey="transcribe">
        <Tabs.List aria-label="Documentation sections">
          <Tabs.Tab id="transcribe">
            <span className="inline-flex items-center gap-1.5">
              <Mic size={16} /> Audio & Transcription
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="templates">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={16} /> Clinical Templates
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="history">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={16} /> Encounter History
            </span>
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Real Audio & AI Transcription */}
        <Tabs.Panel id="transcribe">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
            {/* Audio Intake Card */}
            <Card className="p-4 lg:col-span-5 flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Mic className="text-primary" size={18} />
                  1. Capture Consultation Audio
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record verbatim doctor-patient conversation via browser microphone or upload an audio file.
                </p>
              </div>

              {/* Live Recorder UI */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex flex-col items-center justify-center gap-3">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-danger/20 text-danger animate-pulse ring-4 ring-danger/30'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isRecording ? <Mic size={28} /> : <Volume2 size={28} />}
                </div>

                <div className="text-center">
                  <div className="text-2xl font-mono font-semibold tracking-wider">
                    {formatSeconds(recordingSeconds)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isRecording
                      ? 'Recording audio stream via MediaRecorder...'
                      : audioBlob
                        ? 'Audio ready for transcription'
                        : 'Microphone inactive'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <Button
                      variant="primary"
                      onPress={startRecording}
                      className="flex items-center gap-1.5"
                    >
                      <Mic size={16} /> Start Recording
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      onPress={stopRecording}
                      className="flex items-center gap-1.5"
                    >
                      <MicOff size={16} /> Stop Recording
                    </Button>
                  )}
                </div>
              </div>

              {/* Audio File Upload Alternative */}
              <div className="border-t border-gray-200 dark:border-zinc-800 pt-3">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">
                  Or upload consultation recording (.webm, .wav, .mp3, .m4a):
                </label>
                <input
                  type="file"
                  accept="audio/*,.webm,.wav,.mp3,.m4a"
                  onChange={handleFileUpload}
                  disabled={isRecording}
                  className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
                />
                {uploadedFileName && (
                  <p className="text-xs text-success-600 mt-1 flex items-center gap-1">
                    <CheckCircle size={12} /> Loaded: {uploadedFileName}
                  </p>
                )}
              </div>

              {/* Audio Playback Review Player */}
              {audioUrl && (
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                    Playback Audio Preview:
                  </span>
                  <audio controls src={audioUrl} className="w-full h-8" />
                </div>
              )}

              {/* Action: Send to Gemini Flash */}
              <div className="mt-auto pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleTranscribeAudio}
                  isDisabled={!audioBlob || isRecording || isTranscribing}
                  className="flex items-center justify-center gap-2"
                >
                  {isTranscribing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Transcribing with Gemini Flash...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Transcribe Audio with Gemini Flash
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-gray-500 text-center mt-1.5">
                  Audio sent directly to server-side Gemini Flash API
                </p>
              </div>
            </Card>

            {/* Transcript Review & Edit Card */}
            <Card className="p-4 lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="text-primary" size={18} />
                    2. Verbatim Transcript & Clinician Review
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review and edit speaker-attributed dialogue before saving into the patient record.
                  </p>
                </div>

                {activeEncounter.transcriptConfidence ? (
                  <Badge color="success" variant="soft">
                    {(activeEncounter.transcriptConfidence * 100).toFixed(0)}% Confidence
                  </Badge>
                ) : null}
              </div>

              {/* Editable Transcript Area */}
              <div className="flex-1 flex flex-col">
                <textarea
                  value={editableTranscript}
                  onChange={(e) => setEditableTranscript(e.target.value)}
                  placeholder="Transcribed consultation audio will appear here verbatim for clinician review and editing..."
                  className="w-full flex-1 min-h-[340px] p-3 text-sm font-sans rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-y"
                />
              </div>

              {/* Clinician Review & Save Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-zinc-800">
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <User size={14} /> Clinician: {activeEncounter.clinicianId || 'doc-smith'}
                  {activeEncounter.reviewedAt && (
                    <span className="text-gray-400">
                      • Reviewed: {new Date(activeEncounter.reviewedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="primary"
                    onPress={handleSaveReviewedTranscript}
                    isDisabled={isSaving || !editableTranscript.trim()}
                    className="flex items-center gap-1.5"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Transcript'}
                  </Button>

                  <Button
                    variant="secondary"
                    onPress={handleExtractClinicalInformation}
                    isDisabled={isExtracting || !editableTranscript.trim()}
                    className="flex items-center gap-1.5"
                  >
                    {isExtracting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Extract Clinical Information
                      </>
                    )}
                  </Button>

                  <Button
                    variant="primary"
                    onPress={handleGenerateSoapNote}
                    isDisabled={isGeneratingSoap || !editableTranscript.trim()}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white"
                  >
                    {isGeneratingSoap ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Synthesizing SOAP...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate SOAP Note
                      </>
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    onPress={handleSuggestPrescriptions}
                    isDisabled={isSuggestingPrescriptions || !editableTranscript.trim()}
                    className="flex items-center gap-1.5"
                  >
                    {isSuggestingPrescriptions ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Suggesting Rx...
                      </>
                    ) : (
                      <>
                        <Pill size={16} />
                        Suggest Prescriptions
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Step 3: Extracted Clinical Information Section */}
          <Card className="p-5 mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">
                      3. Extracted Clinical Information
                    </h3>
                    {extraction ? (
                      <Badge color="success" variant="soft">
                        NLP Extracted
                      </Badge>
                    ) : (
                      <Badge color="default" variant="soft">
                        Awaiting Extraction
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Structured extraction of symptoms, findings, vitals, medications, allergies, and history from consultation transcript.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {extraction && (
                  <>
                    {!isEditingExtraction ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setIsEditingExtraction(true)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Edit3 size={14} />
                        Edit Entities
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => {
                            setExtraction(activeEncounter.extraction || null);
                            setIsEditingExtraction(false);
                          }}
                          className="flex items-center gap-1 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={handleSaveExtraction}
                          isDisabled={isSavingExtraction}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Save size={14} />
                          {isSavingExtraction ? 'Saving...' : 'Save Entities'}
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleExtractClinicalInformation}
                  isDisabled={isExtracting || !editableTranscript.trim()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Re-extract with Gemini
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!extraction ? (
              <div className="p-8 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center text-center gap-2">
                <Activity size={32} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  No clinical entities extracted for this encounter yet.
                </p>
                <p className="text-xs text-gray-500 max-w-md">
                  Capture audio or enter transcript above, then click &quot;Extract Clinical Information&quot; to parse symptoms, clinical findings, vital signs, medications, allergies, and history with Gemini NLP.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleExtractClinicalInformation}
                  isDisabled={isExtracting || !editableTranscript.trim()}
                  className="mt-2 flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  Extract Clinical Information Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Category 1: Symptoms */}
                <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={14} />
                      Symptoms & Complaints ({extraction.symptoms.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                    {extraction.symptoms.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">None reported</span>
                    ) : (
                      extraction.symptoms.map((symptom, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-800"
                        >
                          {symptom}
                          {isEditingExtraction && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntityItem('symptoms', idx)}
                              className="hover:text-red-500 ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingExtraction && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-sky-200 dark:border-sky-900/40">
                      <input
                        type="text"
                        placeholder="Add symptom..."
                        value={newSymptom}
                        onChange={(e) => setNewSymptom(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEntityItem('symptoms', newSymptom, setNewSymptom);
                          }
                        }}
                        className="text-xs flex-1 px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddEntityItem('symptoms', newSymptom, setNewSymptom)}
                        className="p-1 rounded bg-sky-600 text-white hover:bg-sky-700 text-xs"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category 2: Clinical Findings */}
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={14} />
                      Clinical Findings ({extraction.clinicalFindings.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                    {extraction.clinicalFindings.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No specific findings</span>
                    ) : (
                      extraction.clinicalFindings.map((finding, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800"
                        >
                          {finding}
                          {isEditingExtraction && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntityItem('clinicalFindings', idx)}
                              className="hover:text-red-500 ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingExtraction && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-indigo-200 dark:border-indigo-900/40">
                      <input
                        type="text"
                        placeholder="Add clinical finding..."
                        value={newFinding}
                        onChange={(e) => setNewFinding(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEntityItem('clinicalFindings', newFinding, setNewFinding);
                          }
                        }}
                        className="text-xs flex-1 px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddEntityItem('clinicalFindings', newFinding, setNewFinding)}
                        className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category 3: Vital Signs */}
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <HeartPulse size={14} />
                      Vital Signs ({extraction.vitals.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 min-h-[48px]">
                    {extraction.vitals.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No vitals documented</span>
                    ) : (
                      extraction.vitals.map((vital, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-2.5 py-1 rounded-md bg-rose-100/70 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs"
                        >
                          <span className="font-medium">{vital.name}:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">
                              {vital.value} {vital.unit || ''}
                            </span>
                            {isEditingExtraction && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVital(idx)}
                                className="hover:text-red-500"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {isEditingExtraction && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-rose-200 dark:border-rose-900/40">
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="text"
                          placeholder="Name (e.g. BP)"
                          value={newVitalName}
                          onChange={(e) => setNewVitalName(e.target.value)}
                          className="text-xs px-1.5 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 120/80)"
                          value={newVitalValue}
                          onChange={(e) => setNewVitalValue(e.target.value)}
                          className="text-xs px-1.5 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        />
                        <input
                          type="text"
                          placeholder="Unit (e.g. mmHg)"
                          value={newVitalUnit}
                          onChange={(e) => setNewVitalUnit(e.target.value)}
                          className="text-xs px-1.5 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVital}
                        className="mt-1 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 text-xs flex items-center justify-center gap-1"
                      >
                        <Plus size={12} /> Add Vital Sign
                      </button>
                    </div>
                  )}
                </div>

                {/* Category 4: Current Medications */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill size={14} />
                      Current Medications ({extraction.currentMedications.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                    {extraction.currentMedications.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">None mentioned</span>
                    ) : (
                      extraction.currentMedications.map((med, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                        >
                          {med}
                          {isEditingExtraction && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntityItem('currentMedications', idx)}
                              className="hover:text-red-500 ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingExtraction && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-emerald-200 dark:border-emerald-900/40">
                      <input
                        type="text"
                        placeholder="Add medication..."
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEntityItem('currentMedications', newMedication, setNewMedication);
                          }
                        }}
                        className="text-xs flex-1 px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddEntityItem('currentMedications', newMedication, setNewMedication)}
                        className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category 5: Allergies */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      Documented Allergies ({extraction.allergies.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                    {extraction.allergies.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No known allergies (NKDA)</span>
                    ) : (
                      extraction.allergies.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                        >
                          {allergy}
                          {isEditingExtraction && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntityItem('allergies', idx)}
                              className="hover:text-red-500 ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingExtraction && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-amber-200 dark:border-amber-900/40">
                      <input
                        type="text"
                        placeholder="Add allergy..."
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEntityItem('allergies', newAllergy, setNewAllergy);
                          }
                        }}
                        className="text-xs flex-1 px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddEntityItem('allergies', newAllergy, setNewAllergy)}
                        className="p-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category 6: Medical History */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <History size={14} />
                      Medical History ({extraction.history.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                    {extraction.history.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">None documented</span>
                    ) : (
                      extraction.history.map((hist, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                        >
                          {hist}
                          {isEditingExtraction && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntityItem('history', idx)}
                              className="hover:text-red-500 ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingExtraction && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Add medical history..."
                        value={newHistory}
                        onChange={(e) => setNewHistory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEntityItem('history', newHistory, setNewHistory);
                          }
                        }}
                        className="text-xs flex-1 px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddEntityItem('history', newHistory, setNewHistory)}
                        className="p-1 rounded bg-slate-700 text-white hover:bg-slate-800 text-xs"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Step 4: Structured SOAP Clinical Progress Note */}
          <Card className="p-5 mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">
                      4. Structured SOAP Clinical Progress Note
                    </h3>
                    {soapNote ? (
                      soapNote.isReviewed ? (
                        <Badge color="success" variant="soft">
                          Clinician Reviewed
                        </Badge>
                      ) : (
                        <Badge color="warning" variant="soft">
                          AI Draft (Unreviewed)
                        </Badge>
                      )
                    ) : (
                      <Badge color="default" variant="soft">
                        Awaiting Synthesis
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Standardized four-quadrant clinical progress documentation synthesized from consultation dialogue and verified extraction facts.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {soapNote && (
                  <>
                    {!isEditingSoap ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setIsEditingSoap(true)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Edit3 size={14} />
                        Edit Note
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => {
                            if (activeEncounter.soapNote) {
                              setSoapSubjective(activeEncounter.soapNote.subjective);
                              setSoapObjective(activeEncounter.soapNote.objective);
                              setSoapAssessment(activeEncounter.soapNote.assessment);
                              setSoapPlan(activeEncounter.soapNote.plan);
                            }
                            setIsEditingSoap(false);
                          }}
                          className="flex items-center gap-1 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={handleSaveSoapNote}
                          isDisabled={isSavingSoap}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Save size={14} />
                          {isSavingSoap ? 'Saving...' : 'Save SOAP Note'}
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleGenerateSoapNote}
                  isDisabled={isGeneratingSoap || !editableTranscript.trim()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  {isGeneratingSoap ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      {soapNote ? 'Re-synthesize with Gemini' : 'Generate SOAP Note'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!soapNote ? (
              <div className="p-8 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center text-center gap-2">
                <FileText size={32} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  No SOAP note generated for this encounter yet.
                </p>
                <p className="text-xs text-gray-500 max-w-md">
                  Synthesize the reviewed consultation dialogue and extracted clinical entities into standardized Subjective, Objective, Assessment, and Plan documentation using Gemini.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleGenerateSoapNote}
                  isDisabled={isGeneratingSoap || !editableTranscript.trim()}
                  className="mt-2 flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  Generate SOAP Note with Gemini
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subjective (S) */}
                  <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1 border-b border-sky-200/60 dark:border-sky-900/40">
                      <span className="text-xs font-bold text-sky-800 dark:text-sky-300 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[11px] font-bold">
                          S
                        </span>
                        Subjective
                      </span>
                      <span className="text-[11px] text-gray-500">Chief Complaint & HPI</span>
                    </div>
                    {isEditingSoap ? (
                      <textarea
                        value={soapSubjective}
                        onChange={(e) => setSoapSubjective(e.target.value)}
                        placeholder="Patient's reported symptoms, chronology, and complaints..."
                        className="w-full min-h-[140px] p-2.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed resize-y"
                      />
                    ) : (
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line min-h-[100px]">
                        {soapSubjective || <span className="italic text-gray-400">No subjective notes</span>}
                      </p>
                    )}
                  </div>

                  {/* Objective (O) */}
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60 dark:border-emerald-900/40">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                          O
                        </span>
                        Objective
                      </span>
                      <span className="text-[11px] text-gray-500">Exam, Vitals & Observations</span>
                    </div>
                    {isEditingSoap ? (
                      <textarea
                        value={soapObjective}
                        onChange={(e) => setSoapObjective(e.target.value)}
                        placeholder="Physical exam observations, vital signs, physical state..."
                        className="w-full min-h-[140px] p-2.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
                      />
                    ) : (
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line min-h-[100px]">
                        {soapObjective || <span className="italic text-gray-400">No objective notes</span>}
                      </p>
                    )}
                  </div>

                  {/* Assessment (A) */}
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/60 dark:border-amber-900/40">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-bold">
                          A
                        </span>
                        Assessment
                      </span>
                      <span className="text-[11px] text-gray-500">Clinical Status Evaluation</span>
                    </div>
                    {isEditingSoap ? (
                      <textarea
                        value={soapAssessment}
                        onChange={(e) => setSoapAssessment(e.target.value)}
                        placeholder="Clinical synthesis of patient status during encounter..."
                        className="w-full min-h-[140px] p-2.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed resize-y"
                      />
                    ) : (
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line min-h-[100px]">
                        {soapAssessment || <span className="italic text-gray-400">No assessment documented</span>}
                      </p>
                    )}
                  </div>

                  {/* Plan (P) */}
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1 border-b border-purple-200/60 dark:border-purple-900/40">
                      <span className="text-xs font-bold text-purple-800 dark:text-purple-300 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold">
                          P
                        </span>
                        Plan
                      </span>
                      <span className="text-[11px] text-gray-500">Management & Follow-up</span>
                    </div>
                    {isEditingSoap ? (
                      <textarea
                        value={soapPlan}
                        onChange={(e) => setSoapPlan(e.target.value)}
                        placeholder="Care plan, ongoing medications, orders, counseling, and follow-up timeline..."
                        className="w-full min-h-[140px] p-2.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-y"
                      />
                    ) : (
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line min-h-[100px]">
                        {soapPlan || <span className="italic text-gray-400">No plan documented</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Review Status & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <User size={14} />
                    <span>Attending: {activeEncounter.clinicianId || 'doc-smith'}</span>
                    {soapNote.reviewedAt && (
                      <span>
                        • Last Saved:{' '}
                        {new Date(soapNote.reviewedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingSoap ? (
                      <Button
                        variant="primary"
                        onPress={handleSaveSoapNote}
                        isDisabled={isSavingSoap}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Save size={14} />
                        {isSavingSoap ? 'Saving...' : 'Save & Verify SOAP Note'}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setIsEditingSoap(true)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Edit3 size={14} />
                        Edit SOAP Sections
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Step 5: Prescription Management Section */}
          <Card className="p-5 mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Pill size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">
                      5. Prescription Management
                    </h3>
                    <Badge color="default" variant="soft">
                      {prescriptions.length} Total
                    </Badge>
                    <Badge color="success" variant="soft">
                      {prescriptions.filter((p) => p.status === 'approved').length} Approved
                    </Badge>
                    <Badge color="warning" variant="soft">
                      {prescriptions.filter((p) => p.status === 'suggested').length} Suggested
                    </Badge>
                    {prescriptions.some((p) => p.status === 'rejected') && (
                      <Badge color="danger" variant="soft">
                        {prescriptions.filter((p) => p.status === 'rejected').length} Rejected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    AI-assisted medication recommendations with strict allergy safety checks and clinician review.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowAddPrescription((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Plus size={14} />
                  {showAddPrescription ? 'Close Form' : 'Add Medication'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleSuggestPrescriptions}
                  isDisabled={isSuggestingPrescriptions || !editableTranscript.trim()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  {isSuggestingPrescriptions ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Suggesting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Suggest with Gemini
                    </>
                  )}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleSavePrescriptions}
                  isDisabled={isSavingPrescriptions}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save size={14} />
                  {isSavingPrescriptions ? 'Saving...' : 'Save Prescriptions'}
                </Button>
              </div>
            </div>

            {/* Manual Add Prescription Panel */}
            {showAddPrescription && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-200/50 dark:border-emerald-900/30">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} />
                    Add Prescription Order
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddPrescription(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="flex flex-col gap-1 lg:col-span-2">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Medication Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amoxicillin, Lisinopril..."
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 500 mg, 20 mg..."
                      value={newMedDosage}
                      onChange={(e) => setNewMedDosage(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Route
                    </label>
                    <select
                      value={newMedRoute}
                      onChange={(e) => setNewMedRoute(e.target.value)}
                      className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="oral">Oral</option>
                      <option value="sublingual">Sublingual</option>
                      <option value="IV">IV</option>
                      <option value="inhalation">Inhalation</option>
                      <option value="topical">Topical</option>
                      <option value="subcutaneous">Subcutaneous</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Frequency
                    </label>
                    <select
                      value={newMedFrequency}
                      onChange={(e) => setNewMedFrequency(e.target.value)}
                      className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="once daily">Once daily</option>
                      <option value="twice daily">Twice daily</option>
                      <option value="three times daily">Three times daily</option>
                      <option value="four times daily">Four times daily</option>
                      <option value="every 4-6 hours PRN">Every 4-6 hours PRN</option>
                      <option value="at bedtime">At bedtime</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 7 days, 30 days..."
                      value={newMedDuration}
                      onChange={(e) => setNewMedDuration(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1 lg:col-span-5">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      Instructions & Warnings
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Take with food; do not take with grapefruit juice..."
                      value={newMedInstructions}
                      onChange={(e) => setNewMedInstructions(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-end justify-end lg:col-span-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleAddManualPrescription}
                      className="w-full text-xs flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus size={14} />
                      Add to Rx
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Prescriptions List / Table */}
            {prescriptions.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center text-center gap-2">
                <Pill size={32} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  No prescriptions documented for this encounter yet.
                </p>
                <p className="text-xs text-gray-500 max-w-md">
                  Synthesize personalized prescription recommendations based on the encounter dialogue, clinical extraction, and SOAP plan, with automatic allergy contraindication checks.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleSuggestPrescriptions}
                    isDisabled={isSuggestingPrescriptions || !editableTranscript.trim()}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Sparkles size={14} />
                    Suggest Prescriptions with Gemini
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setShowAddPrescription(true)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Plus size={14} />
                    Add Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="divide-y divide-gray-200 dark:divide-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5">
                          {rx.status === 'approved' ? (
                            <Badge color="success" variant="soft" className="text-[11px] flex items-center gap-1 font-semibold">
                              <Check size={12} /> Approved
                            </Badge>
                          ) : rx.status === 'rejected' ? (
                            <Badge color="danger" variant="soft" className="text-[11px] flex items-center gap-1 font-semibold">
                              <Ban size={12} /> Rejected
                            </Badge>
                          ) : (
                            <Badge color="warning" variant="soft" className="text-[11px] flex items-center gap-1 font-semibold">
                              <Sparkles size={12} /> Suggested
                            </Badge>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              {rx.medication}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                              {rx.dosage}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 uppercase">
                              {rx.route}
                            </span>
                            <span className="text-xs text-gray-500">
                              • {rx.frequency}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({rx.duration})
                            </span>
                          </div>
                          {rx.instructions && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                              Instructions: {rx.instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {rx.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => handleApprovePrescription(rx.id)}
                            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs flex items-center gap-1 px-2.5 h-8"
                          >
                            <Check size={14} />
                            Approve
                          </Button>
                        )}
                        {rx.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => handleRejectPrescription(rx.id)}
                            className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs flex items-center gap-1 px-2.5 h-8"
                          >
                            <Ban size={14} />
                            Reject
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => handleDeletePrescription(rx.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs p-1.5 h-8 w-8 min-w-0"
                          aria-label="Delete medication"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Tabs.Panel>

        {/* Tab 2: Clinical Consultation Templates */}
        <Tabs.Panel id="templates">
          <Card className="p-4 mt-3">
            <h3 className="font-medium text-base mb-2">Standard Clinical Note Templates</h3>
            <p className="text-xs text-gray-500 mb-3">
              Apply standard structured formats to your clinical notes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  name: 'Emergency H&P Template',
                  desc: 'History of Present Illness, Vitals, Physical Exam, and Initial Disposition.',
                },
                {
                  name: 'Inpatient Daily Progress Note',
                  desc: 'Interval history, objective clinical metrics, assessment, and care plan.',
                },
                {
                  name: 'Outpatient Follow-up Template',
                  desc: 'Chronic disease management, medication adherence, and interval changes.',
                },
              ].map((tpl) => (
                <div
                  key={tpl.name}
                  className="p-3.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-sm">{tpl.name}</span>
                    <p className="text-xs text-gray-500 mt-1">{tpl.desc}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setEditableTranscript(
                        (prev) =>
                          `${prev}\n\n[Clinical Template: ${tpl.name}]\nSubjective:\nObjective:\nAssessment:\nPlan:`,
                      );
                      setAlertInfo({
                        type: 'default',
                        message: `Appended ${tpl.name} structure into transcript editor.`,
                      });
                    }}
                    className="mt-2 text-xs"
                  >
                    Insert Template
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Tabs.Panel>

        {/* Tab 3: Encounter History */}
        <Tabs.Panel id="history">
          <Card className="p-4 mt-3">
            <h3 className="font-medium text-base mb-2">Clinical Encounter Log</h3>
            <p className="text-xs text-gray-500 mb-3">
              Select any past encounter to inspect or update its consultation transcript.
            </p>
            <div className="flex flex-col gap-2">
              {encounters.map((enc) => (
                <div
                  key={enc.id}
                  onClick={() => setSelectedEncounterId(enc.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                    enc.id === activeEncounter.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-semibold">
                      #{enc.patientId}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{enc.id}</span>
                        <span className="text-xs text-gray-500 uppercase">
                          ({enc.type})
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {enc.rawTranscript
                          ? enc.rawTranscript.substring(0, 80) + '...'
                          : 'No audio transcribed yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(enc.dateTime).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge
                      color={getStatusBadgeVariant(enc.status)}
                      variant="soft"
                    >
                      {enc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
