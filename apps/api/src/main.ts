import 'dotenv/config'; // precisa ser a primeira linha: o Nest não lê o `.env`
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Antes de criar o app: se faltar variável, falha aqui com uma mensagem clara.
  const env = loadEnv(process.env);
  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  // Em Ctrl+C ou parada do serviço, fecha as conexões com o banco.
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(error instanceof Error ? error.message : 'Falha na partida.');
  process.exit(1);
});
