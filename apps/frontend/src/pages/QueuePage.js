import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, Badge, Button, Input, Tabs } from '@heroui/react';
import { Plus, Bed } from 'lucide-react';
const INITIAL_PATIENTS = [
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
const ESI_COLOR = {
    1: 'danger',
    2: 'danger',
    3: 'warning',
    4: 'success',
    5: 'success',
};
export default function QueuePage() {
    const [patients] = useState(INITIAL_PATIENTS);
    const [filter, setFilter] = useState('all');
    const visible = patients.filter((p) => filter === 'all'
        ? true
        : filter === 'critical'
            ? p.status === 'critical'
            : p.status === 'stable');
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Smart Digital Queues" }), _jsx("p", { className: "text-sm text-gray-500", children: "ESI triage priority with rule-based acuity scoring" })] }), _jsxs(Badge, { color: "accent", variant: "soft", children: [patients.length, " in queue"] })] }) }), _jsxs("div", { className: "flex flex-col md:flex-row gap-3", children: [_jsx(Input, { placeholder: "Search patient...", fullWidth: true }), _jsxs(Button, { variant: "primary", onPress: () => undefined, children: [_jsx(Plus, { size: 16 }), "Add Patient"] })] }), _jsxs(Tabs, { defaultSelectedKey: "all", onSelectionChange: (key) => setFilter(key), children: [_jsxs(Tabs.List, { "aria-label": "Queue filter", children: [_jsx(Tabs.Tab, { id: "all", children: "All" }), _jsx(Tabs.Tab, { id: "critical", children: "Critical" }), _jsx(Tabs.Tab, { id: "stable", children: "Stable" })] }), _jsx(Tabs.Panel, { id: "all", children: _jsx(QueueTable, { patients: visible, esiColor: ESI_COLOR }) }), _jsx(Tabs.Panel, { id: "critical", children: _jsx(QueueTable, { patients: visible, esiColor: ESI_COLOR }) }), _jsx(Tabs.Panel, { id: "stable", children: _jsx(QueueTable, { patients: visible, esiColor: ESI_COLOR }) })] })] }));
}
function QueueTable({ patients, esiColor, }) {
    return (_jsx(Card, { className: "p-0 mt-3 overflow-hidden", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "bg-gray-50 text-gray-600 text-sm", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "Patient" }), _jsx("th", { className: "p-3", children: "ESI" }), _jsx("th", { className: "p-3", children: "Status" }), _jsx("th", { className: "p-3", children: "Wait" }), _jsx("th", { className: "p-3", children: "Bed" }), _jsx("th", { className: "p-3", children: "Action" })] }) }), _jsx("tbody", { children: patients.map((patient) => (_jsxs("tr", { className: "border-t border-gray-100", children: [_jsx("td", { className: "p-3 font-medium", children: patient.name }), _jsx("td", { className: "p-3", children: _jsxs(Badge, { color: esiColor[patient.esi], variant: "soft", children: ["ESI ", patient.esi] }) }), _jsx("td", { className: "p-3", children: _jsx(Badge, { color: patient.status === 'critical' ? 'danger' : 'success', variant: "soft", children: patient.status }) }), _jsx("td", { className: "p-3 text-sm text-gray-600", children: patient.waitTime }), _jsx("td", { className: "p-3 text-sm text-gray-600", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Bed, { size: 14 }), " ", patient.bed] }) }), _jsx("td", { className: "p-3", children: _jsx(Button, { size: "sm", variant: "outline", onPress: () => undefined, children: "Assign" }) })] }, patient.id))) })] }) }));
}
