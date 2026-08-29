import { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Tabs,
  ProgressBar,
  Input,
  Toast,
} from '@heroui/react';
import { Activity, Heart, AlertTriangle, Zap, Trash2 } from 'lucide-react';
import {
  getChronosSummary,
  predictVitals,
  type ChronosSummary,
  type MonitoredPatient,
  type PredictionResult,
} from '../api/chronos';

type VitalsState = {
  patientId: string;
  heartRate: string;
  systolicBp: string;
  diastolicBp: string;
  meanArterialPressure: string;
  spo2: string;
  respiratoryRate: string;
  temperature: string;
  lactate: string;
  wbc: string;
  creatinine: string;
  bilirubin: string;
  platelets: string;
  fio2: string;
  pao2: string;
  gcs: string;
  vasopressorDose: string;
};

const STORAGE_KEY = 'chronos.monitoredPatients';

const RISK_RANK: Record<string, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MODERATE: 1,
  LOW: 0,
};

function riskColor(level: string): 'danger' | 'warning' | 'accent' | 'success' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH') return 'warning';
  if (level === 'MODERATE') return 'accent';
  return 'success';
}

function overallRisk(alerts: Record<string, { risk_level: string }>): string {
  let top = 'LOW';
  for (const a of Object.values(alerts)) {
    if (RISK_RANK[a.risk_level] > RISK_RANK[top]) top = a.risk_level;
  }
  return top;
}

function defaultVitals(): VitalsState {
  return {
    patientId: 'TEST-001',
    heartRate: '110',
    systolicBp: '90',
    diastolicBp: '50',
    meanArterialPressure: '',
    spo2: '88',
    respiratoryRate: '24',
    temperature: '39.2',
    lactate: '3.5',
    wbc: '15.0',
    creatinine: '2.1',
    bilirubin: '',
    platelets: '150.0',
    fio2: '',
    pao2: '',
    gcs: '',
    vasopressorDose: '',
  };
}

const SAMPLES: Record<'normal' | 'high' | 'critical', VitalsState> = {
  normal: {
    patientId: 'PATIENT-NORMAL',
    heartRate: '72',
    systolicBp: '120',
    diastolicBp: '80',
    meanArterialPressure: '93',
    spo2: '98',
    respiratoryRate: '16',
    temperature: '37.0',
    lactate: '1.2',
    wbc: '7.5',
    creatinine: '0.9',
    bilirubin: '0.8',
    platelets: '250',
    fio2: '0.21',
    pao2: '90',
    gcs: '15',
    vasopressorDose: '0',
  },
  high: {
    patientId: 'PATIENT-HIGH',
    heartRate: '105',
    systolicBp: '95',
    diastolicBp: '55',
    meanArterialPressure: '68',
    spo2: '92',
    respiratoryRate: '22',
    temperature: '38.5',
    lactate: '2.5',
    wbc: '13.2',
    creatinine: '1.8',
    bilirubin: '1.5',
    platelets: '180',
    fio2: '0.4',
    pao2: '70',
    gcs: '13',
    vasopressorDose: '0.1',
  },
  critical: {
    patientId: 'PATIENT-CRITICAL',
    heartRate: '130',
    systolicBp: '70',
    diastolicBp: '40',
    meanArterialPressure: '50',
    spo2: '85',
    respiratoryRate: '28',
    temperature: '39.8',
    lactate: '5.0',
    wbc: '20.0',
    creatinine: '3.5',
    bilirubin: '3.0',
    platelets: '80',
    fio2: '0.6',
    pao2: '55',
    gcs: '9',
    vasopressorDose: '0.3',
  },
};

