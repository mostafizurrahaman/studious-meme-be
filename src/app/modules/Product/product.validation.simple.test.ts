/* eslint-disable no-console */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Simple Zod Test', () => {
  it('should validate basic object', () => {
    const schema = z.object({
      body: z.object({
        title: z.string(),
        price: z.number(),
      }),
    });

    const result = schema.safeParse({
      body: { title: 'Test', price: 100 },
    });

    console.log('Simple test result:', result.success);
    expect(result.success).toBe(true);
  });

  it('should fail with invalid data', () => {
    const schema = z.object({
      body: z.object({
        title: z.string(),
      }),
    });

    const result = schema.safeParse({
      body: { title: 123 },
    });

    console.log('Invalid data result:', result.success);
    expect(result.success).toBe(false);
  });
});
