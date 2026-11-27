import { describe, expect, it } from 'vitest';
import { healthSchema } from '../index';

describe('healthSchema', () => {
  it('healthSchema aceita database up e down e rejeita outro valor', () => {
    expect(healthSchema.parse({ status: 'ok', database: 'up' })).toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(healthSchema.parse({ status: 'ok', database: 'down' })).toEqual({
      status: 'ok',
      database: 'down',
    });
    expect(healthSchema.safeParse({ status: 'ok', database: 'unknown' }).success).toBe(false);
  });
});
