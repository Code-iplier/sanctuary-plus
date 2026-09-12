import type {
  Dashboard,
  Device,
  DeviceConnection,
  DeviceType,
  PatientView,
  VitalsReading,
} from '../model/types';

const API_PREFIX = '/api/wardwatch';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    let errMessage = `${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) {
        errMessage = Array.isArray(errJson.message)
          ? errJson.message.join(', ')
          : errJson.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }

  return (await response.json()) as T;
}

export async function fetchDashboard(): Promise<Dashboard> {
  return request<Dashboard>('/dashboard');
}

export async function fetchPatientView(patientId: string): Promise<PatientView> {
  return request<PatientView>(`/patients/${patientId}`);
}

export async function createDevice(payload: {
  patientId: string;
  type: DeviceType;
  location: string;
  insertedAt: string;
  indication: string;
  currentUse?: string;
  notes?: string;
  insertedBy?: string;
}): Promise<Device> {
  return request<Device>('/devices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reviewDevice(
  deviceId: string,
  payload: {
    outcome: string;
    indication?: string;
    reviewedBy?: string;
    notes?: string;
  },
): Promise<Device> {
  return request<Device>(`/devices/${deviceId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeDevice(
  deviceId: string,
  payload: {
    removalReason: string;
    removedAt: string;
    removedBy?: string;
    notes?: string;
  },
): Promise<Device> {
  return request<Device>(`/devices/${deviceId}/remove`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recordVitals(
  payload: Partial<VitalsReading>,
): Promise<PatientView> {
  return request<PatientView>('/vitals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function acknowledgeFlag(flagId: string): Promise<void> {
  await request(`/flags/${flagId}/acknowledge`, { method: 'POST' });
}

export async function resolveFlag(
  flagId: string,
  payload: { resolution: string; note?: string },
): Promise<void> {
  await request(`/flags/${flagId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createConnection(payload: {
  deviceId: string;
  type: 'FLUID' | 'MEDICATION' | 'BLOOD' | 'NUTRITION' | 'DRAINAGE';
  referenceId?: string;
  startedAt?: string;
}): Promise<DeviceConnection> {
  return request<DeviceConnection>('/connections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function endConnection(
  connectionId: string,
  payload?: { endedAt?: string },
): Promise<DeviceConnection> {
  return request<DeviceConnection>(`/connections/${connectionId}/end`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}
