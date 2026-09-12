import type {
  CorrelationFlag,
  News2Score,
  PatientDevice,
  WardDashboard,
  WardPatient,
} from './wardwatch.types';

export function buildRecheckPriority({
  patients,
  latestScores,
  latestObservationAt,
}: {
  patients: WardPatient[];
  latestScores: News2Score[];
  latestObservationAt: Map<string, string>;
}): WardDashboard['recheckPriority'] {
  return patients
    .map((patient) => {
      const score = latestScores.find((item) => item.patientId === patient.id);
      const takenAt = latestObservationAt.get(patient.id);
      const ageMinutes = takenAt
        ? Math.max(0, Math.round((Date.now() - new Date(takenAt).getTime()) / 60000))
        : 999;
      const totalScore = score?.totalScore ?? 0;
      const priority =
        totalScore / 20 +
        Math.min(ageMinutes, 180) / 180 +
        (score?.trend === 'RISING' ? 0.3 : 0);

      return {
        patientId: patient.id,
        name: patient.name,
        bed: patient.bed,
        totalScore,
        lastObservationAgeMinutes: ageMinutes,
        priority: Number(priority.toFixed(2)),
        trend: score?.trend ?? 'STABLE',
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function selectOpenFlags(flags: CorrelationFlag[]): CorrelationFlag[] {
  return flags.filter((flag) => flag.status !== 'RESOLVED');
}

export function selectReviewDueDevices(devices: PatientDevice[]): PatientDevice[] {
  return devices.filter((device) => device.status === 'REVIEW_DUE');
}

export function selectRisingTrends(scores: News2Score[]): News2Score[] {
  return scores.filter((score) => score.trend === 'RISING');
}
