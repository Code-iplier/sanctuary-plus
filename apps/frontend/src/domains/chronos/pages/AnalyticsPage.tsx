import React, { useMemo } from 'react';
import { Card, Badge, ProgressBar, Alert } from '@heroui/react';
import { TrendingUp, Activity, Heart } from 'lucide-react';
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
import { useChronosContext } from '../context/ChronosContext';
import { RiskDistributionBar } from '../components/RiskDistributionBar';
import { PredictionBreakdownCard } from '../components/PredictionBreakdownCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

export function AnalyticsPage() {
  const { patients, apiOnline, connected, predictionHistory } =
    useChronosContext();

  const list = useMemo(() => Object.values(patients), [patients]);
  const total = list.length;

  const trendData: ChartData<'line'> = useMemo(() => {
    const labels = predictionHistory.map((p) => {
      try {
        const d = new Date(p.timestamp);
        return d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } catch {
        return p.timestamp;
      }
    });
    const data = predictionHistory.map((p) =>
      Number(p.crashProbability.toFixed(1)),
    );
    return {
      labels,
      datasets: [
        {
          label: 'Crash probability',
          data,
          borderColor: '#0891b2',
          backgroundColor: 'rgba(8,145,178,0.12)',
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 1.8,
          fill: true,
        },
      ],
    };
  }, [predictionHistory]);

  const trendOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 },
          grid: { color: 'rgba(148,163,184,0.12)' },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, maxTicksLimit: 6, font: { size: 10 } },
        },
      },
    }),
    [],
  );

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 } as Record<
      string,
      number
    >;
    list.forEach((p: any) => {
      const lvl = p.crash_risk_level ?? 'LOW';
      if (lvl in c) c[lvl] += 1;
    });
    return c as {
      CRITICAL: number;
      HIGH: number;
      MODERATE: number;
      LOW: number;
    };
  }, [list]);

  const stats = useMemo(() => {
    if (!total) return null;
    const pluck = (getter: (p: any) => number) => {
      const vals = list.map(getter);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const max = Math.max(...vals);
      const above = vals.filter((v) => v > 30).length;
      let maxLevel = 'LOW';
      for (const p of list) {
        const lvl = (getter as any).levelKey
          ? (p.predictions as any)?.[(getter as any).levelKey]?.risk_level
          : p.crash_risk_level;
        if (lvl === 'CRITICAL') {
          maxLevel = 'CRITICAL';
          break;
        }
        if (lvl === 'HIGH' && maxLevel !== 'CRITICAL') maxLevel = 'HIGH';
      }
      return { avg, max, above, maxLevel };
    };
    const sepsisVals = list.map(
      (p: any) => p.predictions?.septic_shock?.risk_probability_percentage ?? 0,
    );
    const bpVals = list.map(
      (p: any) =>
        p.predictions?.blood_pressure_collapse?.risk_probability_percentage ??
        0,
    );
    const caVals = list.map(
      (p: any) =>
        p.predictions?.cardiac_arrest?.risk_probability_percentage ?? 0,
    );
    const sepsis = {
      avg: sepsisVals.reduce((a, b) => a + b, 0) / total,
      max: Math.max(...sepsisVals, 0),
      above: sepsisVals.filter((v) => v > 30).length,
      maxLevel: 'LOW' as string,
    };
    const bp = {
      avg: bpVals.reduce((a, b) => a + b, 0) / total,
      max: Math.max(...bpVals, 0),
      above: bpVals.filter((v) => v > 30).length,
      maxLevel: 'LOW' as string,
    };
    const ca = {
      avg: caVals.reduce((a, b) => a + b, 0) / total,
      max: Math.max(...caVals, 0),
      above: caVals.filter((v) => v > 30).length,
      maxLevel: 'LOW' as string,
    };
    const sofaVals = list.map((p: any) => p.clinical_scores?.sofa_score ?? 0);
    const news2Vals = list.map((p: any) => p.clinical_scores?.news2_score ?? 0);
    const shockVals = list.map((p: any) => p.clinical_scores?.shock_index ?? 0);
    const clinical = {
      avgSofa: sofaVals.reduce((a, b) => a + b, 0) / total || 0,
      maxSofa: Math.max(...sofaVals, 0),
      avgNews2: news2Vals.reduce((a, b) => a + b, 0) / total || 0,
      maxNews2: Math.max(...news2Vals, 0),
      avgShock: shockVals.reduce((a, b) => a + b, 0) / total || 0,
      maxShock: Math.max(...shockVals, 0),
    };
    // Derive maxRiskLevel for breakdown cards by scanning patients for highest level per prediction
    const maxLevelFor = (key: string) => {
      let lvl = 'LOW';
      for (const p of list) {
        const l = (p.predictions as any)?.[key]?.risk_level;
        if (l === 'CRITICAL') return 'CRITICAL';
        if (l === 'HIGH' && lvl !== 'CRITICAL') lvl = 'HIGH';
        if (l === 'MODERATE' && !['CRITICAL', 'HIGH'].includes(lvl))
          lvl = 'MODERATE';
      }
      return lvl;
    };
    sepsis.maxLevel = maxLevelFor('septic_shock');
    bp.maxLevel = maxLevelFor('blood_pressure_collapse');
    ca.maxLevel = maxLevelFor('cardiac_arrest');
    return { sepsis, bp, ca, clinical };
  }, [list, total]);

  if (!apiOnline) {
    return (
      <Card className="p-6">
        <p className="font-semibold text-slate-700">Chronos offline</p>
        <p className="text-xs text-slate-500 mt-1">
          API unreachable. Cohort analytics will appear when FastAPI reconnects.
        </p>
      </Card>
    );
  }

  if (!total) {
    return (
      <div className="flex flex-col gap-3">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp size={16} /> Analytics
          </h3>
          <p className="text-xs text-slate-500">
            Cohort analytics derived from live Chronos predictions. No patients
            yet — data appears after first /predict.
          </p>
        </Card>
        <Card className="p-8 text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="font-semibold text-slate-700">No active patients</p>
          <p className="text-xs text-slate-500 mt-1">
            Risk distribution and prediction breakdowns will populate once the
            streamer posts vitals.
          </p>
        </Card>
        {connected === false && (
          <Alert color="warning" className="text-xs">
            Stream disconnected — reconnecting to /ws/triage/all.
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp size={16} /> Analytics
        </h3>
        <p className="text-xs text-slate-500">
          Operational cohort view · {total} patients · Live via ChronosProvider
          → FastAPI /ws/triage/all
        </p>
      </Card>

      {/* Cohort summary — 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Active', value: total, color: 'accent' as const },
          {
            label: 'Critical',
            value: counts.CRITICAL,
            color: 'danger' as const,
          },
          { label: 'High', value: counts.HIGH, color: 'warning' as const },
          {
            label: 'Moderate',
            value: counts.MODERATE,
            color: 'accent' as const,
          },
          { label: 'Low', value: counts.LOW, color: 'success' as const },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-[10px] font-bold tracking-widest text-slate-500">
              {s.label.toUpperCase()}
            </p>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <Badge color={s.color} variant="soft" className="text-[10px] mt-1">
              {s.value} patients
            </Badge>
          </Card>
        ))}
      </div>

      {/* Risk distribution */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm text-slate-800">
          Risk Distribution
        </h4>
        <p className="text-xs text-slate-500">
          Crash risk level across active cohort
        </p>
        <div className="mt-3">
          <RiskDistributionBar counts={counts} total={total} />
        </div>
      </Card>

      {/* Prediction breakdown */}
      <div className="grid md:grid-cols-2 gap-3">
        <PredictionBreakdownCard
          title="Septic Shock"
          emoji="🦠"
          avg={stats!.sepsis.avg}
          max={stats!.sepsis.max}
          aboveThreshold={stats!.sepsis.above}
          total={total}
          maxRiskLevel={stats!.sepsis.maxLevel}
        />
        <PredictionBreakdownCard
          title="BP Collapse"
          emoji="💉"
          avg={stats!.bp.avg}
          max={stats!.bp.max}
          aboveThreshold={stats!.bp.above}
          total={total}
          maxRiskLevel={stats!.bp.maxLevel}
        />
      </div>
      <PredictionBreakdownCard
        title="Cardiac Arrest"
        emoji="🫀"
        avg={stats!.ca.avg}
        max={stats!.ca.max}
        aboveThreshold={stats!.ca.above}
        total={total}
        maxRiskLevel={stats!.ca.maxLevel}
      />

      {/* Clinical cohort metrics */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
          <Heart size={14} /> Clinical Cohort Metrics
        </h4>
        <p className="text-xs text-slate-500">
          From clinical_scores — operational, not diagnostic
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            {
              label: 'SOFA',
              avg: stats!.clinical.avgSofa,
              max: stats!.clinical.maxSofa,
              decimals: 1,
            },
            {
              label: 'NEWS2',
              avg: stats!.clinical.avgNews2,
              max: stats!.clinical.maxNews2,
              decimals: 1,
            },
            {
              label: 'Shock Index',
              avg: stats!.clinical.avgShock,
              max: stats!.clinical.maxShock,
              decimals: 2,
            },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center"
            >
              <p className="text-[10px] font-bold tracking-widest text-slate-500">
                {m.label}
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                avg {m.avg.toFixed(m.decimals)} · max{' '}
                {m.max.toFixed(m.decimals)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Trend — recent prediction events (one point per Chronos event, not cohort average) */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm text-slate-800">
          Crash Probability Trend
        </h4>
        <p className="text-xs text-slate-500">
          Recent Chronos prediction events · bounded to{' '}
          {predictionHistory.length} / 24 points
        </p>
        {predictionHistory.length < 2 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Collecting temporal data…
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Trend appears after at least 2 prediction events flow through
              /ws/triage/all.
            </p>
          </div>
        ) : (
          <div className="h-48 mt-3">
            <Line data={trendData} options={trendOptions} />
          </div>
        )}
        <p className="text-[11px] font-mono text-slate-400 mt-2">
          X: time · Y: crash probability · Each point represents a prediction
          event received from the Chronos realtime stream.
        </p>
      </Card>
    </div>
  );
}
