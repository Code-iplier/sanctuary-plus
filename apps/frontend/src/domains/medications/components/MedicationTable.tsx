import React from 'react';
import { Badge, Button, Card } from '@heroui/react';
import { Pill, ShieldAlert } from 'lucide-react';
import type { Medication, MedicationStatus } from '../lib/medication-utils';

type MedicationTableProps = {
  medications: Medication[];
  onReconcile?: (medication: Medication) => void;
};

const STATUS_COLOR: Record<MedicationStatus, 'success' | 'warning' | 'danger'> =
  {
    active: 'success',
    review: 'warning',
    held: 'warning',
    discontinued: 'danger',
    flagged: 'danger',
  };

export function MedicationTable({
  medications,
  onReconcile,
}: MedicationTableProps) {
  return (
    <Card className="p-0 mt-3 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="p-3">Medication</th>
              <th className="p-3">Dose</th>
              <th className="p-3">Status</th>
              <th className="p-3">Schedule</th>
              {onReconcile && <th className="p-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {medications.map((med) => (
              <tr key={med.id} className="border-t border-gray-100 align-top">
                <td className="p-3">
                  <div className="inline-flex items-center gap-2 font-medium">
                    <Pill size={16} className="text-primary" /> {med.name}
                  </div>
                  {med.allergies.length > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                      <ShieldAlert size={12} /> Allergy conflict
                    </div>
                  )}
                </td>
                <td className="p-3 text-sm text-gray-600">{med.dose}</td>
                <td className="p-3">
                  <Badge color={STATUS_COLOR[med.status]} variant="soft">
                    {med.status}
                  </Badge>
                </td>
                <td className="p-3 text-sm text-gray-600">{med.scheduled}</td>
                {onReconcile && (
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => onReconcile(med)}
                    >
                      Reconcile
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
