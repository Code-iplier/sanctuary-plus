import React from 'react';
import { Card, Badge, Button, Tabs, ProgressBar } from '@heroui/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Heart, TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const chartData: ChartData<'line'> = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Patient Volume',
      data: [65, 59, 80, 81, 55, 40],
      borderColor: '#0891B2',
      backgroundColor: 'rgba(8, 145, 178, 0.1)',
      tension: 0.3,
    },
  ],
};

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: { legend: { display: true } },
};

const CALCULATORS = [
  {
    label: 'ASCVD 10-year Risk',
    value: '8.5%',
    category: 'High',
    color: 'danger' as const,
  },
  {
    label: 'CKD Stage',
    value: '3',
    detail: 'eGFR 45',
    color: 'warning' as const,
  },
  {
    label: 'LACE Readmission',
    value: '5',
    category: 'Moderate',
    color: 'warning' as const,
  },
];

export default function RiskPage() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Preventive Disease Risk Assessment
            </h2>
            <p className="text-sm text-gray-500">
              ASCVD • CKD (KDIGO) • LACE calculators
            </p>
          </div>
          <Badge color="accent" variant="soft">
            Mixed ML + Rules
          </Badge>
        </div>
      </Card>

      <Tabs defaultSelectedKey="calculators">
        <Tabs.List aria-label="Risk sections">
          <Tabs.Tab id="calculators">
            <span className="inline-flex items-center gap-1">
              <TrendingUp size={16} /> Calculators
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="patient-risk">
            <span className="inline-flex items-center gap-1">
              <Heart size={16} /> Patient Risk
            </span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="calculators">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {CALCULATORS.map((calc) => (
              <Card key={calc.label} className="p-4">
                <p className="text-sm text-gray-600">{calc.label}</p>
                <p className="text-3xl font-bold mt-1">{calc.value}</p>
                <Badge color={calc.color} variant="soft" className="mt-2">
                  {calc.category ?? calc.detail}
                </Badge>
              </Card>
            ))}
          </div>
          <Card className="p-4 mt-3">
            <h3 className="font-medium mb-2">Patient Volume Trend</h3>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="patient-risk">
          <Card className="p-4 mt-3">
            <h3 className="font-medium">Overall Risk Profile</h3>
            <ProgressBar
              value={82}
              maxValue={100}
              color="danger"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              82% composite 30-day risk
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="primary" onPress={() => undefined}>
                Run Assessment
              </Button>
              <Button variant="outline" onPress={() => undefined}>
                Export
              </Button>
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
