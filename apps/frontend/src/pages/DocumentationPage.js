import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, Badge, Button, Input, Tabs, Alert } from '@heroui/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FileText, Calendar, Mic, Settings } from 'lucide-react';
export default function DocumentationPage() {
    const [subject, setSubject] = useState('');
    const [assessment, setAssessment] = useState('');
    const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>Start typing the clinical note here…</p>',
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none min-h-[300px] p-3',
            },
        },
    });
    const historyNotes = [
        'Progress Note — 2h ago',
        'Discharge Summary — 4h ago',
        'Morning H&P — Yesterday',
        'Nursing Note — 3 days ago',
    ];
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Automated Clinical Documentation" }), _jsx("p", { className: "text-sm text-gray-500", children: "Structured SOAP notes + AI-powered data extraction" })] }), _jsx(Badge, { color: "accent", variant: "soft", children: "1,247 notes" })] }) }), _jsxs(Tabs, { defaultSelectedKey: "notes", children: [_jsxs(Tabs.List, { "aria-label": "Documentation sections", children: [_jsx(Tabs.Tab, { id: "notes", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(FileText, { size: 16 }), " Notes"] }) }), _jsx(Tabs.Tab, { id: "templates", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Calendar, { size: 16 }), " Templates"] }) }), _jsx(Tabs.Tab, { id: "history", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Mic, { size: 16 }), " History"] }) })] }), _jsx(Tabs.Panel, { id: "notes", children: _jsx(Card, { className: "p-4 mt-3", children: _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-col md:flex-row gap-3", children: [_jsx(Input, { placeholder: "Subject (e.g., Daily Progress Note)", value: subject, onChange: (e) => setSubject(e.target.value), fullWidth: true }), _jsx(Input, { placeholder: "Assessment", value: assessment, onChange: (e) => setAssessment(e.target.value), fullWidth: true })] }), _jsx(Button, { variant: "primary", onPress: () => undefined, children: "Generate SOAP Note" }), _jsx(EditorContent, { editor: editor, className: "border rounded-lg min-h-[300px]" }), _jsx("p", { className: "text-xs text-gray-500", children: "TipTap editor with clinical formatting + structured data extraction" })] }) }) }), _jsx(Tabs.Panel, { id: "templates", children: _jsx("div", { className: "flex flex-col gap-2 mt-3", children: [
                                'Morning H&P Template',
                                'Progress Note Template',
                                'Discharge Summary Template',
                            ].map((tpl) => (_jsx(Alert, { status: "success", className: "rounded-lg", children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsx("span", { className: "font-medium", children: tpl }), _jsx(Badge, { color: "default", variant: "soft", children: "Default" })] }) }, tpl))) }) }), _jsx(Tabs.Panel, { id: "history", children: _jsxs(Card, { className: "p-4 mt-3", children: [_jsx("h3", { className: "font-medium mb-2", children: "Documentation History" }), _jsx("div", { className: "flex flex-col gap-2", children: historyNotes.map((note) => (_jsx(Alert, { status: "default", className: "rounded-lg", children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsx("span", { children: note }), _jsx(Badge, { color: "default", variant: "soft", children: "Dr. Smith" })] }) }, note))) }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Total notes: 1,247 \u2022 Avg. completion: 8.5 minutes" })] }) })] }), _jsx("div", { className: "text-right", children: _jsx(Button, { isIconOnly: true, variant: "ghost", "aria-label": "Settings", children: _jsx(Settings, { size: 16 }) }) })] }));
}
