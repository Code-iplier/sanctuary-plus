import React, { useState } from 'react';
import { Badge, Button, Card } from '@heroui/react';
import {
  AlertTriangle,
  Calendar,
  FileText,
  History,
  Link2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  type Device,
  type DeviceConnection,
  type DeviceType,
  formatDeviceDateTime,
  formatEventDateTime,
  formatLabel,
  getDeviceDuration,
  getLocalIsoSlice,
} from '../model/types';
import {
  createConnection,
  createDevice,
  endConnection,
  removeDevice,
  reviewDevice,
} from '../api/wardsync.api';

interface DeviceRegistryProps {
  patientId: string;
  patientName: string;
  devices: Device[];
  connections?: DeviceConnection[];
  onRefresh: () => Promise<void>;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function DeviceRegistry({
  patientId,
  patientName,
  devices,
  connections = [],
  onRefresh,
  onError,
  onSuccess,
}: DeviceRegistryProps) {
  const [loading, setLoading] = useState(false);

  // Add Device Form State
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState<{
    type: DeviceType;
    location: string;
    insertedAt: string;
    indication: string;
    currentUse: string;
    notes: string;
  }>({
    type: 'PERIPHERAL_IV',
    location: '',
    insertedAt: getLocalIsoSlice(),
    indication: '',
    currentUse: '',
    notes: '',
  });

  // Review interaction modal state
  const [reviewingDevice, setReviewingDevice] = useState<Device | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'retain' | 'remove'>('retain');
  const [reviewIndication, setReviewIndication] = useState('');
  const [reviewerName, setReviewerName] = useState('Dr. Sarah Chen, MD');
  const [reviewNotes, setReviewNotes] = useState('');

  // Removal confirmation modal state
  const [removingDevice, setRemovingDevice] = useState<Device | null>(null);
  const [removalReason, setRemovalReason] = useState('No longer clinically required');
  const [removalDateTime, setRemovalDateTime] = useState(getLocalIsoSlice());
  const [removerName, setRemoverName] = useState('Dr. Sarah Chen, MD');
  const [removalNotes, setRemovalNotes] = useState('');

  // History & Timeline Drawer state
  const [showDeviceHistory, setShowDeviceHistory] = useState(false);
  const [selectedLifecycleDevice, setSelectedLifecycleDevice] = useState<Device | null>(null);

  // Attach Connection modal state
  const [connectingDevice, setConnectingDevice] = useState<Device | null>(null);
  const [connectionType, setConnectionType] = useState<
    'FLUID' | 'MEDICATION' | 'BLOOD' | 'NUTRITION' | 'DRAINAGE'
  >('FLUID');
  const [connectionReference, setConnectionReference] = useState('');
  const [connectionStartedAt, setConnectionStartedAt] = useState(getLocalIsoSlice());

  const handleOpenAttachConnection = (device: Device) => {
    setConnectingDevice(device);
    setConnectionType(
      device.type === 'SURGICAL_DRAIN' || device.type === 'URINARY_CATHETER'
        ? 'DRAINAGE'
        : 'FLUID',
    );
    setConnectionReference('');
    setConnectionStartedAt(getLocalIsoSlice());
  };

  const handleConfirmAttach = async () => {
    if (!connectingDevice) return;
    setLoading(true);
    try {
      await createConnection({
        deviceId: connectingDevice.id,
        type: connectionType,
        referenceId: connectionReference.trim() || undefined,
        startedAt: connectionStartedAt
          ? new Date(connectionStartedAt).toISOString()
          : new Date().toISOString(),
      });
      onSuccess(`Line connection attached to ${formatLabel(connectingDevice.type)}.`);
      setConnectingDevice(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not attach connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndConnection = async (connectionId: string) => {
    setLoading(true);
    try {
      await endConnection(connectionId);
      onSuccess('Line connection discontinued.');
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not discontinue connection.');
    } finally {
      setLoading(false);
    }
  };

  const activeDevices = devices.filter((d) => d.status !== 'REMOVED');
  const allDevices = devices;

  const handleOpenAdd = () => {
    setNewDevice({
      type: 'PERIPHERAL_IV',
      location: 'Left forearm',
      insertedAt: getLocalIsoSlice(),
      indication: 'IV hydration & access',
      currentUse: 'IV fluids',
      notes: '',
    });
    setShowAddDevice(true);
  };

  const handleCreate = async () => {
    if (!newDevice.location.trim()) {
      onError('Anatomical site is required.');
      return;
    }
    if (!newDevice.indication.trim()) {
      onError('Clinical indication is required.');
      return;
    }

    setLoading(true);
    try {
      await createDevice({
        patientId,
        type: newDevice.type,
        location: newDevice.location.trim(),
        insertedAt: new Date(newDevice.insertedAt).toISOString(),
        indication: newDevice.indication.trim(),
        currentUse: newDevice.currentUse.trim() || undefined,
        notes: newDevice.notes.trim() || undefined,
        insertedBy: 'Dr. Sarah Chen, MD',
      });
      setShowAddDevice(false);
      onSuccess(`New ${formatLabel(newDevice.type)} registered for ${patientName}.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to register device.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (device: Device) => {
    setReviewingDevice(device);
    setReviewDecision('retain');
    setReviewIndication(device.indication ?? '');
    setReviewerName('Dr. Sarah Chen, MD');
    setReviewNotes('');
  };

  const handleConfirmReview = async () => {
    if (!reviewingDevice) return;
    if (reviewDecision === 'remove') {
      const dev = reviewingDevice;
      setReviewingDevice(null);
      handleOpenRemove(dev);
      return;
    }

    setLoading(true);
    try {
      await reviewDevice(reviewingDevice.id, {
        outcome: 'Retained — indication still present',
        indication: reviewIndication.trim() || reviewingDevice.indication,
        reviewedBy: reviewerName.trim() || 'Dr. Sarah Chen, MD',
        notes: reviewNotes.trim() || undefined,
      });
      setReviewingDevice(null);
      onSuccess(`Device ${formatLabel(reviewingDevice.type)} reviewed and retained.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Review submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRemove = (device: Device) => {
    setRemovingDevice(device);
    setRemovalReason('No longer clinically required');
    setRemovalDateTime(getLocalIsoSlice());
    setRemoverName('Dr. Sarah Chen, MD');
    setRemovalNotes('');
  };

  const handleConfirmRemove = async () => {
    if (!removingDevice) return;
    setLoading(true);
    try {
      await removeDevice(removingDevice.id, {
        removalReason,
        removedAt: new Date(removalDateTime).toISOString(),
        removedBy: removerName.trim() || 'Dr. Sarah Chen, MD',
        notes: removalNotes.trim() || undefined,
      });
      setRemovingDevice(null);
      onSuccess(`Device ${formatLabel(removingDevice.type)} removed and archived in history.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Device removal failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">
            Invasive Devices ({activeDevices.length})
          </h3>
          <p className="text-xs text-slate-500">
            Track invasive devices, their purpose, status, and lifecycle history.
          </p>
        </div>
        <Button size="sm" variant="outline" onPress={handleOpenAdd}>
          <Plus size={14} /> Add Device
        </Button>
      </div>

      {/* NEW INVASIVE DEVICE FORM */}
      {showAddDevice && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              NEW INVASIVE DEVICE
            </span>
            <Button size="sm" variant="ghost" onPress={() => setShowAddDevice(false)}>
              <X size={14} /> Cancel
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="block text-slate-700 font-medium mb-1">Device Type *</span>
              <select
                value={newDevice.type}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, type: e.target.value as DeviceType })
                }
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium"
              >
                <option value="PERIPHERAL_IV">Peripheral IV</option>
                <option value="CENTRAL_LINE">Central Line</option>
                <option value="URINARY_CATHETER">Urinary Catheter</option>
                <option value="SURGICAL_DRAIN">Surgical Drain</option>
              </select>
            </label>

            <label className="text-xs">
              <span className="block text-slate-700 font-medium mb-1">Anatomical Site *</span>
              <input
                type="text"
                value={newDevice.location}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, location: e.target.value })
                }
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                placeholder="e.g. Left forearm, Right IJ"
              />
            </label>

            <label className="text-xs">
              <span className="block text-slate-700 font-medium mb-1">
                Inserted Date &amp; Time *
              </span>
              <input
                type="datetime-local"
                value={newDevice.insertedAt}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, insertedAt: e.target.value })
                }
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium"
              />
            </label>

            <label className="text-xs">
              <span className="block text-slate-700 font-medium mb-1">
                Clinical Indication *
              </span>
              <input
                type="text"
                value={newDevice.indication}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, indication: e.target.value })
                }
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                placeholder="e.g. IV antibiotics, Accurate urine output monitoring"
              />
            </label>

            <label className="text-xs">
              <span className="block text-slate-700 font-medium mb-1">
                Current Connection / Use
              </span>
              <input
                type="text"
                value={newDevice.currentUse}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, currentUse: e.target.value })
                }
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                placeholder="e.g. Antibiotic infusion, IV fluids, currently unused"
              />
            </label>

            <label className="text-xs">
              <span className="block text-slate-700 font-medium mb-1">Notes</span>
              <input
                type="text"
                value={newDevice.notes}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, notes: e.target.value })
                }
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                placeholder="Optional insertion notes..."
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" onPress={() => setShowAddDevice(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={loading}
              onPress={() => void handleCreate()}
            >
              Add Device
            </Button>
          </div>
        </div>
      )}

      {/* Active Device Cards List */}
      <div className="space-y-2.5">
        {activeDevices.length > 0 ? (
          activeDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              connections={connections}
              onReview={handleOpenReview}
              onRemove={handleOpenRemove}
              onViewTimeline={() => setSelectedLifecycleDevice(device)}
              onAttachConnection={handleOpenAttachConnection}
              onEndConnection={handleEndConnection}
            />
          ))
        ) : (
          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No active invasive devices documented. Click &quot;+ Add Device&quot; to register a device.
          </div>
        )}
      </div>

      {/* Device History Trigger & View */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onPress={() => setShowDeviceHistory(!showDeviceHistory)}
          >
            <History size={14} />
            {showDeviceHistory
              ? 'Hide Device History'
              : `View Device History (${allDevices.length} total)`}
          </Button>
          <span className="text-xs text-slate-400">
            {allDevices.filter((d) => d.status === 'REMOVED').length} archived / removed
          </span>
        </div>

        {showDeviceHistory && (
          <div className="space-y-2 rounded-lg bg-slate-50/70 p-3 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Patient Device Lifecycle History
            </span>
            {allDevices.map((device) => {
              const isRemoved = device.status === 'REMOVED';
              return (
                <div
                  key={device.id}
                  className="p-2.5 rounded bg-white border border-slate-200 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {formatLabel(device.type)}
                      </span>
                      <span className="text-slate-500">· {device.location}</span>
                      <Badge
                        color={isRemoved ? 'default' : 'success'}
                        variant="soft"
                        className="text-[10px]"
                      >
                        {device.status}
                      </Badge>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Inserted: {formatDeviceDateTime(device.insertedAt)} ({getDeviceDuration(device.insertedAt)})
                      {' '}· Indication: <span className="text-slate-700">{device.indication}</span>
                    </p>
                    {isRemoved && (
                      <p className="text-red-700 font-medium mt-0.5">
                        Removed: {device.removedAt ? formatDeviceDateTime(device.removedAt) : 'Yes'}
                        {device.removalReason ? ` (Reason: ${device.removalReason})` : ''}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => setSelectedLifecycleDevice(device)}
                  >
                    <History size={12} /> View Timeline
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CLINICAL REVIEW WORKFLOW */}
      {reviewingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Clinical Review — {formatLabel(reviewingDevice.type)}
              </h3>
              <Button size="sm" variant="ghost" onPress={() => setReviewingDevice(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Device Identity:</span>
                <span className="font-semibold text-slate-800">
                  {formatLabel(reviewingDevice.type)} · {reviewingDevice.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Indication:</span>
                <span className="font-medium text-slate-800">{reviewingDevice.indication}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inserted:</span>
                <span className="text-slate-700">
                  {formatDeviceDateTime(reviewingDevice.insertedAt)} ({getDeviceDuration(reviewingDevice.insertedAt)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <Badge
                  color={reviewingDevice.status === 'REVIEW_DUE' ? 'warning' : 'default'}
                  variant="soft"
                  className="text-[10px]"
                >
                  {reviewingDevice.status}
                </Badge>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Is this device still clinically required?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision('retain')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                    reviewDecision === 'retain'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Yes — retain device
                  <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                    Indication remains clinically present
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('remove')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                    reviewDecision === 'remove'
                      ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  No — remove device
                  <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                    Plan immediate removal &amp; discontinue
                  </span>
                </button>
              </div>
            </div>

            {reviewDecision === 'retain' ? (
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="block text-slate-600 mb-1">Review Outcome</span>
                  <input
                    type="text"
                    disabled
                    value="Retained — indication still present"
                    className="h-8 w-full rounded border border-slate-200 bg-slate-100 px-2 text-xs font-medium text-slate-700"
                  />
                </div>

                <div>
                  <span className="block text-slate-600 mb-1">
                    Update Clinical Indication (if modified)
                  </span>
                  <input
                    type="text"
                    value={reviewIndication}
                    onChange={(e) => setReviewIndication(e.target.value)}
                    placeholder="e.g. Maintenance access, hydration stepdown"
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                  />
                </div>

                <div>
                  <span className="block text-slate-600 mb-1">Clinician Reviewer</span>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                  />
                </div>

                <div>
                  <span className="block text-slate-600 mb-1">Review Notes</span>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional clinical rationale..."
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Proceeding will open the removal workflow to record removal timestamp, reason, and archiving.
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button size="sm" variant="outline" onPress={() => setReviewingDevice(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={reviewDecision === 'retain' ? 'primary' : 'danger-soft'}
                isDisabled={loading}
                onPress={() => void handleConfirmReview()}
              >
                {reviewDecision === 'retain' ? 'Confirm & Retain Device' : 'Proceed to Removal'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 2: REMOVAL CONFIRMATION WORKFLOW */}
      {removingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trash2 size={18} className="text-red-600" />
                <h3 className="font-bold text-slate-900 text-base">Remove Invasive Device?</h3>
              </div>
              <Button size="sm" variant="ghost" onPress={() => setRemovingDevice(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-red-50/50 border border-red-200 text-xs space-y-1">
              <p className="font-bold text-red-950">
                {formatLabel(removingDevice.type)} · {removingDevice.location}
              </p>
              <p className="text-red-800">
                Inserted: {formatDeviceDateTime(removingDevice.insertedAt)} ({getDeviceDuration(removingDevice.insertedAt)})
              </p>
              <p className="text-red-700">Indication: {removingDevice.indication}</p>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="block text-slate-700 font-medium mb-1">
                  Removal Date &amp; Time *
                </span>
                <input
                  type="datetime-local"
                  value={removalDateTime}
                  onChange={(e) => setRemovalDateTime(e.target.value)}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                />
              </div>

              <div>
                <span className="block text-slate-700 font-medium mb-1">Removal Reason *</span>
                <select
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium"
                >
                  <option value="No longer clinically required">No longer clinically required</option>
                  <option value="Therapy completed">Therapy completed</option>
                  <option value="Device replaced">Device replaced</option>
                  <option value="Complication/problem">Complication/problem</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <span className="block text-slate-700 font-medium mb-1">Removed By *</span>
                <input
                  type="text"
                  value={removerName}
                  onChange={(e) => setRemoverName(e.target.value)}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                />
              </div>

              <div>
                <span className="block text-slate-700 font-medium mb-1">Removal Notes</span>
                <input
                  type="text"
                  value={removalNotes}
                  onChange={(e) => setRemovalNotes(e.target.value)}
                  placeholder="e.g. Line discontinued without complication, site clean"
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                />
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              Note: This device will be marked as <strong>REMOVED</strong> and archived in the permanent patient device history. It is never deleted.
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button size="sm" variant="outline" onPress={() => setRemovingDevice(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger-soft"
                isDisabled={loading}
                onPress={() => void handleConfirmRemove()}
              >
                Confirm Device Removal
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 3: DETAILED DEVICE LIFECYCLE TIMELINE */}
      {selectedLifecycleDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Device Lifecycle Timeline</h3>
              </div>
              <Button size="sm" variant="ghost" onPress={() => setSelectedLifecycleDevice(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 shrink-0">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm">
                  {formatLabel(selectedLifecycleDevice.type)}
                </span>
                <Badge
                  color={
                    selectedLifecycleDevice.status === 'ACTIVE'
                      ? 'success'
                      : selectedLifecycleDevice.status === 'REVIEW_DUE'
                        ? 'warning'
                        : 'default'
                  }
                  variant="soft"
                  className="text-[10px]"
                >
                  {selectedLifecycleDevice.status}
                </Badge>
              </div>
              <p className="text-slate-600">
                Site: <span className="font-medium text-slate-800">{selectedLifecycleDevice.location}</span>
                {' '}· Duration: <span className="font-medium text-slate-800">{getDeviceDuration(selectedLifecycleDevice.insertedAt)}</span>
              </p>
              <p className="text-slate-600">
                Current Indication: <span className="font-medium text-slate-800">{selectedLifecycleDevice.indication}</span>
              </p>
              {selectedLifecycleDevice.currentUse && (
                <p className="text-slate-600">
                  Current Use: <span className="font-medium text-slate-800">{selectedLifecycleDevice.currentUse}</span>
                </p>
              )}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                Chronological Events Log
              </span>

              {selectedLifecycleDevice.events && selectedLifecycleDevice.events.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedLifecycleDevice.events.map((evt) => (
                    <div key={evt.id} className="relative">
                      <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-mono text-slate-500">
                            {formatEventDateTime(evt.timestamp)}
                          </span>
                          {evt.performedBy && (
                            <span className="text-slate-500">{evt.performedBy}</span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800 mt-0.5">{evt.title}</p>
                        <p className="text-slate-600 mt-0.5">{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded">
                  No previous events recorded for this device.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <Button size="sm" variant="outline" onPress={() => setSelectedLifecycleDevice(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 4: ATTACH LINE / CONNECTION WORKFLOW */}
      {connectingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-md p-5 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Attach Line / Connection
                </h3>
              </div>
              <Button size="sm" variant="ghost" onPress={() => setConnectingDevice(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Device:</span>
                <span className="font-semibold text-slate-800">
                  {formatLabel(connectingDevice.type)} · {connectingDevice.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device Indication:</span>
                <span className="text-slate-700">{connectingDevice.indication}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Connection Type *
                </label>
                <select
                  value={connectionType}
                  onChange={(e) =>
                    setConnectionType(
                      e.target.value as
                        | 'FLUID'
                        | 'MEDICATION'
                        | 'BLOOD'
                        | 'NUTRITION'
                        | 'DRAINAGE',
                    )
                  }
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium"
                >
                  <option value="FLUID">💧 Fluid Infusion (e.g. Normal Saline, Hartmann&apos;s)</option>
                  <option value="MEDICATION">💊 Medication Infusion (e.g. Antibiotics, Vasopressors)</option>
                  <option value="BLOOD">🩸 Blood Product (e.g. Packed RBCs, Platelets)</option>
                  <option value="NUTRITION">🧪 Parenteral Nutrition (TPN / Lipids)</option>
                  <option value="DRAINAGE">🪣 Drainage (Closed Foley, Jackson-Pratt vacuum)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Infusion / Line Reference *
                </label>
                <input
                  type="text"
                  value={connectionReference}
                  onChange={(e) => setConnectionReference(e.target.value)}
                  placeholder="e.g. Normal Saline 100mL/hr, Norepinephrine 0.05mcg/kg/min"
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Started Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={connectionStartedAt}
                  onChange={(e) => setConnectionStartedAt(e.target.value)}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button size="sm" variant="outline" onPress={() => setConnectingDevice(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                isDisabled={loading || !connectionReference.trim()}
                onPress={() => void handleConfirmAttach()}
              >
                {loading ? 'Attaching...' : 'Attach Connection'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

function DeviceCard({
  device,
  connections = [],
  onReview,
  onRemove,
  onViewTimeline,
  onAttachConnection,
  onEndConnection,
}: {
  device: Device;
  connections?: DeviceConnection[];
  onReview: (device: Device) => void;
  onRemove: (device: Device) => void;
  onViewTimeline: (device: Device) => void;
  onAttachConnection: (device: Device) => void;
  onEndConnection: (connectionId: string) => void;
}) {
  const durationText = getDeviceDuration(device.insertedAt);
  const isReviewDue = device.status === 'REVIEW_DUE';
  const activeConnections = connections.filter(
    (c) => c.deviceId === device.id && !c.endedAt,
  );
  const endedConnections = connections.filter(
    (c) => c.deviceId === device.id && Boolean(c.endedAt),
  );

  return (
    <Card className="p-3.5 border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
              {device.type.replace(/_/g, ' ')}
            </span>
            <Badge
              color={isReviewDue ? 'warning' : 'default'}
              variant="soft"
              className="text-[10px]"
            >
              {device.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <p className="text-xs text-slate-800 font-medium mt-1">
            Site: <span className="text-slate-900 font-semibold">{device.location ?? 'Not documented'}</span>
          </p>

          <p className="text-xs text-slate-600 mt-0.5">
            Indication: <span className="text-slate-900 font-medium">{device.indication ?? 'None'}</span>
          </p>

          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar size={12} className="text-slate-400" />
            Inserted: <span className="text-slate-700">{formatDeviceDateTime(device.insertedAt)} · {durationText}</span>
          </p>

          {device.currentUse && (
            <p className="text-xs text-blue-800 bg-blue-50/70 border border-blue-100 rounded px-2 py-0.5 mt-1.5 inline-block">
              Current use: <span className="font-medium">{device.currentUse}</span>
            </p>
          )}

          {/* Active Connections & Infusions */}
          <div className="mt-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Link2 size={12} className="text-blue-600" />
                Line Connections ({activeConnections.length})
              </span>
              <button
                type="button"
                onClick={() => onAttachConnection(device)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                + Attach Line
              </button>
            </div>

            {activeConnections.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeConnections.map((conn) => (
                  <div
                    key={conn.id}
                    className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-900"
                  >
                    <span className="font-semibold">{formatConnectionEmoji(conn.type)} {conn.type}:</span>
                    <span>{conn.referenceId ?? 'Active Line'}</span>
                    <button
                      type="button"
                      onClick={() => onEndConnection(conn.id)}
                      title="Discontinue connection"
                      className="ml-1 text-slate-400 hover:text-red-600 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No active infusions or drain lines connected.
              </p>
            )}

            {endedConnections.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">
                Recent ended: {endedConnections[0].type.toLowerCase()} ({endedConnections[0].referenceId ?? 'line'}) ended {getDeviceDuration(endedConnections[0].endedAt!)} ago
              </p>
            )}
          </div>

          {device.lastReviewedAt && (
            <p className="text-xs text-slate-500 mt-1">
              Last reviewed: {formatDeviceDateTime(device.lastReviewedAt)}
              {device.lastReviewOutcome ? ` · Review outcome: ${device.lastReviewOutcome}` : ''}
            </p>
          )}

          {isReviewDue && device.reviewReason && (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2 flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              {device.reviewReason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-2 md:mt-0">
          <Button size="sm" variant="outline" onPress={() => onReview(device)}>
            Review
          </Button>
          <Button size="sm" variant="danger-soft" onPress={() => onRemove(device)}>
            Remove Device
          </Button>
          <Button size="sm" variant="ghost" onPress={() => onViewTimeline(device)}>
            <History size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function formatConnectionEmoji(type: DeviceConnection['type']): string {
  switch (type) {
    case 'FLUID':
      return '💧';
    case 'MEDICATION':
      return '💊';
    case 'BLOOD':
      return '🩸';
    case 'NUTRITION':
      return '🧪';
    case 'DRAINAGE':
      return '🪣';
    default:
      return '🔗';
  }
}
