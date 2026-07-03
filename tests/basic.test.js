import { describe, it, expect } from 'vitest';

describe('basic sanity', () => {
  it('math works', () => {
    expect(1 + 1).toBe(2);
  });

  it('string works', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});
