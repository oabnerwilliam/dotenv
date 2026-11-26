import type { ApiErrorBody, ErrorCode } from '@env/shared';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from './app-error';

// `Record<ErrorCode, number>` obriga a dar um status a todo código novo.
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  NOT_INVITED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VERSION_CONFLICT: 409,
  STATE_CHANGED: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

// Linha de pilha: "    at algo (arquivo:linha:coluna)".
const STACK_FRAME = /^\s+at .*(:\d+:\d+\)?|\(<anonymous>\)|\(native\))$/;

interface Reply {
  status: number;
  body: ApiErrorBody;
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    let reply = knownReply(exception);

    if (!reply) {
      this.logUnknown(exception, http.getRequest<Request>());
      reply = {
        status: 500,
        body: { code: 'INTERNAL', message: 'Erro interno. Tente novamente.' },
      };
    }

    if (response.headersSent) {
      response.end();
      return;
    }
    response.status(reply.status).json(reply.body);
  }

  // Só método, caminho, nome do erro e pilha. Nunca cabeçalhos, corpo, query string ou a
  // mensagem: as do Prisma, por exemplo, podem repetir os valores enviados.
  private logUnknown(exception: unknown, request: Request): void {
    const path = request.originalUrl.split('?')[0];
    const name = exception instanceof Error ? exception.name : typeof exception;
    const frames = exception instanceof Error ? stackFrames(exception) : [];
    this.logger.error([`${request.method} ${path} ${name}`, ...frames].join('\n'));
  }
}

// Devolve a resposta dos erros esperados; `undefined` significa erro interno.
function knownReply(exception: unknown): Reply | undefined {
  if (exception instanceof AppError) {
    const { code, message, fields } = exception;
    return { status: STATUS_BY_CODE[code], body: { code, message, ...(fields && { fields }) } };
  }

  const status =
    exception instanceof HttpException ? exception.getStatus() : bodyParserStatus(exception);
  if (status === undefined || status < 400 || status >= 500) return undefined;

  if (status === 404) {
    return { status, body: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } };
  }
  const message =
    status === 413 ? 'O corpo da requisição é grande demais.' : 'Requisição inválida.';
  return { status, body: { code: 'VALIDATION', message } };
}

// O Nest converte o JSON malformado em `HttpException`, mas os outros erros do parser de corpo
// (tamanho, codificação) chegam crus. Exigimos o formato dele (`type` e `expose`) para que um
// erro de outra biblioteca que só tenha `status` continue sendo erro interno.
function bodyParserStatus(exception: unknown): number | undefined {
  if (!(exception instanceof Error)) return undefined;
  const { status, expose, type } = exception as Error & {
    status?: unknown;
    expose?: unknown;
    type?: unknown;
  };
  return expose === true && typeof type === 'string' && typeof status === 'number'
    ? status
    : undefined;
}

// A pilha começa repetindo a mensagem (que pode ter várias linhas): cortamos até o fim dela
// antes de filtrar, para nenhum trecho da mensagem passar por linha de pilha.
function stackFrames({ stack = '', message }: Error): string[] {
  const start = message ? stack.indexOf(message) : -1;
  const trace = start >= 0 ? stack.slice(start + message.length) : stack;
  return trace.split('\n').filter((line) => STACK_FRAME.test(line));
}
