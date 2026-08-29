import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type ChronosHealth = {
  status?: string;
  models_loaded?: string[];
  active_patients?: number;
};

type ChronosPatients = {
  count?: number;
  active_patients?: string[];
};

@Injectable()
export class ChronosBridgeService {
  // Default to the embedded Chronos runtime that lives in this monorepo.
  private readonly baseUrl =
    process.env.CHRONOS_BASE_URL || 'http://127.0.0.1:8000';

  async getHealth() {
    return this.getJson('/health');
  }

  async getPatients() {
    return this.getJson('/patients');
  }

  async getSummary() {
    const [health, patients] = await Promise.all([
      this.getHealth().catch(
        (): ChronosHealth => ({
          status: 'offline',
          models_loaded: [],
        }),
      ),
      this.getPatients().catch(
        (): ChronosPatients => ({
          count: 0,
          active_patients: [],
        }),
      ),
    ]);

    const typedHealth = health as ChronosHealth;
    const typedPatients = patients as ChronosPatients;

    return {
      status: typedHealth.status || 'offline',
      models_loaded: typedHealth.models_loaded || [],
      active_patients: Number(typedHealth.active_patients ?? typedPatients.count ?? 0),
      patient_count: Number(typedPatients.count ?? 0),
      source: this.baseUrl,
      route: '/api/chronos',
      refreshedAt: new Date().toISOString(),
    };
  }

  async getPatientHistory(patientId: string) {
    return this.getJson(`/patient/${encodeURIComponent(patientId)}/history`);
  }

  async predict(payload: Record<string, unknown>) {
    return this.postJson('/predict', payload);
  }

  private async getJson(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      const text = await response.text();
      throw new HttpException(
        `Chronos request failed for ${path}: ${text || response.statusText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }

  private async postJson(path: string, body: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new HttpException(
        `Chronos prediction failed for ${path}: ${text || response.statusText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }
}
