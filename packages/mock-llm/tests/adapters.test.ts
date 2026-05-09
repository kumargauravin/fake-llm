import { MockCosmosAdapter } from '../src/adapters/mock-cosmos.adapter';

const mockData = [
  { id: 'habit_001', name: 'Morning Run', category: 'fitness' },
  { id: 'habit_002', name: 'Read 30 mins', category: 'learning' }
];

describe('MockCosmosAdapter', () => {
  let adapter: MockCosmosAdapter;

  beforeEach(() => {
    adapter = new MockCosmosAdapter({
      dataPath: './mock-db',
      container: 'habits'
    });
    // Inject mock data directly
    (adapter as any).data = mockData;
  });

  it('should return all items when no filters', async () => {
    const results = await adapter.query({ source: 'habits', filters: {} });
    expect(results.length).toBe(2);
  });

  it('should filter items by category', async () => {
    const results = await adapter.query({ source: 'habits', filters: { category: 'fitness' } });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('habit_001');
  });

  it('should return empty array when no match', async () => {
    const results = await adapter.query({ source: 'habits', filters: { category: 'nonexistent' } });
    expect(results.length).toBe(0);
  });

  it('should fetch item by id', async () => {
    const result = await adapter.getById('habits', 'habit_001');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Morning Run');
  });

  it('should return undefined for unknown id', async () => {
    const result = await adapter.getById('habits', 'unknown_999');
    expect(result).toBeUndefined();
  });
});
