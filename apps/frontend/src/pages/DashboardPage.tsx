import React from 'react';
import { Card, Badge, ProgressBar, Tabs, Avatar } from '@heroui/react';
import { Users, Heart, Clock, Bed } from 'lucide-react';

type UiColor = 'accent' | 'danger' | 'warning' | 'default';

const QUICK_STATS: {
  label: string;
  value: string;
  icon: typeof Users;
  color: UiColor;
}[] = [
  { label: 'Active Patients', value: '127', icon: Users, color: 'accent' },
  { label: 'Critical Cases', value: '23', icon: Heart, color: 'danger' },
  { label: 'Med Avg Wait', value: '8 min', icon: Clock, color: 'warning' },
  { label: 'Bed Occupancy', value: '94%', icon: Bed, color: 'default' },
];

const OVERVIEW: {
  label: string;
  value: string;
  trend: string;
  color: UiColor;
}[] = [
  {
    label: 'Active Patients',
    value: '127',
    trend: '+12 this hour',
    color: 'accent',
  },
  {
    label: 'Critical Cases',
    value: '23',
    trend: '+5 this hour',
    color: 'danger',
  },
  { label: 'Med Avg Wait', value: '8 min', trend: '-2 min', color: 'warning' },
  { label: 'Bed Occupancy', value: '94%', trend: '+3%', color: 'default' },
];

const RECENT_ACTIVITY: {
  patient: string;
  action: string;
  time: string;
  status: UiColor;
}[] = [
  {
    patient: 'John Doe',
    action: 'Admitted',
    time: '2 min ago',
    status: 'danger',
  },
  {
    patient: 'Jane Smith',
    action: 'Discharged',
    time: '15 min ago',
    status: 'default',
  },
  {
    patient: 'Robert Brown',
    action: 'ICU Transfer',
    time: '30 min ago',
    status: 'danger',
  },
  {
    patient: 'Emily Davis',
    action: 'Rounded',
    time: '1 hour ago',
    status: 'default',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Hospital Dashboard</h2>
            <p className="text-sm text-gray-500">
              Real-time patient overview &amp; system status
            </p>
          </div>
          <Badge color="accent" variant="soft">
            v1.0.0
          </Badge>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_STATS.map((stat) => (
          <Card
            key={stat.label}
            className="p-3 flex flex-row items-center gap-3"
          >
            <Avatar color={stat.color} variant="soft" className="shrink-0">
              <stat.icon size={18} />
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultSelectedKey="overview">
        <Tabs.List aria-label="Dashboard sections">
          <Tabs.Tab id="overview">Overview</Tabs.Tab>
          <Tabs.Tab id="queue">Queue</Tabs.Tab>
          <Tabs.Tab id="risk">Risk</Tabs.Tab>
          <Tabs.Tab id="chronos">Chronos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="overview">
          <div className="flex flex-col gap-3 mt-3">
            {OVERVIEW.map((stat) => (
              <Card
                key={stat.label}
                className="p-3"
                style={{ borderLeft: `4px solid var(--heroui-${stat.color})` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{stat.label}</p>
                    <p className="text-xs text-gray-500">{stat.trend}</p>
                  </div>
                  <span className="text-sm font-semibold">{stat.value}</span>
                </div>
              </Card>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="queue">
          <Card className="p-4 mt-3">
            <h3 className="font-medium">Patient Queue</h3>
            <p className="text-sm text-gray-500">
              47 patients currently in queue
            </p>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="risk">
          <Card className="p-4 mt-3">
            <h3 className="font-medium">Risk Overview</h3>
            <ProgressBar
              value={85}
              maxValue={100}
              color="danger"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">85% critical risk</p>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="chronos">
          <Card className="p-4 mt-3">
            <h3 className="font-medium">ICU Early Warning</h3>
            <ProgressBar
              value={72}
              maxValue={100}
              color="warning"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">72% risk patients</p>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Recent activity */}
      <Card className="p-4">
        <h3 className="font-medium mb-2">Recent Activity</h3>
        <div className="flex flex-col gap-2">
          {RECENT_ACTIVITY.map((activity) => (
            <Card key={activity.patient} className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{activity.patient}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <Badge color={activity.status} variant="soft">
                  {activity.action}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
