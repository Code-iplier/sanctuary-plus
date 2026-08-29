import React, { useState } from 'react';
import { Card, Badge, Button, Input, Tabs } from '@heroui/react';
import { Plus, Bed } from 'lucide-react';

type Patient = {
  id: string;
  name: string;
  esi: 1 | 2 | 3 | 4 | 5;
  status: 'critical' | 'urgent' | 'stable';
  waitTime: string;
  bed: string;
};

const INITIAL_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    esi: 2,
    status: 'critical',
    waitTime: '12 min',
    bed: 'ICU-3',
  },
  {
    id: '2',
    name: 'Jane Smith',
    esi: 3,
    status: 'stable',
    waitTime: '5 min',
    bed: 'ER-12',
  },
  {
    id: '3',
    name: 'Robert Brown',
    esi: 1,
    status: 'critical',
    waitTime: '3 min',
    bed: 'ICU-1',
  },
  {
    id: '4',
    name: 'Emily Davis',
    esi: 4,
    status: 'stable',
    waitTime: '22 min',
    bed: 'ER-7',
  },
];

const ESI_COLOR: Record<number, 'danger' | 'warning' | 'success'> = {
  1: 'danger',
  2: 'danger',
  3: 'warning',
  4: 'success',
  5: 'success',
};

export default function QueuePage() {
  const [patients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [filter, setFilter] = useState<'all' | 'critical' | 'stable'>('all');

  const visible = patients.filter((p) =>
    filter === 'all'
      ? true
      : filter === 'critical'
        ? p.status === 'critical'
        : p.status === 'stable',
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Smart Digital Queues</h2>
            <p className="text-sm text-gray-500">
              ESI triage priority with rule-based acuity scoring
            </p>
          </div>
          <Badge color="accent" variant="soft">
            {patients.length} in queue
          </Badge>
        </div>
      </Card>

      <div className="flex flex-col md:flex-row gap-3">
        <Input placeholder="Search patient..." fullWidth />
        <Button variant="primary" onPress={() => undefined}>
          <Plus size={16} />
          Add Patient
        </Button>
      </div>

      <Tabs
        defaultSelectedKey="all"
        onSelectionChange={(key) =>
          setFilter(key as 'all' | 'critical' | 'stable')
        }
      >
        <Tabs.List aria-label="Queue filter">
          <Tabs.Tab id="all">All</Tabs.Tab>
          <Tabs.Tab id="critical">Critical</Tabs.Tab>
          <Tabs.Tab id="stable">Stable</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="all">
          <QueueTable patients={visible} esiColor={ESI_COLOR} />
        </Tabs.Panel>
        <Tabs.Panel id="critical">
          <QueueTable patients={visible} esiColor={ESI_COLOR} />
        </Tabs.Panel>
        <Tabs.Panel id="stable">
          <QueueTable patients={visible} esiColor={ESI_COLOR} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function QueueTable({
  patients,
  esiColor,
}: {
  patients: Patient[];
  esiColor: Record<number, 'danger' | 'warning' | 'success'>;
}) {
  return (
    <Card className="p-0 mt-3 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-gray-600 text-sm">
          <tr>
            <th className="p-3">Patient</th>
            <th className="p-3">ESI</th>
            <th className="p-3">Status</th>
            <th className="p-3">Wait</th>
            <th className="p-3">Bed</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="border-t border-gray-100">
              <td className="p-3 font-medium">{patient.name}</td>
              <td className="p-3">
                <Badge color={esiColor[patient.esi]} variant="soft">
                  ESI {patient.esi}
                </Badge>
              </td>
              <td className="p-3">
                <Badge
                  color={patient.status === 'critical' ? 'danger' : 'success'}
                  variant="soft"
                >
                  {patient.status}
                </Badge>
              </td>
              <td className="p-3 text-sm text-gray-600">{patient.waitTime}</td>
              <td className="p-3 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Bed size={14} /> {patient.bed}
                </span>
              </td>
              <td className="p-3">
                <Button size="sm" variant="outline" onPress={() => undefined}>
                  Assign
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
