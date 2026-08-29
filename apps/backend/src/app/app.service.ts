import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome() {
    return {
      name: 'Hospital Platform API',
      status: 'running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      chronos: {
        baseUrl: process.env.CHRONOS_BASE_URL || 'http://localhost:8000',
        route: '/api/chronos',
      },
      features: [
        'smart digital queues',
        'clinical documentation',
        'medication reconciliation',
        'preventive risk assessment',
        'Project Chronos ICU monitoring',
      ],
    };
  }
}
