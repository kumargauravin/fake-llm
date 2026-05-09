import { HttpMockAdapter } from '../src/adapters/http-mock.adapter';

const mockHabits = [
  { id: 'h1', name: 'Morning Run', category: 'fitness', streak: 14 },
  { id: 'h2', name: 'Read 30 Minutes', category: 'learning', streak: 30 },
  { id: 'h3', name: 'Meditation', category: 'mindfulness', streak: 7 },
];

describe('HttpMockAdapter', () => {
  let adapter: HttpMockAdapter;

  beforeEach(() => {
    adapter = new HttpMockAdapter({ baseUrl: 'https://example.com/data' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('query()', () => {
    it('should fetch data from {baseUrl}/{source}.json', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHabits),
      } as any);

      const results = await adapter.query({ source: 'learnings/habits' });

      expect(results).toEqual(mockHabits);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/data/learnings/habits.json'
      );
    });

    it('should strip a trailing slash from baseUrl', async () => {
      const adapterWithSlash = new HttpMockAdapter({ baseUrl: 'https://example.com/data/' });
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHabits),
      } as any);

      await adapterWithSlash.query({ source: 'learnings/habits' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/data/learnings/habits.json'
      );
    });

    it('should apply filters client-side', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHabits),
      } as any);

      const results = await adapter.query({
        source: 'learnings/habits',
        filters: { category: 'fitness' },
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('h1');
    });

    it('should respect the limit parameter', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHabits),
      } as any);

      const results = await adapter.query({ source: 'learnings/habits', limit: 2 });

      expect(results.length).toBe(2);
    });

    it('should apply both filters and limit', async () => {
      const manyHabits = [...mockHabits, { id: 'h4', category: 'fitness', streak: 5 }];
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(manyHabits),
      } as any);

      const results = await adapter.query({
        source: 'learnings/habits',
        filters: { category: 'fitness' },
        limit: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].category).toBe('fitness');
    });

    it('should return an empty array for a 404 response', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 } as any);

      const results = await adapter.query({ source: 'unknown/source' });

      expect(results).toEqual([]);
    });

    it('should throw for non-404 error responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 } as any);

      await expect(adapter.query({ source: 'learnings/habits' })).rejects.toThrow('500');
    });

    it('should wrap a single object response in an array', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockHabits[0]),
      } as any);

      const results = await adapter.query({ source: 'learnings/habits' });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
    });

    it('should support nested property filters', async () => {
      const items = [
        { id: 'a', details: { status: 'active' } },
        { id: 'b', details: { status: 'inactive' } },
      ];
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(items),
      } as any);

      const results = await adapter.query({
        source: 'some/source',
        filters: { 'details.status': 'active' },
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('a');
    });
  });

  describe('getById()', () => {
    it('should throw an informative error', async () => {
      await expect(adapter.getById('h1')).rejects.toThrow(
        'HttpMockAdapter.getById is not supported'
      );
    });
  });

  describe('source path validation', () => {
    it('should reject paths containing ..', async () => {
      await expect(adapter.query({ source: '../etc/passwd' })).rejects.toThrow(
        "Invalid source path '../etc/passwd'"
      );
    });

    it('should reject paths starting with /', async () => {
      await expect(adapter.query({ source: '/etc/passwd' })).rejects.toThrow(
        "Invalid source path '/etc/passwd'"
      );
    });

    it('should reject paths containing a protocol', async () => {
      await expect(adapter.query({ source: 'http://evil.com/data' })).rejects.toThrow(
        "Invalid source path 'http://evil.com/data'"
      );
    });
  });
});
