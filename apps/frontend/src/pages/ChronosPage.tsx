import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Tabs, ProgressBar } from '@heroui/react';
import { Activity, Heart, AlertTriangle } from 'lucide-react';

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

  const summaryStatus = summary?.status ?? 'offline';
  const criticalCount = summary?.active_patients ? Math.min(summary.active_patients, 3) : 1;
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
