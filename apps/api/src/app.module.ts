import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { TeamGuard } from './auth/team.guard';
import { CommonModule } from './common/common.module';
import { ErrorFilter } from './common/error.filter';
import { RateLimitGuard } from './common/rate-limit.guard';
import { ENV, type Env } from './config/env';
import { EnvModule } from './config/env.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    EnvModule,
    CommonModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => [{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }],
    }),
    AuthModule,
    HealthModule,
    MeModule,
    TeamModule,
    ProjectsModule,
  ],
  providers: [
    // Registrado como provider, o filtro vale para a API inteira, inclusive nos testes.
    { provide: APP_FILTER, useClass: ErrorFilter },
    // Guards globais, executados nesta ordem. Por isso ficam juntos, no mesmo módulo.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TeamGuard },
  ],
})
export class AppModule {}
