import { MockLLM } from '../src/mock-llm';
import path from 'path';

describe('MockLLM Integration', () => {
  let llm: MockLLM;

  beforeEach(async () => {
    llm = new MockLLM({
      configSource: {
        type: 'local',
        location: {
          path: path.join(__dirname, '../../../apps/demo-nextjs/config')
        }
      },
      connections: {
        mockCosmos: {
          basePath: path.join(__dirname, '../../../apps/demo-nextjs/mock-db')
        }
      }
    });
    await llm.initialize();
  });

  it('should return an answer for a habit query', async () => {
    const answer = await llm.query('list all habits');
    expect(answer).toBeDefined();
    expect(answer.intent).toBeDefined();
    expect(answer.metadata.source).toBe('mock-llm');
  });

  it('should return results for a specific category query', async () => {
    const answer = await llm.query('find habits with category fitness');
    expect(answer).toBeDefined();
    expect(answer.results).toBeDefined();
  });

  it('should handle unknown query gracefully', async () => {
    const answer = await llm.query('what is the color of the ocean floor');
    expect(answer).toBeDefined();
    expect(answer.results.length).toBe(0);
    expect(answer.summary).toContain("couldn't find");
  });

  it('should return execution time in metadata', async () => {
    const answer = await llm.query('show me all skills');
    expect(answer.metadata.execution_time_ms).toBeGreaterThanOrEqual(0);
  });

  it('should include debug block when debug=true', async () => {
    const answer = await llm.query('list all habits', { debug: true });
    expect(answer.debug).toBeDefined();
    expect(answer.debug?.rawQuery).toBe('list all habits');
    expect(answer.debug?.threshold).toBe(0.1);
  });

  it('should not include debug block when debug=false', async () => {
    const answer = await llm.query('list all habits', { debug: false });
    expect(answer.debug).toBeUndefined();
  });

  it('should return keywords and stories via introspection', () => {
    const keywords = llm.getKeywords();
    const stories = llm.getStories();
    const sources = llm.listDataSources();
    expect(keywords.length).toBeGreaterThan(0);
    expect(stories.length).toBeGreaterThan(0);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources).toEqual(expect.arrayContaining(['content/docs', 'observability/openobserve']));
  });
});
