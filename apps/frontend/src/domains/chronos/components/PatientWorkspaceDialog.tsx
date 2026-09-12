import React, { useEffect } from 'react';
import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import type { ChronosPatient } from '../model/chronos.types';
import { DetailPanel } from './DetailPanel';
import { PatientHistoryPanel } from './PatientHistoryPanel';

export function PatientWorkspaceDialog({
  patient,
  onClose,
}: {
  patient: ChronosPatient | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!patient) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [patient, onClose]);

  if (!patient) return null;
  return (
    <div
      className="chronos-dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="chronos-patient-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Patient ${patient.patient_id} clinical workspace`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="chronos-dialog-titlebar">
          <div>
            <p>CLINICAL PATIENT WORKSPACE</p>
            <h3>Patient {patient.patient_id}</h3>
          </div>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Close patient workspace"
            onPress={onClose}
          >
            <X size={19} />
          </Button>
        </div>
        <div className="chronos-dialog-content">
          <div>
            <DetailPanel patient={patient} />
          </div>
          <PatientHistoryPanel patient={patient} />
        </div>
      </section>
    </div>
  );
}
