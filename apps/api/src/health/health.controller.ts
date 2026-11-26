import type { Health } from '@env/shared';
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  get(): Promise<Health> {
    return this.health.check();
  }
}
