import { type ArgumentsHost, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { AppError } from './app-error';
import { ErrorFilter } from './error.filter';

function createHost() {
  const response = {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
  const request = {
    method: 'POST',
    originalUrl: '/projects/atlas?token=segredo-da-query',
    headers: { authorization: 'Bearer segredo-do-cabecalho' },
    body: { email: 'segredo-do-corpo' },
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('ErrorFilter', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function run(exception: unknown) {
    const { host, response } = createHost();
    new ErrorFilter().catch(exception, host);
    return response;
  }

  it('AppError NOT_FOUND vira 404 com code e message', () => {
    const response = run(new AppError('NOT_FOUND', 'Projeto não encontrado.'));

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      code: 'NOT_FOUND',
      message: 'Projeto não encontrado.',
    });
    expect(log).not.toHaveBeenCalled();
  });

  it.each([
    ['VALIDATION', 400],
    ['UNAUTHENTICATED', 401],
    ['NOT_INVITED', 403],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['VERSION_CONFLICT', 409],
    ['STATE_CHANGED', 409],
    ['RATE_LIMITED', 429],
    ['INTERNAL', 500],
  ] as const)('AppError %s vira %i', (code, status) => {
    expect(run(new AppError(code, 'Mensagem.')).status).toHaveBeenCalledWith(status);
  });

  it('AppError com fields devolve os campos', () => {
    const response = run(new AppError('VALIDATION', 'Dados inválidos.', { name: 'Obrigatório.' }));

    expect(response.json).toHaveBeenCalledWith({
      code: 'VALIDATION',
      message: 'Dados inválidos.',
      fields: { name: 'Obrigatório.' },
    });
  });

  it('404 do Nest vira NOT_FOUND em português', () => {
    const response = run(new NotFoundException('Cannot GET /x'));

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      code: 'NOT_FOUND',
      message: 'Recurso não encontrado.',
    });
  });

  it('outro 4xx do Nest vira VALIDATION mantendo o status', () => {
    const response = run(new HttpException('Unsupported Media Type', 415));

    expect(response.status).toHaveBeenCalledWith(415);
    expect(response.json).toHaveBeenCalledWith({
      code: 'VALIDATION',
      message: 'Requisição inválida.',
    });
  });

  it('erro 4xx do parser de corpo vira VALIDATION mantendo o status', () => {
    const parserError = Object.assign(new Error('unsupported charset'), {
      status: 415,
      expose: true,
      type: 'charset.unsupported',
    });

    const response = run(parserError);

    expect(response.status).toHaveBeenCalledWith(415);
    expect(response.json).toHaveBeenCalledWith({
      code: 'VALIDATION',
      message: 'Requisição inválida.',
    });
  });

  it.each([
    ['desconhecido', new Error('senha do banco: segredo-da-mensagem')],
    // Um erro de outra biblioteca com `status` não é erro do cliente.
    ['com status alheio', Object.assign(new Error('segredo-da-mensagem'), { status: 401 })],
    ['HTTP 5xx', new HttpException('segredo-da-mensagem', 503)],
    ['que não é Error', 'segredo-da-mensagem'],
  ])('erro %s vira 500 INTERNAL sem vazar a mensagem original', (_label, exception) => {
    const response = run(exception);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      code: 'INTERNAL',
      message: 'Erro interno. Tente novamente.',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('segredo');
  });

  it('registra o erro desconhecido sem cabeçalhos, corpo, query string nem a mensagem', () => {
    // Mensagem de várias linhas, como as do Prisma, inclusive com uma linha que imita a pilha.
    const error = new TypeError('segredo-da-mensagem\n    at segredo-falso (x.ts:1:1)\nfim');

    run(error);

    expect(log).toHaveBeenCalledTimes(1);
    const logged = log.mock.calls[0].join('\n');
    expect(logged).toContain('POST /projects/atlas');
    expect(logged).toContain('TypeError');
    expect(logged).toMatch(/\n\s+at .*error\.filter\.spec\.ts/);
    expect(logged).not.toContain('segredo');
    expect(logged).not.toContain('?');
  });

  it('não escreve de novo se a resposta já começou', () => {
    const { host, response } = createHost();
    response.headersSent = true;

    new ErrorFilter().catch(new Error('falha'), host);

    expect(response.json).not.toHaveBeenCalled();
    expect(response.end).toHaveBeenCalled();
  });
});
