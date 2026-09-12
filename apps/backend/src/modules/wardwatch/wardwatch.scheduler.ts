import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WardWatchService } from './wardwatch.service';

/**
 * WardWatch periodic scheduler service.
 * Periodically re-evaluates device states, checks observation staleness,
 * refreshes open correlation flags, and updates ward recheck priorities.
 * Conforms to Section 4 & Section 22 of WardSync_Implementation_Plan.md.
 */
@Injectable()
export class WardWatchScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WardWatchScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 5 * 60 * 1000; // 5 minutes interval

  constructor(private readonly wardWatchService: WardWatchService) {}

  onModuleInit(): void {
    this.logger.log('Initializing WardWatch periodic evaluation scheduler (5m interval).');
    // Run an initial refresh pass after module bootstrap
    setTimeout(() => {
      this.runEvaluationPass();
    }, 2000);

    this.timer = setInterval(() => {
      this.runEvaluationPass();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('WardWatch periodic scheduler stopped.');
    }
  }

  /**
   * Triggers an evaluation pass across all monitored ward patients.
   */
  runEvaluationPass(): void {
    try {
      this.wardWatchService.refreshAllPatients();
      this.logger.debug('Completed periodic ward device & deterioration evaluation pass.');
    } catch (err) {
      this.logger.error(
        `Failed periodic ward evaluation: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
