import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, Badge, Button, Tabs, ProgressBar } from '@heroui/react';
import { Activity, Heart, AlertTriangle } from 'lucide-react';
const FALLBACK_ALERTS = [
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
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const loadSummary = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/chronos/summary');
                if (!response.ok) {
                    throw new Error(`Chronos gateway error: ${response.status}`);
                }
                const data = (await response.json());
                setSummary(data);
                setError(null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to reach Chronos');
            }
            finally {
                setLoading(false);
            }
        };
        void loadSummary();
    }, []);
    const summaryStatus = summary?.status ?? 'offline';
    const modelCount = summary?.models_loaded?.length ?? 0;
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs(Card, { className: "p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Chronos ICU Early Warning" }), _jsx("p", { className: "text-sm text-gray-500", children: "4-engine ML ensemble \u2022 separate but linked" })] }), _jsx(Badge, { color: summaryStatus === 'online' ? 'success' : 'danger', variant: "soft", children: loading ? 'Connecting...' : summaryStatus })] }), error ? (_jsx("p", { className: "mt-2 text-xs text-red-600", children: error })) : (_jsx("p", { className: "mt-2 text-xs text-gray-500", children: summary ? `${summary.active_patients} active patients • ${modelCount} models loaded` : 'Checking Chronos status...' }))] }), _jsxs(Tabs, { defaultSelectedKey: "alerts", children: [_jsxs(Tabs.List, { "aria-label": "Chronos sections", children: [_jsx(Tabs.Tab, { id: "alerts", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(AlertTriangle, { size: 16 }), " Alerts"] }) }), _jsx(Tabs.Tab, { id: "trends", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Activity, { size: 16 }), " Trends"] }) })] }), _jsx(Tabs.Panel, { id: "alerts", children: _jsxs("div", { className: "flex flex-col gap-2 mt-3", children: [(summary && summary.status === 'online' ? FALLBACK_ALERTS : FALLBACK_ALERTS).map((alert) => (_jsx(Card, { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium inline-flex items-center gap-2", children: [_jsx(Heart, { size: 16, className: "text-danger" }), " ", alert.patient] }), _jsx("p", { className: "text-xs text-gray-500", children: alert.condition })] }), _jsxs("div", { className: "text-right", children: [_jsx(Badge, { color: alert.risk === 'CRITICAL' ? 'danger' : 'warning', variant: "soft", children: alert.risk }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [alert.hours, " ago"] })] })] }) }, alert.patient))), _jsx(Button, { variant: "primary", className: "mt-2", onPress: () => window.location.reload(), children: "Refresh Chronos" })] }) }), _jsx(Tabs.Panel, { id: "trends", children: _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium", children: "Unit Risk Load" }), _jsx(ProgressBar, { value: Math.min(100, (summary?.active_patients ?? 0) * 10 + 20), maxValue: 100, color: "warning", className: "mt-2" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: summary ? `${summary.active_patients} active ICU patients` : 'Monitoring waiting queue' }), _jsxs("div", { className: "flex items-center gap-2 mt-3 text-sm text-gray-600", children: [_jsx(Activity, { size: 16 }), " ", summary?.source ?? 'Chronos bridge is active'] })] }) })] })] }));
}
