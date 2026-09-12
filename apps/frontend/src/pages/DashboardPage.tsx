import React, { useEffect, useState } from 'react';
import { Card, Badge, ProgressBar, Tabs, Avatar, Button } from '@heroui/react';
import {
  Users,
  Heart,
  Clock,
  Bed,
  ArrowRight,
  RadioTower,
} from 'lucide-react';
import { fetchDashboard } from '../domains/wardsync/api/wardsync.api';
import type { Dashboard } from '../domains/wardsync/model/types';

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
    action: 'Medication Given',
    time: '45 min ago',
    status: 'warning',
  },
  {
    patient: 'Emily Davis',
    action: 'Rounded',
    time: '1 hour ago',
    status: 'default',
  },
];

interface DashboardPageProps {
  onNavigate?: (
    panel:
      | 'dashboard'
      | 'queue'
      | 'documentation'
      | 'medications'
      | 'risk'
      | 'wardsync'
      | 'chronos',
  ) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [wardSyncData, setWardSyncData] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(setWardSyncData)
      .catch(() => {
        // graceful fallback if backend is unavailable
      });
  }, []);

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
          <Tabs.Tab id="wardsync">WardSync</Tabs.Tab>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Patient Queue</h3>
                <p className="text-sm text-gray-500">
                  47 patients currently in queue
                </p>
              </div>
              {onNavigate && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onNavigate('queue')}
                  className="text-xs"
                >
                  Open Queue <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="risk">
          <Card className="p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Risk Overview</h3>
              {onNavigate && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onNavigate('risk')}
                  className="text-xs"
                >
                  Open Risk Assessment <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
            <ProgressBar
              value={85}
              maxValue={100}
              color="danger"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">85% critical risk</p>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="wardsync">
          <Card className="p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RadioTower size={18} className="text-blue-600" />
                <h3 className="font-semibold text-slate-800">WardSync Ward Intelligence</h3>
              </div>
              {onNavigate && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onNavigate('wardsync')}
                  className="text-xs"
                >
                  Open WardSync <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Real-time correlation of bedside device lifecycles and physiological NEWS2 deterioration trends across active wards.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-red-50 p-3 border border-red-100">
                <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
                  Active Flags
                </span>
                <p className="text-xl font-bold text-red-900 mt-1">
                  {wardSyncData?.openFlags.length ?? 0}
                </p>
                <span className="text-[10px] text-red-600">Combined deterioration</span>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                  Review Due
                </span>
                <p className="text-xl font-bold text-amber-900 mt-1">
                  {wardSyncData?.reviewDueDevices.length ?? 0}
                </p>
                <span className="text-[10px] text-amber-600">Invasive devices</span>
              </div>

              <div className="rounded-lg bg-orange-50 p-3 border border-orange-100">
                <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">
                  Rising Trends
                </span>
                <p className="text-xl font-bold text-orange-900 mt-1">
                  {wardSyncData?.risingTrends.length ?? 0}
                </p>
                <span className="text-[10px] text-orange-600">NEWS2 escalating</span>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Monitored Beds
                </span>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {wardSyncData?.patients.length ?? 0}
                </p>
                <span className="text-[10px] text-slate-500">Active ward cohort</span>
              </div>
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="chronos">
          <Card className="p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">ICU Early Warning</h3>
              {onNavigate && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onNavigate('chronos')}
                  className="text-xs"
                >
                  Open Chronos ICU <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
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