function buildPayload(v: VitalsState): Record<string, unknown> {
  const map: Record<string, keyof VitalsState> = {
    heart_rate: 'heartRate',
    systolic_bp: 'systolicBp',
    diastolic_bp: 'diastolicBp',
    mean_arterial_pressure: 'meanArterialPressure',
    spo2: 'spo2',
    respiratory_rate: 'respiratoryRate',
    temperature: 'temperature',
    lactate: 'lactate',
    wbc: 'wbc',
    creatinine: 'creatinine',
    bilirubin: 'bilirubin',
    platelets: 'platelets',
    fio2: 'fio2',
    pao2: 'pao2',
    gcs: 'gcs',
    vasopressor_dose: 'vasopressorDose',
  };
  const payload: Record<string, unknown> = { patient_id: v.patientId };
  for (const [apiKey, stateKey] of Object.entries(map)) {
    const raw = v[stateKey].trim();
    if (raw === '') continue;
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) payload[apiKey] = num;
  }
  return payload;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function ChronosPage() {
  const [summary, setSummary] = useState<ChronosSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testVitals, setTestVitals] = useState<VitalsState>(defaultVitals());
  const [monitored, setMonitored] = useState<MonitoredPatient[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMonitored(JSON.parse(stored) as MonitoredPatient[]);
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getChronosSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to reach Chronos';
      setError(msg);
      Toast.toast.danger(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const persistMonitored = (next: MonitoredPatient[]) => {
    setMonitored(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  };

  const handleTestPrediction = async () => {
    setTestLoading(true);
    try {
      const payload = buildPayload(testVitals);
      const data = await predictVitals(payload);
      setPrediction(data);
      const entry: MonitoredPatient = {
        patientId: data.patient_id,
        timestamp: data.timestamp,
        alerts: data.alerts,
        source: data.source,
      };
      persistMonitored([entry, ...monitored].slice(0, 25));
      Toast.toast.success(`Prediction ready for ${data.patient_id}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Prediction request failed';
      Toast.toast.danger(msg);
    } finally {
      setTestLoading(false);
    }
  };

  const loadSampleVitals = (severity: 'normal' | 'high' | 'critical') => {
    setTestVitals(SAMPLES[severity]);
  };

  const clearMonitored = () => persistMonitored([]);

  const summaryStatus = summary?.status ?? 'offline';
  const modelCount = summary?.models_loaded?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Chronos ICU Early Warning</h2>
            <p className="text-sm text-gray-500">
              4-engine ML ensemble • live inference
            </p>
          </div>
          <Badge
            color={summaryStatus === 'online' ? 'success' : 'danger'}
            variant="soft"
          >
            {loading ? 'Connecting...' : summaryStatus}
          </Badge>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            {summary
              ? `${summary.active_patients} active patients • ${modelCount} models loaded`
              : 'Checking Chronos status...'}
          </p>
        )}
      </Card>

      <Tabs defaultSelectedKey="test">
        <Tabs.List aria-label="Chronos sections">
          <Tabs.Tab id="test">
            <span className="inline-flex items-center gap-1">
              <Zap size={16} /> Test Models
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="alerts">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={16} /> Alerts ({monitored.length})
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="trends">
            <span className="inline-flex items-center gap-1">
              <Activity size={16} /> Trends
            </span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="test">
          <Card className="p-4 mt-3">
            <h3 className="font-medium mb-1">Run ML Prediction</h3>
            <p className="text-xs text-gray-500 mb-3">
              Enter patient vitals and Chronos will score sepsis, hypotension
              and hemodynamic collapse risk.
            </p>

            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onPress={() => loadSampleVitals('normal')}
              >
                Load Normal Vitals
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500"
                onPress={() => loadSampleVitals('high')}
              >
                Load High Risk
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500"
                onPress={() => loadSampleVitals('critical')}
              >
                Load Critical
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <Field
                label="Patient ID"
                value={testVitals.patientId}
                onChange={(v) => setTestVitals({ ...testVitals, patientId: v })}
              />
              <Field
                label="Heart Rate (bpm)"
                value={testVitals.heartRate}
                onChange={(v) => setTestVitals({ ...testVitals, heartRate: v })}
              />
              <Field
                label="Systolic BP (mmHg)"
                value={testVitals.systolicBp}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, systolicBp: v })
                }
              />
              <Field
                label="Diastolic BP (mmHg)"
                value={testVitals.diastolicBp}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, diastolicBp: v })
                }
              />
              <Field
                label="MAP (mmHg)"
                value={testVitals.meanArterialPressure}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, meanArterialPressure: v })
                }
              />
              <Field
                label="SpO₂ (%)"
                value={testVitals.spo2}
                onChange={(v) => setTestVitals({ ...testVitals, spo2: v })}
              />
              <Field
                label="Respiratory Rate (/min)"
                value={testVitals.respiratoryRate}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, respiratoryRate: v })
                }
              />
              <Field
                label="Temperature (°C)"
                value={testVitals.temperature}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, temperature: v })
                }
              />
              <Field
                label="Lactate (mmol/L)"
                value={testVitals.lactate}
                onChange={(v) => setTestVitals({ ...testVitals, lactate: v })}
              />
              <Field
                label="WBC (10³/µL)"
                value={testVitals.wbc}
                onChange={(v) => setTestVitals({ ...testVitals, wbc: v })}
              />
              <Field
                label="Creatinine (mg/dL)"
                value={testVitals.creatinine}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, creatinine: v })
                }
              />
              <Field
                label="Bilirubin (mg/dL)"
                value={testVitals.bilirubin}
                onChange={(v) => setTestVitals({ ...testVitals, bilirubin: v })}
              />
              <Field
                label="Platelets (10³/µL)"
                value={testVitals.platelets}
                onChange={(v) => setTestVitals({ ...testVitals, platelets: v })}
              />
              <Field
                label="FiO₂"
                value={testVitals.fio2}
                onChange={(v) => setTestVitals({ ...testVitals, fio2: v })}
              />
              <Field
                label="PaO₂ (mmHg)"
                value={testVitals.pao2}
                onChange={(v) => setTestVitals({ ...testVitals, pao2: v })}
              />
              <Field
                label="GCS"
                value={testVitals.gcs}
                onChange={(v) => setTestVitals({ ...testVitals, gcs: v })}
              />
              <Field
                label="Vasopressor Dose"
                value={testVitals.vasopressorDose}
                onChange={(v) =>
                  setTestVitals({ ...testVitals, vasopressorDose: v })
                }
              />
            </div>

            <Button
              className="w-full mb-4 bg-blue-600 text-white"
              isDisabled={testLoading}
              onPress={handleTestPrediction}
            >
              {testLoading ? 'Running...' : 'Run Prediction'}
            </Button>

            {prediction && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    Results for {prediction.patient_id}
                  </h4>
                  <Badge
                    color={riskColor(overallRisk(prediction.alerts))}
                    variant="soft"
                  >
                    {overallRisk(prediction.alerts)}
                  </Badge>
                </div>
                {Object.entries(prediction.alerts).map(([model, result]) => (
                  <Card key={model} className="p-2 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{model}</p>
                        <p className="text-xs text-gray-600">{result.source}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          color={riskColor(result.risk_level)}
                          variant="soft"
                        >
                          {result.risk_level}
                        </Badge>
                        <p className="text-sm font-medium mt-1">
                          {(result.probability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={Math.round(result.probability * 100)}
                      maxValue={100}
                      color={riskColor(result.risk_level)}
                      className="mt-2"
                    />
                  </Card>
                ))}
                {prediction.model_metadata?.loaded_registry && (
                  <p className="text-xs text-gray-400 mt-1">
                    Models:{' '}
                    {prediction.model_metadata.loaded_registry.join(', ')}
                  </p>
                )}
              </div>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="alerts">
          <div className="flex flex-col gap-2 mt-3">
            {monitored.length === 0 ? (
              <Card className="p-4 text-sm text-gray-500">
                No monitored patients yet. Run a prediction in the{' '}
                <span className="font-medium">Test Models</span> tab and it will
                appear here with live Chronos risk scores.
              </Card>
            ) : (
              <>
                {monitored.map((m) => (
                  <Card key={`${m.patientId}-${m.timestamp}`} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium inline-flex items-center gap-2">
                          <Heart size={16} className="text-danger" />{' '}
                          {m.patientId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(m.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        color={riskColor(overallRisk(m.alerts))}
                        variant="soft"
                      >
                        {overallRisk(m.alerts)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {Object.entries(m.alerts).map(([model, result]) => (
                        <div
                          key={model}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="capitalize text-gray-600">
                            {model}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span>
                              {(result.probability * 100).toFixed(0)}%
                            </span>
                            <Badge
                              color={riskColor(result.risk_level)}
                              variant="soft"
                              className="px-1"
                            >
                              {result.risk_level}
                            </Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="primary"
                    className="mt-1"
                    onPress={() => void loadSummary()}
                  >
                    Refresh Chronos
                  </Button>
                  <Button
                    variant="ghost"
                    className="mt-1"
                    onPress={clearMonitored}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Trash2 size={14} /> Clear
                    </span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="trends">
          <Card className="p-4 mt-3">
            <h3 className="font-medium">Unit Risk Load</h3>
            <ProgressBar
              value={Math.min(100, (summary?.active_patients ?? 0) * 10 + 20)}
              maxValue={100}
              color="warning"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {summary
                ? `${summary.active_patients} active ICU patients`
                : 'Monitoring waiting queue'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {monitored.length} patient(s) scored in this session.
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <Activity size={16} />{' '}
              {summary?.source ?? 'Chronos bridge is active'}
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
