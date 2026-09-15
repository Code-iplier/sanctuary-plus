import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Mic, PhoneOff, Radio } from 'lucide-react';
import type { Session } from '../queue/types';
import { appendTranscript, createKioskSession, generateKioskReport, getActivePatientEncounter, issueGeminiLiveToken, updateKioskState, verifyKioskIntake } from '../medikiosk/api';
import { clinicalValueFromText, editableClinicalValue, REPORT_FIELDS } from '../medikiosk/presentation';

type Props = { session: Extract<Session, { role: 'patient' }> };
type LiveState = 'ready' | 'connecting' | 'speaking' | 'listening' | 'processing' | 'error' | 'complete';

const INTERVIEW_QUESTIONS = [
  { stage: 'CHIEF_COMPLAINT', text: 'What is the main problem that brings you to the hospital today?' },
  { stage: 'CURRENT_PROBLEM', text: 'How long has it been going on?' },
  { stage: 'MEDICAL_HISTORY', text: 'Do you have any known medical conditions, previous major illnesses, hospitalizations, or surgeries?' },
  { stage: 'MEDICATIONS_ALLERGIES', text: 'What medicines are you taking or have recently taken, and do you have any medicine or food allergies or reactions?' },
  { stage: 'FAMILY_LIFESTYLE', text: 'Is there any relevant family medical history or lifestyle information, such as smoking, tobacco, alcohol, occupation, diet, or activity, that your doctor should know?' },
  { stage: 'VERIFICATION', text: 'Is there any other important medical information you want your doctor to know?' },
] as const;
const SUPPORTED_INDIAN_LANGUAGE_CODES = ['en-IN', 'as-IN', 'bn-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'or-IN', 'pa-IN', 'ta-IN', 'te-IN', 'ur-IN'];
const SYSTEM_INSTRUCTION = `You are MediKiosk. Have one short, polite medical-history conversation for the doctor. Collect only what the patient says. Do not diagnose, prescribe, give treatment advice, invent facts, or discuss unrelated topics.

LANGUAGE: Start in simple English. If the patient asks for or clearly uses a supported Indian language, switch to that language and stay there: Assamese, Bengali/Bangla, Gujarati, Hindi/Hinglish, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, or Urdu. Never use another language, never switch without the patient choosing it, and never mix scripts or translate one question into several languages. If unsure, use simple English. A request to change language is not an answer to the medical question: acknowledge it briefly and ask the current question again in the chosen language.

ASK IN THIS ORDER, ONE QUESTION AT A TIME:
1. ${INTERVIEW_QUESTIONS[0].text}
2. ${INTERVIEW_QUESTIONS[1].text}
3. ${INTERVIEW_QUESTIONS[2].text}
4. ${INTERVIEW_QUESTIONS[3].text}
5. ${INTERVIEW_QUESTIONS[4].text}
6. ${INTERVIEW_QUESTIONS[5].text}

The server tells you the current question. Call update_clinical_state after each medical answer and wait for its response. Use the exact questionIndex supplied by the server. Use only this session's patient transcript. If the patient already gave an answer earlier, keep it and do not ask for it again. A clear answer, denial, unknown, or none is satisfactory. If one detail is missing, ask only one short follow-up about that detail; there can be no more than three follow-ups total. If the patient goes off-topic, politely redirect to the current question. Never ask two questions in one turn. Never repeat a question after the server accepts it. Use the server's nextQuestionText or followUpQuestionText exactly once.

After all six areas are accepted, stop asking questions. Say a brief thank-you, tell the patient to review the captured details, and call request_verification. Do not continue speaking after the verification request. Record only patient-reported facts and use conservative evidence confidence.`;
const LIVE_TOOLS = [{ functionDeclarations: [
  {
    name: 'update_clinical_state',
    description: 'Persist patient-reported clinical intake facts and the current interview stage. Never infer a fact the patient did not state.',
    parameters: { type: 'OBJECT', properties: {
      stage: { type: 'STRING', enum: ['CHIEF_COMPLAINT', 'CURRENT_PROBLEM', 'MEDICAL_HISTORY', 'MEDICATIONS_ALLERGIES', 'FAMILY_LIFESTYLE', 'VERIFICATION'] },
      clinicalState: { type: 'OBJECT', description: 'Only facts stated by the patient, preserving unknown values.' },
      factEvidence: { type: 'OBJECT', description: 'For each changed clinicalState key, provide only the spoken language BCP-47 tag and extraction confidence from 0 to 1. Do not invent evidence.' },
      missingDetail: { type: 'STRING', description: 'Required only when answerAccepted is false: the one specific clinical detail still missing.' },
      safetySignals: { type: 'ARRAY', items: { type: 'OBJECT' } },
      questionIndex: { type: 'INTEGER', minimum: 0, maximum: 5 },
      answerAccepted: { type: 'BOOLEAN', description: 'Set true for any clear duration, denial, unknown, none, or complete answer. Set false only if one clinically necessary detail in this same core question is missing.' },
    }, required: ['clinicalState', 'questionIndex', 'answerAccepted'] },
  },
  {
    name: 'request_verification',
    description: 'Ask the patient to verify a concise summary of the collected history before the intake is completed.',
    parameters: { type: 'OBJECT', properties: { summary: { type: 'STRING' } }, required: ['summary'] },
  },
  {
    name: 'complete_interview',
    description: 'Use only after the patient has confirmed the summary.',
    parameters: { type: 'OBJECT', properties: {} },
  },
] }];

function downsample(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) return input;
  const ratio = sourceRate / targetRate;
  const output = new Float32Array(Math.round(input.length / ratio));
  for (let i = 0; i < output.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = sum / Math.max(1, end - start);
  }
  return output;
}

