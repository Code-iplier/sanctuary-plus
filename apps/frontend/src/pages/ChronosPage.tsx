import React from 'react';
import { Card, Badge, Button, Tabs, ProgressBar } from '@heroui/react';
import { Activity, Heart, AlertTriangle } from 'lucide-react';

type ChronosAlert = {
  patient: string;
  risk: 'CRITICAL' | 'HIGH';
  condition: string;
  hours: string;
};

const ALERTS: ChronosAlert[] = [
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
          <Badge color="danger" variant="soft">
            {ALERTS.filter((a) => a.risk === 'CRITICAL').length} critical
          </Badge>
        </div>
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
            {ALERTS.map((alert) => (
              <Card key={alert.patient} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium inline-flex items-center gap-2">
                      <Heart size={16} className="text-danger" />{' '}
                      {alert.patient}
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
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.hours} ago
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            <Button
              variant="primary"
              className="mt-2"
              onPress={() => undefined}
            >
              Run Chronos Analysis
            </Button>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="trends">
          <Card className="p-4 mt-3">
            <h3 className="font-medium">Unit Risk Load</h3>
            <ProgressBar
              value={72}
              maxValue={100}
              color="warning"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              72% of ICU beds at elevated risk
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <Activity size={16} /> Real-time vitals streaming from bedside
              monitors
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
