import React from 'react';
import { Card, Badge, Tabs } from '@heroui/react';
import { LayoutDashboard, TrendingUp, User } from 'lucide-react';
import { TriagePage } from './TriagePage';
import { PatientPage } from './PatientPage';
import { AnalyticsPage } from './AnalyticsPage';
import { ChronosProvider, useChronosContext } from '../context/ChronosContext';
import '../styles/chronos.css';

function ChronosHeader() {
  const { connected, apiOnline, modelsLoaded, patients } = useChronosContext();
  const modelCount = modelsLoaded.length;
  const activeCount = Object.keys(patients).length;
  let statusLabel: string;
  let statusColor: 'success' | 'warning' | 'danger' = 'success';
  if (!apiOnline) {
    statusLabel = 'API offline';
    statusColor = 'danger';
  } else if (!connected) {
    statusLabel = 'API online · stream disconnected';
    statusColor = 'warning';
  } else {
    statusLabel = 'Live stream connected';
    statusColor = 'success';
  }
  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Chronos</h2>
        <p className="text-sm text-slate-500">Predictive ICU monitoring — native Sanctuary domain</p>
      </div>
      <div className="flex gap-1.5 items-center">
        <Badge color={statusColor} variant="soft">{statusLabel}</Badge>
        <Badge color="default" variant="soft">{modelCount} {modelCount === 1 ? 'model' : 'models'}</Badge>
        <Badge color="accent" variant="soft">{activeCount} patients</Badge>
      </div>
    </Card>
  );
}

function ChronosContent() {
  return (
    <>
      <ChronosHeader />
      <Tabs defaultSelectedKey="triage">
        <Tabs.List aria-label="Chronos sections">
          <Tabs.Tab id="triage"><span className="inline-flex items-center gap-1"><LayoutDashboard size={14} /> Triage</span></Tabs.Tab>
          <Tabs.Tab id="patient"><span className="inline-flex items-center gap-1"><User size={14} /> Patient</span></Tabs.Tab>
          <Tabs.Tab id="analytics"><span className="inline-flex items-center gap-1"><TrendingUp size={14} /> Analytics</span></Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="triage">
          <div className="mt-3"><TriagePage /></div>
        </Tabs.Panel>
        <Tabs.Panel id="patient">
          <div className="mt-3"><PatientPage /></div>
        </Tabs.Panel>
        <Tabs.Panel id="analytics">
          <div className="mt-3"><AnalyticsPage /></div>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

export default function ChronosPage() {
  return (
    <div className="flex flex-col gap-4 chronos-root">
      <ChronosProvider>
        <ChronosContent />
      </ChronosProvider>
    </div>
  );
}
