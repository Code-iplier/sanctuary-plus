import React, { useState } from 'react';
import {
  Building2,
  Stethoscope,
  HeartPulse,
  Activity,
  User,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { issueTicket } from '../../queue/api';
import type { Department, PatientTicket, VisitType } from '../../queue/types';

interface PatientNewTokenWizardProps {
  patientId: string;
  patientName: string;
  patientPhone: string;
  departments: Department[];
  onTokenCreated: (ticket: PatientTicket) => void;
  onCancel?: () => void;
}

export default function PatientNewTokenWizard({
  patientId,
  patientName,
  patientPhone,
  departments,
  onTokenCreated,
  onCancel,
}: PatientNewTokenWizardProps) {
  const [step, setStep] = useState<'dept' | 'visit' | 'review'>('dept');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id ?? 'dept-gm');
  const [visitType, setVisitType] = useState<VisitType>('NEW');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const handleSubmit = async () => {
    if (!selectedDept) return;
    setLoading(true);
    setError(null);
    try {
      const ticket = await issueTicket({
        patientId,
        patientName,
        patientPhone,
        departmentId: selectedDept.id,
        visitType,
        reason: reason.trim() || 'General OPD Consultation',
      });
      onTokenCreated(ticket);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>Step {step === 'dept' ? '1' : step === 'visit' ? '2' : '3'} of 3</span>
          <span>
            {step === 'dept'
              ? 'Select Department'
              : step === 'visit'
              ? 'Visit Information'
              : 'Review & Confirm'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
          <div
            className={`h-full bg-teal-600 transition-all duration-300 ${
              step === 'dept' ? 'w-1/3' : step === 'visit' ? 'w-2/3' : 'w-full'
            }`}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Department Selection */}
      {step === 'dept' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Which department do you wish to visit?</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the medical specialty. You will be placed in the department queue and routed to an available room.
            </p>
          </div>

          <div className="grid gap-3 mb-6">
            {departments.map((dept) => {
              const isSelected = selectedDeptId === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {dept.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
                      <p className="text-xs text-slate-500">{dept.description}</p>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">{dept.location}</p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => setStep('visit')}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>Next: Visit Info</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Visit Information */}
      {step === 'visit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setStep('dept')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-semibold mb-3 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Department Selection</span>
          </button>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Tell us about your visit</h2>
          <p className="text-xs text-slate-500 mb-5">
            This information assists the triage staff and consulting doctor in preparing your chart.
          </p>

          <div className="space-y-5 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Visit Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'NEW', label: 'New Problem' },
                  { id: 'FOLLOW_UP', label: 'Follow-up' },
                  { id: 'REVIEW', label: 'Report Review' },
                  { id: 'OTHER', label: 'Other / Refill' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVisitType(item.id as VisitType)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                      visitType === item.id
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Chief Complaint / Symptoms
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fever, body ache, and persistent cough for the past 3 days"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 outline-none resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Brief summary for the attending physician.</p>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Note: Priority (Urgent vs Normal) is assigned by hospital triage staff upon arrival. If experiencing severe breathlessness, chest pain, or bleeding, proceed to Emergency immediately.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep('dept')}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep('review')}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>Review Details</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Confirm */}
      {step === 'review' && selectedDept && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setStep('visit')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-semibold mb-3 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Visit Info</span>
          </button>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Confirm OPD Queue Token</h2>
          <p className="text-xs text-slate-500 mb-5">
            Verify your visit details before generating your live digital token.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 divide-y divide-slate-200/60">
            <div className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Patient Name:</span>
              <span className="text-slate-900 font-bold">{patientName}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Shared Patient ID:</span>
              <span className="text-teal-700 font-mono font-bold">{patientId}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Department:</span>
              <span className="text-slate-900 font-bold">{selectedDept.name} ({selectedDept.code})</span>
            </div>
            <div className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Department Location:</span>
              <span className="text-slate-700">{selectedDept.location}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Visit Category:</span>
              <span className="text-slate-900 font-semibold">{visitType}</span>
            </div>
            <div className="py-2.5 flex justify-between items-start text-xs">
              <span className="text-slate-500 font-medium shrink-0">Reason / Symptoms:</span>
              <span className="text-slate-800 text-right ml-4 font-normal">{reason || 'General Consultation'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('visit')}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Modify
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-700/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Generating Token...</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Confirm & Get Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
