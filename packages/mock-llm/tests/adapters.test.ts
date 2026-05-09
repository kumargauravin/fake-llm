import * as fs from 'fs';
import * as path from 'path';
import { MockCosmosAdapter } from '../src/adapters/mock-cosmos.adapter';

const DEMO_MOCK_DB = path.join(__dirname, '../../../apps/demo-nextjs/mock-db');

describe('MockCosmosAdapter', () => {
  let adapter: MockCosmosAdapter;

  beforeEach(() => {
    adapter = new MockCosmosAdapter({ basePath: DEMO_MOCK_DB });
  });

  it('should return all habits from single-array-file format', async () => {
    const results = await adapter.query({ source: 'learnings/habits' });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter habits by category', async () => {
    const results = await adapter.query({
      source: 'learnings/habits',
      filters: { category: 'fitness' }
    });
    expect(results.every((r: any) => r.category === 'fitness')).toBe(true);
  });

  it('should return empty array when no match', async () => {
    const results = await adapter.query({
      source: 'learnings/habits',
      filters: { category: 'nonexistent' }
    });
    expect(results.length).toBe(0);
  });

  it('should return science items from directory format', async () => {
    const results = await adapter.query({ source: 'knowledge/science' });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty array for unknown source', async () => {
    const results = await adapter.query({ source: 'unknown/source' });
    expect(results).toEqual([]);
  });

  it('should respect limit', async () => {
    const results = await adapter.query({ source: 'learnings/habits', limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should throw on getById without source', async () => {
    await expect(adapter.getById('habit_001')).rejects.toThrow();
  });
});