function pcm16(input: Float32Array): string {
  const bytes = new Uint8Array(input.length * 2);
  const view = new DataView(bytes.buffer);
  input.forEach((sample, index) => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  });
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function decodePcm16(value: string): Int16Array {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const samples = new Int16Array(Math.floor(bytes.byteLength / 2));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true);
  }
  return samples;
}

function joinTranscriptFragment(existing: string, fragment: string): string {
  const next = fragment.trim();
  if (!existing) return next;
  if (!next) return existing;
  if (/^[,.;:!?%\)\]\}]/.test(next) || /[\(\[\{/]$/.test(existing)) return `${existing}${next}`;
  return /\s$/.test(existing) ? `${existing}${next}` : `${existing} ${next}`;
}

function sampleRateFromMimeType(mimeType: unknown): number {
  const match = String(mimeType ?? '').match(/rate=(\d+)/i);
  const rate = match ? Number(match[1]) : 24000;
  return Number.isFinite(rate) && rate > 0 ? rate : 24000;
}

export default function MediKioskPage({ session }: Props) {
  const [state, setState] = useState<LiveState>('ready');
  const [message, setMessage] = useState('Tap Start voice intake when you are ready.');
  const [stage, setStage] = useState('Question 1 of 6');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Array<{ speaker: 'PATIENT' | 'ASSISTANT'; text: string }>>([]);
  const [liveRun, setLiveRun] = useState(0);
  const questionIndexRef = useRef(0);
  const transcriptWriteRef = useRef<Promise<void>>(Promise.resolve());
  const pendingTranscriptRef = useRef<{ kioskId: string; speaker: 'PATIENT' | 'ASSISTANT'; text: string } | null>(null);
  const transcriptFlushTimerRef = useRef<number | null>(null);
  const kioskSessionRef = useRef<string | null>(null);
  const terminalTurnRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTimeRef = useRef(0);
  const resumptionHandleRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const toolCallWorkRef = useRef<Promise<void>>(Promise.resolve());

  const stopAudio = () => {
    outputSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    outputSourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
  };

  const appendLiveTranscript = (speaker: 'PATIENT' | 'ASSISTANT', text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setConversation((current) => {
      const last = current[current.length - 1];
      if (last?.speaker === speaker) {
        return [...current.slice(0, -1), { ...last, text: joinTranscriptFragment(last.text, clean) }];
      }
      return [...current, { speaker, text: clean }];
    });
  };

  const commitPendingTranscript = () => {
    const pending = pendingTranscriptRef.current;
    if (!pending) return;
    pendingTranscriptRef.current = null;
    transcriptWriteRef.current = transcriptWriteRef.current
      .catch(() => undefined)
      .then(async () => {
        await appendTranscript(session.accessToken ?? '', pending.kioskId, { speaker: pending.speaker, text: pending.text });
      });
  };

  const persistTranscript = (kioskId: string, speaker: 'PATIENT' | 'ASSISTANT', text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const pending = pendingTranscriptRef.current;
    if (pending && (pending.kioskId !== kioskId || pending.speaker !== speaker)) commitPendingTranscript();
    const current = pendingTranscriptRef.current;
    pendingTranscriptRef.current = current
      ? { ...current, text: joinTranscriptFragment(current.text, clean) }
      : { kioskId, speaker, text: clean };
    if (transcriptFlushTimerRef.current !== null) window.clearTimeout(transcriptFlushTimerRef.current);
    transcriptFlushTimerRef.current = window.setTimeout(() => {
      transcriptFlushTimerRef.current = null;
      commitPendingTranscript();
    }, 450);
  };

  const flushTranscript = async () => {
    if (transcriptFlushTimerRef.current !== null) {
      window.clearTimeout(transcriptFlushTimerRef.current);
      transcriptFlushTimerRef.current = null;
    }
    commitPendingTranscript();
    await transcriptWriteRef.current.catch(() => undefined);
  };

  useEffect(() => {
    if (liveRun === 0) return;
    let cancelled = false;
    endedRef.current = false;
    terminalTurnRef.current = false;
    toolCallWorkRef.current = Promise.resolve();
    const start = async () => {
      try {
        const encounter = await getActivePatientEncounter(session.accessToken ?? '', session.patientId);
        if (!encounter?.id) {
          setState('error');
          setMessage('Please generate a token before starting the kiosk intake.');
          return;
        }
        if (cancelled) return;
        setEncounterId(encounter.id);
        // Every explicit Start action is a new blank patient conversation.
        // Reconnects within this run keep using kiosk.id and never call this
        // endpoint, so an accepted answer is still preserved in-session.
        const kiosk = await createKioskSession(session.accessToken ?? '', encounter.id, undefined, true);
        const resumedQuestionIndex = Math.max(0, Math.min(6, kiosk.questionIndex ?? 0));
        setSessionId(kiosk.id);
        kioskSessionRef.current = kiosk.id;
        questionIndexRef.current = resumedQuestionIndex;
        setQuestionIndex(resumedQuestionIndex);
        setStage(resumedQuestionIndex >= 6 ? 'Reviewing your six answers' : `Question ${resumedQuestionIndex + 1} of 6`);
        setConversation((kiosk.transcript ?? []).reduce<Array<{ speaker: 'PATIENT' | 'ASSISTANT'; text: string }>>((turns, entry) => {
          const speaker = entry.speaker === 'ASSISTANT' ? 'ASSISTANT' : 'PATIENT';
          const text = entry.text.trim();
          if (!text) return turns;
          const last = turns[turns.length - 1];
          if (last?.speaker === speaker) {
            return [...turns.slice(0, -1), { ...last, text: joinTranscriptFragment(last.text, text) }];
          }
          return [...turns, { speaker, text }];
        }, []));
        if (resumedQuestionIndex >= INTERVIEW_QUESTIONS.length) {
          const draft = await generateKioskReport(session.accessToken ?? '', kiosk.id);
          if (cancelled) return;
          const generated = draft as { report?: Record<string, unknown> };
          setReport(generated.report ?? generated);
          setNeedsVerification(true);
          setState('complete');
          setMessage('Please check the captured details before the hospital report is generated.');
          return;
        }
        const live = await issueGeminiLiveToken(session.accessToken ?? '', kiosk.id);
        let audioContext = audioContextRef.current;
        if (!audioContext || audioContext.state === 'closed') {
          audioContext = new AudioContext();
          audioContextRef.current = audioContext;
        }
        await audioContext.resume();
        setMessage('Allow microphone access to begin the voice intake…');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
        streamRef.current = stream;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(1024, 1, 1);
        processorRef.current = processor;
        const stopMicrophone = () => {
          processorRef.current?.disconnect();
          streamRef.current?.getTracks().forEach((track) => track.stop());
        };
        const finishForVerification = async () => {
          if (terminalTurnRef.current) return;
          terminalTurnRef.current = true;
          stopMicrophone();
          await flushTranscript();
          const draft = await generateKioskReport(session.accessToken ?? '', kiosk.id) as { report?: Record<string, unknown> };
          if (cancelled) return;
          setReport(draft.report ?? draft);
          setNeedsVerification(true);
          setState('complete');
          setMessage('Please check the captured details before the hospital report is generated.');
        };
        let liveSetupReady = false;
        const connectLive = (handle?: string) => {
          if (cancelled || endedRef.current) return;
          const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(live.token)}`);
          socketRef.current = socket;
          socket.onopen = () => {
            toolCallWorkRef.current = Promise.resolve();
            liveSetupReady = false;
            reconnectAttemptsRef.current = 0;
            socket.send(JSON.stringify({ setup: {
              model: `models/${live.model}`,
              generationConfig: { responseModalities: ['AUDIO'] },
              sessionResumption: handle ? { handle } : {},
              inputAudioTranscription: { languageCodes: SUPPORTED_INDIAN_LANGUAGE_CODES, mode: 'VERBATIM' },
              outputAudioTranscription: {},
              tools: LIVE_TOOLS,
              systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            } }));
            void audioContext.resume().catch(() => {
              setMessage('Tap Start voice intake again to enable the speaker.');
            });
          };
          socket.onmessage = async (event) => {
          const raw = typeof event.data === 'string' ? event.data : await event.data.text();
          const payload = JSON.parse(raw) as any;
          if (payload.setupComplete) {
            liveSetupReady = true;
            if (!handle) {
              const openingInstruction = resumedQuestionIndex === 0
                ? `Begin the intake automatically. Greet the patient and ask exactly: ${INTERVIEW_QUESTIONS[0].text}`
                : `This is a resumed intake. The server has already accepted core questions 1 through ${resumedQuestionIndex}. Do not ask any earlier question or repeat an accepted answer. Greet the patient briefly and ask exactly: ${INTERVIEW_QUESTIONS[resumedQuestionIndex].text}`;
              socket.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: openingInstruction }] }], turnComplete: true } }));
            }
            setState('speaking');
            setMessage(handle ? 'MediKiosk reconnected. Continuing your intake…' : 'MediKiosk is speaking…');
          }
          const newHandle = payload.sessionResumptionUpdate?.newHandle;
          if (newHandle) resumptionHandleRef.current = String(newHandle);
          if (payload.goAway) setMessage('This session is renewing securely…');
          const content = payload.serverContent;
          const inputText = content?.inputTranscription?.text;
          const outputText = content?.outputTranscription?.text;
          if (inputText) {
            appendLiveTranscript('PATIENT', inputText);
            persistTranscript(kiosk.id, 'PATIENT', inputText);
          }
          if (outputText) {
            // Live output transcription arrives as small deltas. Show and save
            // each delta immediately so the patient is never left waiting for
            // a turn-complete event before hearing or seeing a response.
            appendLiveTranscript('ASSISTANT', outputText);
            persistTranscript(kiosk.id, 'ASSISTANT', outputText);
          }
          const functionCall = payload.toolCall?.functionCalls?.[0];
          if (functionCall) {
            const args = functionCall.args ?? {};
            toolCallWorkRef.current = toolCallWorkRef.current.then(async () => {
              let result: unknown = { status: 'ok' };
              if (functionCall.name === 'update_clinical_state') {
                // inputTranscription and the model tool call can arrive in the same WebSocket turn.
                // Flush the patient phrase first so the fact can link to the exact wording.
                await flushTranscript();
                const accepted = args.answerAccepted === true;
                const submittedIndex = Number.isInteger(args.questionIndex) ? Math.max(0, Math.min(5, Number(args.questionIndex))) : questionIndexRef.current;
                const progress = await updateKioskState(session.accessToken ?? '', kiosk.id, {
                  currentStage: args.stage,
                  questionIndex: submittedIndex,
                  answerAccepted: accepted,
                  missingDetail: args.missingDetail,
                  clinicalState: args.clinicalState,
                  factEvidence: args.factEvidence,
                  safetySignals: args.safetySignals,
                });
                const nextIndex = Number((progress as any).interview?.currentQuestionIndex ?? submittedIndex);
                questionIndexRef.current = nextIndex;
                setQuestionIndex(nextIndex);
                const interview = (progress as any).interview;
                setStage(nextIndex >= 6 ? 'Reviewing your six answers' : !accepted && interview?.followUpAllowed ? `Follow-up ${interview.followUpCount} of 3 for question ${submittedIndex + 1}` : `Question ${nextIndex + 1} of 6`);
                result = (progress as any).interview ?? { currentQuestionIndex: nextIndex };
              } else if (functionCall.name === 'complete_interview') {
                await finishForVerification();
              } else if (functionCall.name === 'request_verification') {
                await finishForVerification();
              }
              if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: functionCall.id, name: functionCall.name, response: { result } }] } }));
            }).catch(() => setMessage('We saved your answers but could not update the live interview state.'));
          }
          if (content?.interrupted) {
            stopAudio();
            setState('listening');
          }
          if (content?.modelTurn?.parts) {
            setState('speaking');
            content.modelTurn.parts.forEach((part: any) => {
              const data = part.inlineData?.data;
              if (!data || !audioContextRef.current) return;
              try {
                const pcm = decodePcm16(data);
                if (!pcm.length) return;
                const sampleRate = sampleRateFromMimeType(part.inlineData?.mimeType);
                const buffer = audioContextRef.current.createBuffer(1, pcm.length, sampleRate);
                const channel = buffer.getChannelData(0);
                pcm.forEach((sample, index) => { channel[index] = sample / 32768; });
                const output = audioContextRef.current.createBufferSource();
                output.buffer = buffer;
                output.connect(audioContextRef.current.destination);
                const startAt = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
                nextPlayTimeRef.current = startAt + buffer.duration;
                outputSourcesRef.current.add(output);
                output.onended = () => outputSourcesRef.current.delete(output);
                output.start(startAt);
              } catch {
                setMessage('We could not play one response. Please continue speaking; your answers are still being saved.');
              }
            });
          }
          if (content?.turnComplete) {
            if (terminalTurnRef.current) {
              void flushTranscript().finally(() => {
                endedRef.current = true;
                socket.close(1000, 'MediKiosk intake complete');
                window.setTimeout(() => {
                  stopAudio();
                  void audioContextRef.current?.close();
                }, 1200);
              });
            } else if (questionIndexRef.current >= INTERVIEW_QUESTIONS.length) {
              // The model normally calls request_verification. This guard covers a
              // closing spoken turn that arrives without the tool call, so the
              // microphone cannot remain open after the six-question interview.
              void finishForVerification().catch(() => {
                setState('error');
                setMessage('Your six answers were saved, but the review screen could not be opened.');
              });
            } else {
              setState('listening');
              setMessage('Listening… speak naturally.');
            }
          }
          };
          socket.onerror = () => {
            if (!resumptionHandleRef.current) {
              setState('error');
              setMessage('The live connection failed. Your saved answers remain available.');
            }
          };
          socket.onclose = () => {
            if (cancelled || endedRef.current || terminalTurnRef.current) return;
            const resumeHandle = resumptionHandleRef.current;
            if (resumeHandle && reconnectAttemptsRef.current < 3) {
              reconnectAttemptsRef.current += 1;
              setState('connecting');
              setMessage('Answers saved. Reconnecting securely…');
              reconnectTimerRef.current = window.setTimeout(() => connectLive(resumeHandle), 500 * reconnectAttemptsRef.current);
            } else {
              setState('error');
              setMessage('The live connection failed. Your saved answers remain available.');
            }
          };
        };
        connectLive();
        processor.onaudioprocess = (event) => {
          if (terminalTurnRef.current || endedRef.current) return;
          const socket = socketRef.current;
          if (!socket || socket.readyState !== WebSocket.OPEN || !liveSetupReady) return;
          const samples = downsample(event.inputBuffer.getChannelData(0), audioContext.sampleRate, 16000);
          socket.send(JSON.stringify({ realtimeInput: { audio: { data: pcm16(samples), mimeType: 'audio/pcm;rate=16000' } } }));
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (error) {
        setState('error');
        setMessage(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone access is required for the voice intake.' : 'Unable to start the kiosk intake.');
      }
    };
    void start();
    return () => {
      cancelled = true;
      endedRef.current = true;
      if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
      void flushTranscript();
      socketRef.current?.close();
      processorRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
      stopAudio();
    };
  }, [liveRun, session.accessToken, session.patientId]);

  const startVoiceIntake = () => {
    endedRef.current = false;
    terminalTurnRef.current = false;
    resumptionHandleRef.current = null;
    reconnectAttemptsRef.current = 0;
    stopAudio();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
    const context = new AudioContext();
    audioContextRef.current = context;
    void context.resume().catch(() => undefined);
    setState('connecting');
    setMessage('Starting your private voice intake…');
    setLiveRun((current) => current + 1);
  };

  const endConversation = async () => {
    endedRef.current = true;
    if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
    socketRef.current?.close();
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    stopAudio();
    setLiveRun(0);
    if (sessionId) {
      await flushTranscript().catch(() => undefined);
      await updateKioskState(session.accessToken ?? '', sessionId, { status: 'PAUSED' }).catch(() => undefined);
      if (questionIndex < 6) {
        setState('ready');
        setMessage(`Your answers are saved. You have completed ${questionIndex} of 6 core questions; tap Start voice intake to continue later.`);
        return;
      }
      const draft = await generateKioskReport(session.accessToken ?? '', sessionId).catch(() => null) as { report?: Record<string, unknown> } | null;
      if (draft) {
        setReport(draft.report ?? draft);
      }
      setNeedsVerification(true);
    }
    setState('complete');
    setMessage('Your answers are saved. Please verify the history below.');
  };

  const verify = async () => {
    if (!sessionId) return;
    try {
      const parsed = report ?? {};
      const finalized = await verifyKioskIntake(session.accessToken ?? '', sessionId, parsed);
      setReport((finalized.report.report as Record<string, unknown> | undefined) ?? parsed);
      setPdfUrl(`data:${finalized.pdf.mimeType};base64,${finalized.pdf.base64}`);
      setNeedsVerification(false);
      setMessage('Thank you. Your report has been sent to the doctor.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to verify the intake.');
    }
  };

  return (
    <section className="max-w-3xl mx-auto min-h-[620px] flex items-center justify-center">
      <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-8 sm:p-12 text-center">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-bold text-teal-700"><Radio className="h-4 w-4" /> MediKiosk <span className="rounded-full bg-teal-50 px-2 py-1 tracking-normal">{state}</span></div>
        <div className={`mx-auto my-12 h-32 w-32 rounded-full flex items-center justify-center shadow-inner ${state === 'speaking' ? 'bg-teal-500 animate-pulse' : state === 'error' ? 'bg-rose-100' : 'bg-teal-50'}`}>
          {state === 'error' ? <AlertTriangle className="h-12 w-12 text-rose-600" /> : state === 'listening' ? <Mic className="h-12 w-12 text-teal-700" /> : <Radio className="h-12 w-12 text-white" />}
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{message}</h2>
        <p className="mt-3 text-sm text-slate-500">{encounterId ? stage : state === 'ready' ? 'You will be asked six short questions for your doctor.' : 'Checking your active visit…'}</p>
        {conversation.length > 0 && <div className="mt-8 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Live conversation</p>
          <div className="mt-3 max-h-[32rem] min-h-0 space-y-3 overflow-y-auto overscroll-contain pr-2" aria-live="polite" tabIndex={0}>
            {conversation.map((turn, index) => <div key={`${turn.speaker}-${index}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{turn.speaker === 'ASSISTANT' ? 'MediKiosk' : 'You'}</p>
              <p className="mt-0.5 break-words whitespace-pre-wrap text-sm leading-6 text-slate-800">{turn.text}</p>
            </div>)}
          </div>
        </div>}
        {needsVerification && <div className="mt-8 text-left rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Please confirm your captured details</p><p className="mt-2 text-sm text-slate-500">Check these plain-language details once. You may correct any item before the hospital PDF is generated.</p><div className="mt-4 space-y-3">{REPORT_FIELDS.map(([key, label]) => <label key={key} className="block rounded-xl bg-white border border-slate-200 p-3"><span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">{label}</span><textarea value={editableClinicalValue(report?.[key])} onChange={(event) => setReport((current) => ({ ...(current ?? {}), [key]: clinicalValueFromText(event.target.value) }))} className="mt-2 min-h-16 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm leading-6 text-slate-800" /></label>)}</div><button type="button" onClick={() => void verify()} className="mt-4 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white">Yes, these details are correct - generate hospital report</button></div>}
        {pdfUrl && <div className="mt-8 text-left"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Patient copy - hospital intake report</p><iframe title="Hospital intake report" src={pdfUrl} className="mt-3 h-[520px] w-full rounded-xl border border-slate-200" /><a href={pdfUrl} download="sanctuary-plus-intake-report.pdf" className="mt-3 block text-center rounded-xl border border-teal-200 px-4 py-3 text-sm font-semibold text-teal-700">Download patient copy</a></div>}
        <div className="mt-10 flex justify-center gap-3">
          {(state === 'ready' || state === 'error') && <button type="button" onClick={startVoiceIntake} className="px-5 py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold flex items-center gap-2"><Mic className="h-4 w-4" /> {state === 'error' ? 'Try again' : 'Start voice intake'}</button>}
          {state !== 'complete' && <button type="button" onClick={() => void endConversation()} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold flex items-center gap-2"><PhoneOff className="h-4 w-4" /> End conversation</button>}
        </div>
        <p className="mt-8 text-xs text-slate-400">Speak naturally in your supported Indian language. You can correct anything during verification.</p>
      </div>
    </section>
  );
}
