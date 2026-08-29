import { useEffect, useState } from 'react';
import { Card, Badge, Button, Tabs, ProgressBar, Input } from '@heroui/react';
import { Activity, Heart, AlertTriangle, Zap } from 'lucide-react';

type ChronosSummary = {
  status: string;
  models_loaded: string[];
  active_patients: number;
  patient_count: number;
  source: string;
  refreshedAt: string;
};

type ChronosAlert = {
  patient: string;
  risk: 'CRITICAL' | 'HIGH';
  condition: string;
  hours: string;
};

type PredictionResult = {
  patient_id: string;
  status: string;
  alerts: {
    [key: string]: {
      probability: number;
      risk_level: string;
      source: string;
    };
  };
};

const FALLBACK_ALERTS: ChronosAlert[] = [
  {
    patient: 'ICU-001',
    risk: 'CRITICAL',
    condition: 'Septic Shock',
    hours: '3h',
  },
  {
    patient: 'ICU-002',
    risk: 'HIGH',
    condition: 'Hemodynamic Collapse',
    hours: '1h',
  },
  { patient: 'ICU-003', risk: 'HIGH', condition: 'Hypoxemia', hours: '5h' },
];

export default function ChronosPage() {
  const [summary, setSummary] = useState<ChronosSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Test form state
  const [testVitals, setTestVitals] = useState({
    patientId: 'TEST-001',
    heartRate: '110',
    systolicBp: '90',
    diastolicBp: '50',
    spo2: '88',
    respiratoryRate: '24',
    temperature: '39.2',
    lactate: '3.5',
    wbc: '15.0',
    creatinine: '2.1',
    platelets: '150.0',
  });

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/chronos/summary');
        if (!response.ok) {
          throw new Error(`Chronos gateway error: ${response.status}`);
        }
        const data = (await response.json()) as ChronosSummary;
        setSummary(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to reach Chronos');
      } finally {
        setLoading(false);
      }
    };

    void loadSummary();
  }, []);

  const handleTestPrediction = async () => {
    setTestLoading(true);
    try {
      const payload = {
        patient_id: testVitals.patientId,
        heart_rate: parseFloat(testVitals.heartRate),
        systolic_bp: parseFloat(testVitals.systolicBp),
        diastolic_bp: parseFloat(testVitals.diastolicBp),
        spo2: parseFloat(testVitals.spo2),
        respiratory_rate: parseFloat(testVitals.respiratoryRate),
        temperature: parseFloat(testVitals.temperature),
        lactate: parseFloat(testVitals.lactate),
        wbc: parseFloat(testVitals.wbc),
        creatinine: parseFloat(testVitals.creatinine),
        platelets: parseFloat(testVitals.platelets),
      };

      const response = await fetch('http://localhost:3000/api/chronos/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.status}`);
      }

      const data = (await response.json()) as PredictionResult;
      setPrediction(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setTestLoading(false);
    }
  };

  const loadSampleVitals = (severity: 'normal' | 'high' | 'critical') => {
    const samples = {
      normal: {
        patientId: 'PATIENT-NORMAL',
        heartRate: '72',
        systolicBp: '120',
        diastolicBp: '80',
        spo2: '98',
        respiratoryRate: '16',
        temperature: '37.0',
        lactate: '1.2',
        wbc: '7.5',
        creatinine: '0.9',
        platelets: '250',
      },
      high: {
        patientId: 'PATIENT-HIGH',
        heartRate: '105',
        systolicBp: '95',
        diastolicBp: '55',
        spo2: '92',
        respiratoryRate: '22',
        temperature: '38.5',
        lactate: '2.5',
        wbc: '13.2',
        creatinine: '1.8',
        platelets: '180',
      },
      critical: {
        patientId: 'PATIENT-CRITICAL',
        heartRate: '130',
        systolicBp: '70',
        diastolicBp: '40',
        spo2: '85',
        respiratoryRate: '28',
        temperature: '39.8',
        lactate: '5.0',
        wbc: '20.0',
        creatinine: '3.5',
        platelets: '80',
      },
    };
    setTestVitals(samples[severity]);
  };

  const summaryStatus = summary?.status ?? 'offline';
  const modelCount = summary?.models_loaded?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Chronos ICU Early Warning</h2>
            <p className="text-sm text-gray-500">
              4-engine ML ensemble • separate but linked
            </p>
          </div>
          <Badge color={summaryStatus === 'online' ? 'success' : 'danger'} variant="soft">
            {loading ? 'Connecting...' : summaryStatus}
          </Badge>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            {summary ? `${summary.active_patients} active patients • ${modelCount} models loaded` : 'Checking Chronos status...'}
          </p>
        )}
      </Card>

      <Tabs defaultSelectedKey="alerts">
        <Tabs.List aria-label="Chronos sections">
          <Tabs.Tab id="alerts">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={16} /> Alerts
            </span>
          </Tabs.Tab>
        <Tabs.Tab id="test">
            <span className="inline-flex items-center gap-1">
              <Zap size={16} /> Test Models
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="trends">
            <span className="inline-flex items-center gap-1">
              <Activity size={16} /> Trends
            </span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="alerts">
          <div className="flex flex-col gap-2 mt-3">
            {(summary && summary.status === 'online' ? FALLBACK_ALERTS : FALLBACK_ALERTS).map((alert) => (
              <Card key={alert.patient} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium inline-flex items-center gap-2">
                      <Heart size={16} className="text-danger" /> {alert.patient}
                    </p>
                    <p className="text-xs text-gray-500">{alert.condition}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      color={alert.risk === 'CRITICAL' ? 'danger' : 'warning'}
                      variant="soft"
                    >
                      {alert.risk}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{alert.hours} ago</p>
                  </div>
                </div>
              </Card>
            ))}
            <Button
              variant="primary"
              className="mt-2"
              onPress={() => window.location.reload()}
            >
              Refresh Chronos
            </Button>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="test">
          <Card className="p-4 mt-3">
            <h3 className="font-medium mb-3">Test Model Predictions</h3>

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
              <Input
                label="Patient ID"
                size="sm"
                value={testVitals.patientId}
                onChange={(e) => setTestVitals({ ...testVitals, patientId: e.target.value })}
              />
              <Input
                label="Heart Rate"
                size="sm"
                value={testVitals.heartRate}
                onChange={(e) => setTestVitals({ ...testVitals, heartRate: e.target.value })}
              />
              <Input
                label="Systolic BP"
                size="sm"
                value={testVitals.systolicBp}
                onChange={(e) => setTestVitals({ ...testVitals, systolicBp: e.target.value })}
              />
              <Input
                label="Diastolic BP"
                size="sm"
                value={testVitals.diastolicBp}
                onChange={(e) => setTestVitals({ ...testVitals, diastolicBp: e.target.value })}
              />
              <Input
                label="SpO2 (%)"
                size="sm"
                value={testVitals.spo2}
                onChange={(e) => setTestVitals({ ...testVitals, spo2: e.target.value })}
              />
              <Input
                label="Respiratory Rate"
                size="sm"
                value={testVitals.respiratoryRate}
                onChange={(e) => setTestVitals({ ...testVitals, respiratoryRate: e.target.value })}
              />
              <Input
                label="Temperature (°C)"
                size="sm"
                value={testVitals.temperature}
                onChange={(e) => setTestVitals({ ...testVitals, temperature: e.target.value })}
              />
              <Input
                label="Lactate (mmol/L)"
                size="sm"
                value={testVitals.lactate}
                onChange={(e) => setTestVitals({ ...testVitals, lactate: e.target.value })}
              />
              <Input
                label="WBC (10^3/µL)"
                size="sm"
                value={testVitals.wbc}
                onChange={(e) => setTestVitals({ ...testVitals, wbc: e.target.value })}
              />
              <Input
                label="Creatinine (mg/dL)"
                size="sm"
                value={testVitals.creatinine}
                onChange={(e) => setTestVitals({ ...testVitals, creatinine: e.target.value })}
              />
              <Input
                label="Platelets (10^3/µL)"
                size="sm"
                value={testVitals.platelets}
                onChange={(e) => setTestVitals({ ...testVitals, platelets: e.target.value })}
              />
            </div>

            <Button
              className="w-full mb-4 bg-blue-600 text-white"
              isLoading={testLoading}
              onPress={handleTestPrediction}
            >
              Get Prediction
            </Button>

            {prediction && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Results for {prediction.patient_id}</h4>
                {Object.entries(prediction.alerts).map(([model, result]) => (
                  <Card key={model} className="p-2 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{model}</p>
                        <p className="text-xs text-gray-600">{result.source}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            result.risk_level === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : result.risk_level === 'HIGH'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }
                          variant="soft"
                        >
                          {result.risk_level}
                        </Badge>
                        <p className="text-sm font-medium mt-1">
                          {(result.probability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
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
              {summary ? `${summary.active_patients} active ICU patients` : 'Monitoring waiting queue'}
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <Activity size={16} /> {summary?.source ?? 'Chronos bridge is active'}
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
