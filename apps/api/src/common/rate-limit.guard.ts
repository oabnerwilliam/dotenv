import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppError } from './app-error';

// Limite de requisições por IP. A contagem fica na memória do processo.
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  // O padrão conta cada rota em separado; aqui é uma contagem por IP para a API toda.
  protected override generateKey(_context: ExecutionContext, ip: string, name: string): string {
    return `${name}:${ip}`;
  }

  // A exceção padrão cairia no `ErrorFilter` como `VALIDATION`, com mensagem genérica.
  protected override async throwThrottlingException(): Promise<void> {
    throw new AppError('RATE_LIMITED', 'Muitas requisições. Aguarde um instante e tente de novo.');
  }
}
