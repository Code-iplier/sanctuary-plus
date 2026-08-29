import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Badge, Drawer, Card, Toast } from '@heroui/react';
import { LayoutDashboard, Users, Pill, Shield, Heart, Menu, } from 'lucide-react';
import QueuePage from './pages/QueuePage';
import DocumentationPage from './pages/DocumentationPage';
import MedicationsPage from './pages/MedicationsPage';
import RiskPage from './pages/RiskPage';
import ChronosPage from './pages/ChronosPage';
import DashboardPage from './pages/DashboardPage';
const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'queue', label: 'Queue', icon: Users },
    { id: 'documentation', label: 'Documentation', icon: Pill },
    { id: 'medications', label: 'Medications', icon: Shield },
    { id: 'risk', label: 'Risk', icon: Heart },
    { id: 'chronos', label: 'Chronos ICU', icon: Heart },
];
export default function App() {
    const [activePanel, setActivePanel] = useState('dashboard');
    const renderPanel = () => {
        switch (activePanel) {
            case 'dashboard':
                return _jsx(DashboardPage, {});
            case 'queue':
                return _jsx(QueuePage, {});
            case 'documentation':
                return _jsx(DocumentationPage, {});
            case 'medications':
                return _jsx(MedicationsPage, {});
            case 'risk':
                return _jsx(RiskPage, {});
            case 'chronos':
                return _jsx(ChronosPage, {});
            default:
                return null;
        }
    };
    return (_jsx("div", { className: "min-h-screen p-4 md:p-6 bg-white text-gray-900", children: _jsxs("div", { className: "mx-auto max-w-6xl flex flex-col gap-4", children: [_jsxs(Card, { className: "p-4 flex flex-row items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Drawer, { children: [_jsx(Drawer.Trigger, { children: _jsx(Button, { isIconOnly: true, variant: "ghost", "aria-label": "Open menu", children: _jsx(Menu, { size: 18 }) }) }), _jsxs(Drawer.Content, { children: [_jsx(Drawer.Header, { children: _jsx("span", { className: "text-lg font-semibold", children: "Menu" }) }), _jsx(Drawer.Body, { className: "flex flex-col gap-2", children: NAV_ITEMS.map((item) => (_jsxs(Button, { variant: activePanel === item.id ? 'primary' : 'ghost', onPress: () => setActivePanel(item.id), className: "justify-start", children: [_jsx(item.icon, { size: 16 }), item.label] }, item.id))) })] })] }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl md:text-2xl font-semibold", children: "Hospital Platform" }), _jsx("p", { className: "text-sm text-gray-500", children: "AI-Powered Healthcare System" })] })] }), _jsx(Badge, { color: "accent", variant: "soft", children: "v1.0.0" })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: NAV_ITEMS.map((item) => (_jsxs(Button, { variant: activePanel === item.id ? 'primary' : 'outline', onPress: () => setActivePanel(item.id), children: [_jsx(item.icon, { size: 16 }), item.label] }, item.id))) }), _jsx("div", { children: renderPanel() }), _jsx(Toast.Provider, {})] }) }));
}
