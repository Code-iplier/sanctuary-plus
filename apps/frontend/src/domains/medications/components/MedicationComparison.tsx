import React, { useMemo } from 'react';
import { Badge, Button, Card } from '@heroui/react';
import { ArrowRight, Check, Minus, Pill, TriangleAlert } from 'lucide-react';
import type { MedicationDiscrepancy } from '../api/medications.client';
import type { Medication } from '../lib/medication-utils';

type MedicationComparisonProps = {
  medications: Medication[];
  discrepancies: MedicationDiscrepancy[];
  onReconcile: (medication: Medication) => void;
};

type ComparisonRow = {
  key: string;
  name: string;
  home?: Medication;
  hospital?: Medication;
  discrepancy?: MedicationDiscrepancy;
};

const DISCREPANCY_LABEL: Record<MedicationDiscrepancy['type'], string> = {
  'missing-from-current': 'Not ordered',
  'unexpected-current': 'New hospital order',
  'dose-mismatch': 'Dose differs',
  'route-mismatch': 'Route differs',
  'frequency-mismatch': 'Frequency differs',
};

function medicationKey(
  medication: Pick<Medication, 'genericName' | 'name'>,
): string {
  return (medication.genericName || medication.name).trim().toLowerCase();
}

function formatPrescription(medication?: Medication): string {
  if (!medication) return 'Not prescribed';
  return `${medication.dose} ${medication.unit ?? ''} · ${medication.route} · ${medication.frequency ?? 'schedule not specified'}`;
}

function PrescriptionCell({
  medication,
  muted = false,
}: {
  medication?: Medication;
  muted?: boolean;
}) {
  if (!medication) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Minus size={15} /> Not prescribed
      </div>
    );
  }

  return (
    <div className={muted ? 'opacity-60' : ''}>
      <div className="flex items-center gap-2 font-medium text-slate-800">
        <Pill size={15} className="text-cyan-700" />
        {medication.name}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {formatPrescription(medication)}
      </p>
    </div>
  );
}

export function MedicationComparison({
  medications,
  discrepancies,
  onReconcile,
}: MedicationComparisonProps) {
  const rows = useMemo<ComparisonRow[]>(() => {
    const grouped = new Map<string, ComparisonRow>();

    for (const medication of medications) {
      const key = medicationKey(medication);
      const current = grouped.get(key) ?? {
        key,
        name: medication.name,
      };
      if (medication.source === 'home') current.home = medication;
      if (medication.source === 'hospital') current.hospital = medication;
      grouped.set(key, current);
    }

    for (const discrepancy of discrepancies) {
      const matchedMedication = medications.find(
        (medication) => medication.id === discrepancy.medicationIds[0],
      );
      const key = matchedMedication
        ? medicationKey(matchedMedication)
        : (discrepancy.medicationNames[0] ?? discrepancy.id)
            .trim()
            .toLowerCase();
      const current = grouped.get(key) ?? {
        key,
        name: discrepancy.medicationNames[0] ?? discrepancy.id,
      };
      current.discrepancy = discrepancy;
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((first, second) => {
      if (first.discrepancy && !second.discrepancy) return -1;
      if (!first.discrepancy && second.discrepancy) return 1;
      return first.name.localeCompare(second.name);
    });
  }, [medications, discrepancies]);

  const differenceCount = rows.filter((row) => row.discrepancy).length;
  const matchedCount = rows.length - differenceCount;

  return (
    <div className="mt-3 flex flex-col gap-3">
      <Card className="border border-cyan-100 bg-cyan-50/60 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800">
              Medication comparison
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Home prescription vs hospital orders
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Review each difference before deciding what should continue in
              hospital.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge color="danger" variant="soft">
              {differenceCount} to review
            </Badge>
            <Badge color="success" variant="soft">
              {matchedCount} aligned
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_116px] border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <div className="p-3 md:p-4">Home prescription</div>
          <div className="border-l border-slate-200 p-3 md:p-4">
            Hospital order
          </div>
          <div className="border-l border-slate-200 p-3 text-center md:p-4">
            Review
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No medications are available for comparison yet.
          </div>
        ) : (
          rows.map((row) => {
            const hasDifference = Boolean(row.discrepancy);
            const reconcileMedication = row.hospital ?? row.home;
            return (
              <div
                key={row.key}
                className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_116px] border-b border-slate-100 last:border-b-0 ${hasDifference ? 'bg-amber-50/50' : 'bg-white'}`}
              >
                <div className="min-w-0 p-3 md:p-4">
                  <PrescriptionCell
                    medication={row.home}
                    muted={hasDifference && !row.home}
                  />
                </div>
                <div className="min-w-0 border-l border-slate-100 p-3 md:p-4">
                  <PrescriptionCell
                    medication={row.hospital}
                    muted={hasDifference && !row.hospital}
                  />
                </div>
                <div className="flex flex-col items-center justify-center gap-2 border-l border-slate-100 p-2 text-center">
                  {hasDifference ? (
                    <>
                      <Badge color="warning" variant="soft">
                        <span className="inline-flex items-center gap-1">
                          <TriangleAlert size={12} />
                          {DISCREPANCY_LABEL[row.discrepancy!.type]}
                        </span>
                      </Badge>
                      {reconcileMedication && (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => onReconcile(reconcileMedication)}
                        >
                          Review <ArrowRight size={13} />
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check size={14} /> Aligned
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
