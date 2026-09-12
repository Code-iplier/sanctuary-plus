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
} from 'lucide-react';

export type EncounterStatus = 'draft' | 'reviewed' | 'finalized';
export type EncounterType =
  | 'inpatient'
  | 'outpatient'
  | 'emergency'
  | 'telehealth'
  | 'ambulatory';

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

  // Load active encounter transcript into editor
  useEffect(() => {
    if (activeEncounter) {
      setEditableTranscript(activeEncounter.rawTranscript || '');
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
              Phase 2: Verbatim doctor-patient audio capture & Gemini Flash transcription
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

                <Button
                  variant="primary"
                  onPress={handleSaveReviewedTranscript}
                  isDisabled={isSaving || !editableTranscript.trim()}
                  className="flex items-center gap-1.5 w-full sm:w-auto"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Reviewed Transcript'}
                </Button>
              </div>
            </Card>
          </div>
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
