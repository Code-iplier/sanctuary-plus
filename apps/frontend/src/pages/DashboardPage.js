import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, ProgressBar, Tabs, Avatar } from '@heroui/react';
import { Users, Heart, Clock, Bed } from 'lucide-react';
const QUICK_STATS = [
    { label: 'Active Patients', value: '127', icon: Users, color: 'accent' },
    { label: 'Critical Cases', value: '23', icon: Heart, color: 'danger' },
    { label: 'Med Avg Wait', value: '8 min', icon: Clock, color: 'warning' },
    { label: 'Bed Occupancy', value: '94%', icon: Bed, color: 'default' },
];
const OVERVIEW = [
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
const RECENT_ACTIVITY = [
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
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Hospital Dashboard" }), _jsx("p", { className: "text-sm text-gray-500", children: "Real-time patient overview & system status" })] }), _jsx(Badge, { color: "accent", variant: "soft", children: "v1.0.0" })] }) }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: QUICK_STATS.map((stat) => (_jsxs(Card, { className: "p-3 flex flex-row items-center gap-3", children: [_jsx(Avatar, { color: stat.color, variant: "soft", className: "shrink-0", children: _jsx(stat.icon, { size: 18 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold", children: stat.value }), _jsx("p", { className: "text-xs text-gray-500", children: stat.label })] })] }, stat.label))) }), _jsxs(Tabs, { defaultSelectedKey: "overview", children: [_jsxs(Tabs.List, { "aria-label": "Dashboard sections", children: [_jsx(Tabs.Tab, { id: "overview", children: "Overview" }), _jsx(Tabs.Tab, { id: "queue", children: "Queue" }), _jsx(Tabs.Tab, { id: "risk", children: "Risk" }), _jsx(Tabs.Tab, { id: "chronos", children: "Chronos" })] }), _jsx(Tabs.Panel, { id: "overview", children: _jsx("div", { className: "flex flex-col gap-3 mt-3", children: OVERVIEW.map((stat) => (_jsx(Card, { className: "p-3", style: { borderLeft: `4px solid var(--heroui-${stat.color})` }, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: stat.label }), _jsx("p", { className: "text-xs text-gray-500", children: stat.trend })] }), _jsx("span", { className: "text-sm font-semibold", children: stat.value })] }) }, stat.label))) }) }), _jsx(Tabs.Panel, { id: "queue", children: _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium", children: "Patient Queue" }), _jsx("p", { className: "text-sm text-gray-500", children: "47 patients currently in queue" })] }) }), _jsx(Tabs.Panel, { id: "risk", children: _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium", children: "Risk Overview" }), _jsx(ProgressBar, { value: 85, maxValue: 100, color: "danger", className: "mt-2" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "85% critical risk" })] }) }), _jsx(Tabs.Panel, { id: "chronos", children: _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium", children: "ICU Early Warning" }), _jsx(ProgressBar, { value: 72, maxValue: 100, color: "warning", className: "mt-2" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "72% risk patients" })] }) })] }), _jsxs(Card, { className: "p-4", children: [_jsx("h3", { className: "font-medium mb-2", children: "Recent Activity" }), _jsx("div", { className: "flex flex-col gap-2", children: RECENT_ACTIVITY.map((activity) => (_jsx(Card, { className: "p-2", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: activity.patient }), _jsx("p", { className: "text-xs text-gray-500", children: activity.time })] }), _jsx(Badge, { color: activity.status, variant: "soft", children: activity.action })] }) }, activity.patient))) })] })] }));
}
