import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, Button, Tabs, ProgressBar } from '@heroui/react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Heart, TrendingUp } from 'lucide-react';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const chartData = {
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
const chartOptions = {
    responsive: true,
    plugins: { legend: { display: true } },
};
const CALCULATORS = [
    {
        label: 'ASCVD 10-year Risk',
        value: '8.5%',
        category: 'High',
        color: 'danger',
    },
    {
        label: 'CKD Stage',
        value: '3',
        detail: 'eGFR 45',
        color: 'warning',
    },
    {
        label: 'LACE Readmission',
        value: '5',
        category: 'Moderate',
        color: 'warning',
    },
];
export default function RiskPage() {
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Preventive Disease Risk Assessment" }), _jsx("p", { className: "text-sm text-gray-500", children: "ASCVD \u2022 CKD (KDIGO) \u2022 LACE calculators" })] }), _jsx(Badge, { color: "accent", variant: "soft", children: "Mixed ML + Rules" })] }) }), _jsxs(Tabs, { defaultSelectedKey: "calculators", children: [_jsxs(Tabs.List, { "aria-label": "Risk sections", children: [_jsx(Tabs.Tab, { id: "calculators", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(TrendingUp, { size: 16 }), " Calculators"] }) }), _jsx(Tabs.Tab, { id: "patient-risk", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Heart, { size: 16 }), " Patient Risk"] }) })] }), _jsxs(Tabs.Panel, { id: "calculators", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 mt-3", children: CALCULATORS.map((calc) => (_jsxs(Card, { className: "p-4", children: [_jsx("p", { className: "text-sm text-gray-600", children: calc.label }), _jsx("p", { className: "text-3xl font-bold mt-1", children: calc.value }), _jsx(Badge, { color: calc.color, variant: "soft", className: "mt-2", children: calc.category ?? calc.detail })] }, calc.label))) }), _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium mb-2", children: "Patient Volume Trend" }), _jsx("div", { className: "h-64", children: _jsx(Line, { data: chartData, options: chartOptions }) })] })] }), _jsx(Tabs.Panel, { id: "patient-risk", children: _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium", children: "Overall Risk Profile" }), _jsx(ProgressBar, { value: 82, maxValue: 100, color: "danger", className: "mt-2" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "82% composite 30-day risk" }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [_jsx(Button, { variant: "primary", onPress: () => undefined, children: "Run Assessment" }), _jsx(Button, { variant: "outline", onPress: () => undefined, children: "Export" })] })] }) })] })] }));
}
