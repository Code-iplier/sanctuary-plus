import { getNews2Drivers } from './wardwatch.scoring';
import type {
  CorrelationFlag,
  DeviceConnection,
  DeviceStatus,
  News2Score,
  PatientDevice,
} from './wardwatch.types';

export type DeviceEvaluation = {
  status: DeviceStatus;
  reason?: string;
};

export function evaluateDevice(
  device: PatientDevice,
  connections: DeviceConnection[],
): DeviceEvaluation {
  if (device.status === 'REMOVED') {
    return { status: 'REMOVED', reason: 'Device has been removed.' };
  }

  if (!device.indication?.trim()) {
    return {
      status: 'REVIEW_DUE',
      reason: 'Device has no documented indication.',
    };
  }

  if (device.indicationResolvedAt) {
    return {
      status: 'REVIEW_DUE',
      reason: `Documented indication resolved at ${formatTime(device.indicationResolvedAt)}.`,
    };
  }

  const activeConnections = connections.filter(
    (connection) => connection.deviceId === device.id && !connection.endedAt,
  );
  const allConnectionsEnded =
    connections.some((connection) => connection.deviceId === device.id) &&
    activeConnections.length === 0;

  if (device.type === 'PERIPHERAL_IV' && allConnectionsEnded) {
    const isRecentlyReviewed = device.lastReviewedAt && !isReviewOverdue(device);
    if (!isRecentlyReviewed) {
      return {
        status: 'REVIEW_DUE',
        reason: 'Peripheral IV has no active connection or other documented purpose.',
      };
    }
  }

  if (isReviewOverdue(device)) {
    return {
      status: 'REVIEW_DUE',
      reason: 'Device review is overdue for this ward interval.',
    };
  }

  return { status: 'ACTIVE' };
}

export function buildCorrelationFlag(
  patientId: string,
  latestScore: News2Score | undefined,
  scores: News2Score[],
  reviewDueDevices: PatientDevice[],
): CorrelationFlag | undefined {
  if (!latestScore || latestScore.trend !== 'RISING' || !reviewDueDevices.length) {
    return undefined;
  }

  const drivers = getNews2Drivers(latestScore);
  if (!drivers.length) return undefined;

  const device = reviewDueDevices[0];
  const scoreTrail = scores
    .slice(-3)
    .map((score) => score.totalScore)
    .join(' -> ');

  return {
    id: `flag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    patientId,
    raisedAt: new Date().toISOString(),
    reason: `Rising NEWS2 with concurrent unreviewed ${formatDeviceType(device.type).toLowerCase()}`,
    evidence: {
      vitalsTrendSummary: `NEWS2 ${scoreTrail || latestScore.totalScore}; trend ${latestScore.trend}.`,
      deviceReviewReason: device.reviewReason ?? 'Device review is due.',
      drivers,
    },
    status: 'OPEN',
  };
}

function isReviewOverdue(device: PatientDevice): boolean {
  const reference = device.lastReviewedAt ?? device.insertedAt;
  const ageHours = (Date.now() - new Date(reference).getTime()) / 36e5;
  return ageHours >= 24;
}

function formatDeviceType(type: PatientDevice['type']): string {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTime(value: string): string {
  return new Date(value).toISOString();
}
