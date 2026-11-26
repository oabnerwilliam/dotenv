import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadEnv } from '../src/config/env';

// Sobe a API como o `main.ts`: mesmos módulos e mesma configuração, sem abrir porta fixa.
export async function createApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await customize(builder).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, loadEnv(process.env));
  await app.init();
  return app;
}
