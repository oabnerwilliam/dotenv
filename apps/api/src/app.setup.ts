import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { Env } from './config/env';

// Configuração HTTP usada pelo `main.ts` e pelos testes de integração.
// Chamar antes de `init`/`listen`, para valer também nas respostas de erro do parser de corpo.
export function configureApp(app: INestApplication, env: Env): void {
  app.use(helmet());
  // Origem fixa: o navegador só entrega a resposta para o nosso front.
  app.enableCors({ origin: env.WEB_ORIGIN });
}
