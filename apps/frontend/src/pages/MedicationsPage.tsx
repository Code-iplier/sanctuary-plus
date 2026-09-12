import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, Tabs } from '@heroui/react';
import { AlertTriangle, Building2, Home, ShieldCheck } from 'lucide-react';
import {
  createMedication,
  getMedicationAudit,
  getMedicationAllergies,
  reportMedicationAllergy,
  getMedicationComparison,
  getMedicationSafety,
  getMedications,
  reconcileMedication,
  verifyMedication,
  type MedicationInteraction,
  type MedicationDiscrepancy,
  type MedicationAuditEvent,
  type ReconciliationDecision,
  type MedicationAccess,
} from '../domains/medications/api/medications.client';
import { MedicationTable } from '../domains/medications/components/MedicationTable';
import { MedicationComparison } from '../domains/medications/components/MedicationComparison';
import {
  filterMedications,
  summarizeMedications,
  type Medication,
  type MedicationStatus,
} from '../domains/medications/lib/medication-utils';
import type { Session } from '../queue/types';

const STATUSES: Array<MedicationStatus | 'all'> = [
  'all',
  'active',
  'review',
  'flagged',
];
const PATIENT_ID = 'patient-001';
const DECISIONS: ReconciliationDecision[] = [
  'continue',
  'modify',
  'hold',
  'discontinue',
  'replace',
  'review',
];

type MedicationsPageProps = {
  session: Exclude<Session, null>;
};

