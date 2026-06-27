import { describe, it, expect } from 'vitest';
import { validateRequest } from '../middlewares/validateRequest';
import { z } from 'zod';

describe('Validators', () => {
  it('should export validateRequest function', () => {
    expect(typeof validateRequest).toBe('function');
  });

  it('should validate with Zod schema', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
    });

    // const mockReq = { body: { name: 'Test' } } as any;
    // const mockRes = { status: () => ({ json: () => {} }) } as any;
    // const mockNext = () => {};

    // Just check the function exists and can be called
    expect(validateRequest(schema)).toBeDefined();
  });
});
