import type { Health } from '@env/shared';
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators';
import { HealthService } from './health.service';

// Sem token e sem limite: é a rota que a hospedagem e o Playwright consultam o tempo todo.
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  get(): Promise<Health> {
    return this.health.check();
  }
}