export default function MedicationsPage({ session }: MedicationsPageProps) {
  const isStaff = session.role === 'staff';
  const access = useMemo<MedicationAccess>(
    () =>
      isStaff
        ? { role: 'staff', accessToken: session.accessToken }
        : {
            role: 'patient',
            patientId: session.patientId,
            accessToken: session.accessToken,
          },
    [isStaff, session],
  );
  const patientId = isStaff ? PATIENT_ID : session.patientId;
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<
    Array<{
      id: string;
      substance: string;
      reaction: string;
      severity: string;
      status?: string;
    }>
  >([]);
  const [interactions, setInteractions] = useState<MedicationInteraction[]>([]);
  const [discrepancies, setDiscrepancies] = useState<MedicationDiscrepancy[]>(
    [],
  );
  const [auditEvents, setAuditEvents] = useState<MedicationAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MedicationStatus | 'all'>(
    'all',
  );
  const [selected, setSelected] = useState<Medication | null>(null);
  const [decision, setDecision] = useState<ReconciliationDecision>('continue');
  const [reason, setReason] = useState('');
  const [verificationReason, setVerificationReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allergyForm, setAllergyForm] = useState({
    substance: '',
    reaction: '',
  });
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    strength: '',
    dose: '',
    unit: 'mg',
    route: 'oral',
    frequency: 'once daily',
    scheduled: '09:00',
    source: 'home' as NonNullable<Medication['source']>,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMedications(patientId, access),
      isStaff
        ? getMedicationSafety(patientId, access)
        : getMedicationAllergies(patientId, access).then((items) => ({
            allergies: items,
            interactions: [],
          })),
      isStaff
        ? getMedicationComparison(patientId, access)
        : Promise.resolve([]),
      isStaff ? getMedicationAudit(patientId, access) : Promise.resolve([]),
    ])
      .then(([items, safety, comparison, audit]) => {
        if (cancelled) return;
        setMedications(items);
        setAllergies(safety.allergies);
        setInteractions(safety.interactions);
        setDiscrepancies(comparison);
        setAuditEvents(audit);
        setSelected(items[0] ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Unable to load medications',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [access, isStaff, patientId]);

  const visibleMedications = useMemo(
    () => filterMedications(medications, query, statusFilter),
    [medications, query, statusFilter],
  );

  const summary = useMemo(
    () => summarizeMedications(medications),
    [medications],
  );

  const handleReconcile = (medication: Medication) => {
    setSelected(medication);
    setDecision('continue');
    setReason('');
    setMessage(null);
  };

  const openAddForm = (source: NonNullable<Medication['source']>) => {
    setNewMedication((current) => ({ ...current, source }));
    setShowAddForm(true);
    setMessage(null);
  };

  const refreshSafety = async () => {
    const [safety, comparison] = await Promise.all([
      isStaff
        ? getMedicationSafety(patientId, access)
        : getMedicationAllergies(patientId, access).then((items) => ({
            allergies: items,
            interactions: [],
          })),
      isStaff
        ? getMedicationComparison(patientId, access)
        : Promise.resolve([]),
    ]);
    setAllergies(safety.allergies);
    setInteractions(safety.interactions);
    setDiscrepancies(comparison);
    setAuditEvents(isStaff ? await getMedicationAudit(patientId, access) : []);
  };

  const submitReconciliation = async () => {
    if (!selected || !reason.trim()) return;
    setSaving(true);
    try {
      await reconcileMedication(selected.id, access, {
        decision,
        reason,
        changedBy: 'demo-clinician',
      });
      const updated = await getMedications(patientId, access);
      setMedications(updated);
      setSelected(updated.find((item) => item.id === selected.id) ?? null);
      await refreshSafety();
      setMessage('Reconciliation decision saved');
      setReason('');
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Unable to save reconciliation decision',
      );
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async (
    verificationStatus: 'verified' | 'rejected',
  ) => {
    if (!selected || !verificationReason.trim()) return;
    setSaving(true);
    try {
      const updated = await verifyMedication(selected.id, access, {
        verificationStatus,
        reason: verificationReason,
        changedBy:
          session.role === 'staff'
            ? (session.username ?? session.staffName)
            : 'staff',
      });
      setMedications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelected(updated);
      setVerificationReason('');
      setMessage(`Medication ${verificationStatus}`);
      await refreshSafety();
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Unable to update verification status',
      );
    } finally {
      setSaving(false);
    }
  };

  const submitMedication = async () => {
    if (
      !newMedication.name.trim() ||
      !newMedication.strength.trim() ||
      !newMedication.dose.trim()
    )
      return;
    setSaving(true);
    try {
      const created = await createMedication(patientId, access, {
        ...newMedication,
      });
      setMedications((current) => [...current, created]);
      setSelected(created);
      await refreshSafety();
      setShowAddForm(false);
      setNewMedication({
        name: '',
        strength: '',
        dose: '',
        unit: 'mg',
        route: 'oral',
        frequency: 'once daily',
        scheduled: '09:00',
        source: 'home',
      });
      setMessage('Medication added for reconciliation');
    } catch (err: unknown) {
      setMessage(
        err instanceof Error ? err.message : 'Unable to add medication',
      );
    } finally {
      setSaving(false);
    }
  };

  const submitAllergy = async () => {
    if (!allergyForm.substance.trim() || !allergyForm.reaction.trim()) return;
    setSaving(true);
    try {
      const created = await reportMedicationAllergy(
        patientId,
        access,
        allergyForm,
      );
      setAllergies((current) => [...current, created]);
      setAllergyForm({ substance: '', reaction: '' });
      setShowAllergyForm(false);
      setMessage('Allergy report submitted for staff review');
    } catch (err: unknown) {
      setMessage(
        err instanceof Error ? err.message : 'Unable to report allergy',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Medication Reconciliation</h2>
            <p className="text-sm text-gray-500">
              RxNorm lookup • DrugBank DDI • Allergy checks
            </p>
          </div>
          <Badge color="accent" variant="soft">
            {summary.total} active meds
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-semibold">{summary.active}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">Review</p>
          <p className="text-2xl font-semibold">{summary.review}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">Flagged</p>
          <p className="text-2xl font-semibold">{summary.flagged}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">High risk</p>
          <p className="text-2xl font-semibold">{summary.highRisk}</p>
        </Card>
      </div>

      {error && (
        <Alert status="danger">
          {error}. Start the backend and retry this page.
        </Alert>
      )}
      {message && <Alert status="success">{message}</Alert>}

      <Card className="border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Build comparison list
            </p>
            <p className="text-xs text-slate-500">
              Add the patient&apos;s home list and hospital orders separately.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onPress={() => openAddForm('home')}>
              <Home size={16} /> Add home prescription
            </Button>
            {isStaff && (
              <Button variant="primary" onPress={() => openAddForm('hospital')}>
                <Building2 size={16} /> Add hospital order
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Search medication..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
          fullWidth
        />
        {showAddForm && (
          <Button variant="ghost" onPress={() => setShowAddForm(false)}>
            Close form
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">
                Add{' '}
                {newMedication.source === 'home'
                  ? 'home prescription'
                  : 'hospital order'}
              </h3>
              <p className="text-xs text-slate-500">
                This medication will appear in the corresponding comparison
                column.
              </p>
            </div>
            <Badge
              color={newMedication.source === 'home' ? 'default' : 'accent'}
              variant="soft"
            >
              {newMedication.source === 'home' ? 'Home list' : 'Hospital list'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(
              [
                'name',
                'strength',
                'dose',
                'unit',
                'route',
                'frequency',
                'scheduled',
              ] as const
            ).map((field) => (
              <Input
                key={field}
                placeholder={field[0].toUpperCase() + field.slice(1)}
                value={newMedication[field]}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setNewMedication((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
                fullWidth
              />
            ))}
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="font-medium">Prescription source</span>
              <select
                value={newMedication.source}
                onChange={(event) =>
                  setNewMedication((current) => ({
                    ...current,
                    source: event.target.value as typeof current.source,
                  }))
                }
                className="min-h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="home">Home prescription</option>
                {isStaff && <option value="hospital">Hospital order</option>}
                {isStaff && (
                  <option value="external">External medication</option>
                )}
                {isStaff && (
                  <option value="discharge">Discharge medication</option>
                )}
              </select>
            </label>
          </div>
          <Button
            className="mt-3"
            variant="primary"
            isDisabled={
              saving ||
              !newMedication.name.trim() ||
              !newMedication.strength.trim() ||
              !newMedication.dose.trim()
            }
            onPress={submitMedication}
          >
            {saving ? 'Saving...' : 'Add to reconciliation'}
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'primary' : 'outline'}
            onPress={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status}
          </Button>
        ))}
      </div>

      <Tabs defaultSelectedKey={isStaff ? 'comparison' : 'medications'}>
        <Tabs.List
          aria-label="Medication sections"
          className="flex flex-wrap gap-1"
        >
          {isStaff && (
            <Tabs.Tab id="comparison">Compare prescriptions</Tabs.Tab>
          )}
          <Tabs.Tab id="reconciliation">All medications</Tabs.Tab>
          {!isStaff && (
            <Tabs.Tab id="medications">My medication workflow</Tabs.Tab>
          )}
          <Tabs.Tab id="allergies">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={16} /> Allergies
            </span>
          </Tabs.Tab>
          {isStaff && (
            <Tabs.Tab id="interactions">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={16} /> Interactions
              </span>
            </Tabs.Tab>
          )}
          {isStaff && <Tabs.Tab id="audit">Audit</Tabs.Tab>}
        </Tabs.List>

        {isStaff && (
          <Tabs.Panel id="comparison">
            <MedicationComparison
              medications={medications}
              discrepancies={discrepancies}
              onReconcile={handleReconcile}
            />
          </Tabs.Panel>
        )}

        {!isStaff && (
          <Tabs.Panel id="medications">
            <Card className="mt-3 border border-teal-100 bg-teal-50/60 p-4">
              <h3 className="font-semibold text-teal-950">
                Your medication information
              </h3>
              <p className="mt-1 text-sm text-teal-900/80">
                Add medicines you take at home, including details remembered
                from memory. Staff must verify them before they become part of
                the hospital reconciliation record.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-teal-900">
                <Badge color="default" variant="soft">
                  Patient-submitted
                </Badge>
                <Badge color="warning" variant="soft">
                  Awaiting staff verification
                </Badge>
              </div>
            </Card>
          </Tabs.Panel>
        )}

        <Tabs.Panel id="reconciliation">
          {loading ? (
            <Card className="p-6 mt-3 text-sm text-gray-500">
              Loading medication record...
            </Card>
          ) : visibleMedications.length === 0 ? (
            <Card className="p-6 mt-3 text-sm text-gray-500">
              No medications match the current filters.
            </Card>
          ) : (
            <MedicationTable
              medications={visibleMedications}
              onReconcile={isStaff ? handleReconcile : undefined}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel id="allergies">
          <div className="flex flex-col gap-2 mt-3">
            {!isStaff && (
              <Card className="border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-amber-950">
                      Report an allergy or reaction
                    </h3>
                    <p className="text-xs text-amber-900/80">
                      Staff will review this report before relying on it
                      clinically.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onPress={() => setShowAllergyForm((current) => !current)}
                  >
                    {showAllergyForm ? 'Close' : 'Report allergy'}
                  </Button>
                </div>
                {showAllergyForm && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <Input
                      placeholder="Substance, e.g. Penicillin"
                      value={allergyForm.substance}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setAllergyForm((current) => ({
                          ...current,
                          substance: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Reaction, e.g. Rash"
                      value={allergyForm.reaction}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setAllergyForm((current) => ({
                          ...current,
                          reaction: event.target.value,
                        }))
                      }
                    />
                    <Button
                      className="md:col-span-2"
                      variant="primary"
                      isDisabled={
                        saving ||
                        !allergyForm.substance.trim() ||
                        !allergyForm.reaction.trim()
                      }
                      onPress={submitAllergy}
                    >
                      {saving ? 'Submitting...' : 'Submit for review'}
                    </Button>
                  </div>
                )}
              </Card>
            )}
            {allergies.map((allergy) => (
              <Alert key={allergy.id} status="warning" className="rounded-lg">
                <div className="flex items-center justify-between w-full">
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle size={16} /> {allergy.substance}:{' '}
                    {allergy.reaction}
                  </span>
                  <Badge
                    color={
                      allergy.status === 'unverified' ? 'warning' : 'default'
                    }
                    variant="soft"
                  >
                    {allergy.status === 'unverified'
                      ? 'Staff review pending'
                      : 'Active'}
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        </Tabs.Panel>

        {isStaff && (
          <Tabs.Panel id="interactions">
            <div className="flex flex-col gap-2 mt-3">
              {interactions.map((interaction) => (
                <Alert
                  key={interaction.id}
                  status={
                    interaction.severity === 'high' ||
                    interaction.severity === 'critical'
                      ? 'danger'
                      : interaction.severity === 'moderate'
                        ? 'warning'
                        : 'success'
                  }
                  className="rounded-lg"
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck size={16} />{' '}
                      {interaction.medications.join(' + ')}:{' '}
                      {interaction.description}
                    </span>
                    <Badge
                      color={
                        interaction.severity === 'high' ||
                        interaction.severity === 'critical'
                          ? 'danger'
                          : interaction.severity === 'moderate'
                            ? 'warning'
                            : 'success'
                      }
                      variant="soft"
                    >
                      {interaction.severity}
                    </Badge>
                  </div>
                </Alert>
              ))}
            </div>
          </Tabs.Panel>
        )}

        {isStaff && (
          <Tabs.Panel id="audit">
            <div className="flex flex-col gap-2 mt-3">
              {auditEvents.length === 0 ? (
                <Card className="p-4 text-sm text-gray-500">
                  No medication audit events recorded yet.
                </Card>
              ) : (
                auditEvents.map((event) => (
                  <Card key={event.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{event.action}</p>
                        <p className="text-xs text-gray-500">
                          {event.actorId} ·{' '}
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {event.reason && (
                        <Badge color="default" variant="soft">
                          Reason recorded
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Tabs.Panel>
        )}
      </Tabs>

      {isStaff && selected && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="font-semibold">Reconcile {selected.name}</h3>
            <Badge
              color={
                selected.status === 'active'
                  ? 'success'
                  : selected.status === 'discontinued'
                    ? 'danger'
                    : 'warning'
              }
              variant="soft"
            >
              {selected.status}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-gray-700">
            <p>
              <span className="font-medium">Name:</span> {selected.name}
            </p>
            <p>
              <span className="font-medium">Dose:</span> {selected.dose}
            </p>
            <p>
              <span className="font-medium">Route:</span> {selected.route}
            </p>
            <p>
              <span className="font-medium">Schedule:</span>{' '}
              {selected.scheduled}
            </p>
            <p>
              <span className="font-medium">Allergies:</span>{' '}
              {selected.allergies.length
                ? selected.allergies.join(', ')
                : 'None listed'}
            </p>
            <p>
              <span className="font-medium">Risk:</span> {selected.risk}
            </p>
            <p>
              <span className="font-medium">Verification:</span>{' '}
              {selected.verificationStatus ?? 'unverified'}
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {selected.verificationStatus !== 'verified' && (
              <>
                <Input
                  placeholder="Reason for verification decision"
                  value={verificationReason}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setVerificationReason(event.target.value)
                  }
                  fullWidth
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    isDisabled={saving || !verificationReason.trim()}
                    onPress={() => submitVerification('verified')}
                  >
                    Verify submission
                  </Button>
                  <Button
                    variant="outline"
                    isDisabled={saving || !verificationReason.trim()}
                    onPress={() => submitVerification('rejected')}
                  >
                    Reject submission
                  </Button>
                </div>
              </>
            )}
            <label
              className="text-sm font-medium"
              htmlFor="reconciliation-decision"
            >
              Decision
            </label>
            <select
              id="reconciliation-decision"
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as ReconciliationDecision)
              }
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {DECISIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Input
              placeholder="Clinical reason for this decision"
              value={reason}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setReason(event.target.value)
              }
              fullWidth
            />
            <Button
              variant="primary"
              isDisabled={saving || !reason.trim()}
              onPress={submitReconciliation}
            >
              {saving ? 'Saving...' : 'Save reconciliation decision'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
