// Quem depende da hora recebe o relógio por injeção, para o teste controlar o tempo:
// `@Inject(CLOCK) private readonly clock: Clock`.
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = { now: () => new Date() };
