import type {
  News2ParameterScores,
  News2Score,
  News2Trend,
  VitalsReading,
} from './wardwatch.types';

export function calculateNews2(
  reading: VitalsReading,
  previousScores: News2Score[],
): News2Score {
  const perParameterScore: News2ParameterScores = {
    respiratoryRate: scoreRespiratoryRate(reading.respiratoryRate),
    spo2: scoreSpo2(reading.spo2, reading.spo2Scale),
    temperature: scoreTemperature(reading.temperature),
    systolicBP: scoreSystolicBP(reading.systolicBP),
    heartRate: scoreHeartRate(reading.heartRate),
    consciousness: reading.consciousness === 'ALERT' ? 0 : 3,
    supplementalOxygen: reading.supplementalOxygen ? 2 : 0,
  };

  const totalScore = Object.values(perParameterScore).reduce(
    (sum, score) => sum + score,
    0,
  );

  return {
    id: createId('news2'),
    readingId: reading.id,
    patientId: reading.patientId,
    totalScore,
    perParameterScore,
    trend: calculateTrend([...previousScores, { totalScore }]),
    createdAt: reading.takenAt ?? new Date().toISOString(),
  };
}

export function calculateTrend(
  scores: Array<Pick<News2Score, 'totalScore'>>,
): News2Trend {
  if (scores.length < 2) return 'STABLE';
  const previous = scores.at(-2)?.totalScore ?? 0;
  const current = scores.at(-1)?.totalScore ?? 0;
  if (current > previous) return 'RISING';
  if (current < previous) return 'FALLING';
  return 'STABLE';
}

export function getNews2Drivers(score: News2Score): string[] {
  return Object.entries(score.perParameterScore)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key);
}

function scoreRespiratoryRate(value: number): number {
  if (value <= 8) return 3;
  if (value <= 11) return 1;
  if (value <= 20) return 0;
  if (value <= 24) return 2;
  return 3;
}

function scoreSpo2(value: number, scale: 1 | 2): number {
  if (scale === 2) {
    if (value <= 83) return 3;
    if (value <= 85) return 2;
    if (value <= 87) return 1;
    if (value <= 92) return 0;
    if (value <= 94) return 1;
    if (value <= 96) return 2;
    return 3;
  }

  if (value <= 91) return 3;
  if (value <= 93) return 2;
  if (value <= 95) return 1;
  return 0;
}

function scoreTemperature(value: number): number {
  if (value <= 35) return 3;
  if (value <= 36) return 1;
  if (value <= 38) return 0;
  if (value <= 39) return 1;
  return 2;
}

function scoreSystolicBP(value: number): number {
  if (value <= 90) return 3;
  if (value <= 100) return 2;
  if (value <= 110) return 1;
  if (value <= 219) return 0;
  return 3;
}

function scoreHeartRate(value: number): number {
  if (value <= 40) return 3;
  if (value <= 50) return 1;
  if (value <= 90) return 0;
  if (value <= 110) return 1;
  if (value <= 130) return 2;
  return 3;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
