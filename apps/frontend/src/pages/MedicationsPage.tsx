import { Card, Badge, Button, Input, Tabs, Alert } from '@heroui/react';
import { Pill, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';

type Med = {
  name: string;
  dose: string;
  status: 'active' | 'review' | 'flagged';
};

const MEDS: Med[] = [
  { name: 'Morphine', dose: '5 mg', status: 'active' },
  { name: 'Fentanyl', dose: '100 mcg', status: 'review' },
  { name: 'Heparin', dose: '5000 units', status: 'flagged' },
  { name: 'Insulin', dose: '10 units', status: 'active' },
];

const ALLERGIES = ['Penicillin', 'Sulfa', 'Latex'];

const MED_STATUS_COLOR: Record<
  Med['status'],
  'success' | 'warning' | 'danger'
> = {
  active: 'success',
  review: 'warning',
  flagged: 'danger',
};

export default function MedicationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Medication Reconciliation</h2>
            <p className="text-sm text-gray-500">
              RxNorm lookup • DrugBank DDI • Allergy checks
            </p>
          </div>
          <Badge color="accent" variant="soft">
            {MEDS.length} active meds
          </Badge>
        </div>
      </Card>

      <div className="flex flex-col md:flex-row gap-3">
        <Input placeholder="Search medication..." fullWidth />
        <Button variant="primary" onPress={() => undefined}>
          <Plus size={16} />
          Add Medication
        </Button>
      </div>

      <Tabs defaultSelectedKey="reconciliation">
        <Tabs.List aria-label="Medication sections">
          <Tabs.Tab id="reconciliation">Reconciliation</Tabs.Tab>
          <Tabs.Tab id="allergies">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={16} /> Allergies
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="interactions">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={16} /> Interactions
            </span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="reconciliation">
          <Card className="p-0 mt-3 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-3">Medication</th>
                  <th className="p-3">Dose</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {MEDS.map((med) => (
                  <tr key={med.name} className="border-t border-gray-100">
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Pill size={16} className="text-primary" /> {med.name}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{med.dose}</td>
                    <td className="p-3">
                      <Badge
                        color={MED_STATUS_COLOR[med.status]}
                        variant="soft"
                      >
                        {med.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => undefined}
                      >
                        Reconcile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="allergies">
          <div className="flex flex-col gap-2 mt-3">
            {ALLERGIES.map((allergy) => (
              <Alert key={allergy} status="warning" className="rounded-lg">
                <div className="flex items-center justify-between w-full">
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle size={16} /> {allergy}
                  </span>
                  <Badge color="default" variant="soft">
                    Active
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="interactions">
          <div className="flex flex-col gap-2 mt-3">
            <Alert status="danger" className="rounded-lg">
              <div className="flex items-center justify-between w-full">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle size={16} /> Morphine + Fentanyl: additive
                  respiratory depression
                </span>
                <Badge color="danger" variant="soft">
                  High
                </Badge>
              </div>
            </Alert>
            <Alert status="success" className="rounded-lg">
              <div className="flex items-center justify-between w-full">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} /> No critical interactions for Insulin
                </span>
                <Badge color="success" variant="soft">
                  Clear
                </Badge>
              </div>
            </Alert>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
