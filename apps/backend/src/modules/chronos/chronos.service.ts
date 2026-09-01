import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ChronosSummary, ChronosPredictionResponse } from './chronos.types';

@Injectable()
export class ChronosService {
  private readonly logger = new Logger(ChronosService.name);
  private readonly baseUrl = process.env.CHRONOS_BASE_URL || 'http://127.0.0.1:8000';
  private readonly timeoutMs = 8000;

  async getSummary(): Promise<ChronosSummary> {
    const [health, patients] = await Promise.all([
      this.fetchWithTimeout<{ status: string; models_loaded: string[]; active_patients: number }>(
        `${this.baseUrl}/health`,
      ).catch((err) => {
        this.logger.warn(`Chronos health unavailable: ${err.message}`);
        throw new HttpException(
          `Chronos runtime unavailable: ${err.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }),
      this.fetchWithTimeout<{ active_patients: string[]; count: number }>(
        `${this.baseUrl}/patients`,
      ).catch(() => ({ active_patients: [] as string[], count: 0 })),
    ]);

    // health.active_patients is a NUMBER (count), not an array — do not confuse with patients.active_patients array
    const activePatients = typeof health.active_patients === 'number' ? health.active_patients : patients.count;

    return {
      status: health.status ?? 'online',
      modelsLoaded: health.models_loaded ?? [],
      activePatients,
    };
  }

  async predict(payload: Record<string, unknown>): Promise<ChronosPredictionResponse> {
    return this.fetchWithTimeout<ChronosPredictionResponse>(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Chronos predict failed: ${err.message}`);
      throw new HttpException(`Chronos prediction failed: ${err.message}`, HttpStatus.BAD_GATEWAY);
    });
  }

  private async fetchWithTimeout<T>(url: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new HttpException(`Chronos ${url} ${res.status}: ${text}`, HttpStatus.BAD_GATEWAY);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort')) throw new HttpException(`Chronos request timed out after ${this.timeoutMs}ms`, HttpStatus.GATEWAY_TIMEOUT);
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timeout);
    }
  }
}
