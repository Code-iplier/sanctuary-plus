import React, { useState } from 'react';
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

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Automated Clinical Documentation
            </h2>
            <p className="text-sm text-gray-500">
              Structured SOAP notes + AI-powered data extraction
            </p>
          </div>
          <Badge color="accent" variant="soft">
            1,247 notes
          </Badge>
        </div>
      </Card>

      <Tabs defaultSelectedKey="notes">
        <Tabs.List aria-label="Documentation sections">
          <Tabs.Tab id="notes">
            <span className="inline-flex items-center gap-1">
              <FileText size={16} /> Notes
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="templates">
            <span className="inline-flex items-center gap-1">
              <Calendar size={16} /> Templates
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="history">
            <span className="inline-flex items-center gap-1">
              <Mic size={16} /> History
            </span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="notes">
          <Card className="p-4 mt-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="Subject (e.g., Daily Progress Note)"
                  value={subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSubject(e.target.value)
                  }
                  fullWidth
                />
                <Input
                  placeholder="Assessment"
                  value={assessment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAssessment(e.target.value)
                  }
                  fullWidth
                />
              </div>
              <Button variant="primary" onPress={() => undefined}>
                Generate SOAP Note
              </Button>
              <EditorContent
                editor={editor}
                className="border rounded-lg min-h-[300px]"
              />
              <p className="text-xs text-gray-500">
                TipTap editor with clinical formatting + structured data
                extraction
              </p>
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="templates">
          <div className="flex flex-col gap-2 mt-3">
            {[
              'Morning H&P Template',
              'Progress Note Template',
              'Discharge Summary Template',
            ].map((tpl) => (
              <Alert key={tpl} status="success" className="rounded-lg">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{tpl}</span>
                  <Badge color="default" variant="soft">
                    Default
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="history">
          <Card className="p-4 mt-3">
            <h3 className="font-medium mb-2">Documentation History</h3>
            <div className="flex flex-col gap-2">
              {historyNotes.map((note) => (
                <Alert key={note} status="default" className="rounded-lg">
                  <div className="flex items-center justify-between w-full">
                    <span>{note}</span>
                    <Badge color="default" variant="soft">
                      Dr. Smith
                    </Badge>
                  </div>
                </Alert>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total notes: 1,247 • Avg. completion: 8.5 minutes
            </p>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Settings hint (icon-only, no Drawer needed for showcase) */}
      <div className="text-right">
        <Button isIconOnly variant="ghost" aria-label="Settings">
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
}
