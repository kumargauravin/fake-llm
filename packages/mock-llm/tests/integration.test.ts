import { MockLLM } from '../src/mock-llm';
import path from 'path';

describe('MockLLM Integration', () => {
  let llm: MockLLM;

  beforeEach(async () => {
    llm = new MockLLM({
      configSource: {
        type: 'local',
        basePath: path.join(__dirname, '../../demo-nextjs/config')
      },
      connections: {
        mockCosmos: {
          dataPath: path.join(__dirname, '../../demo-nextjs/mock-db/learnings'),
          container: 'habits'
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
    const answer = await llm.query('what is the weather today');
    expect(answer).toBeDefined();
    expect(answer.results.length).toBe(0);
    expect(answer.summary).toContain("couldn't find");
  });

  it('should return execution time in metadata', async () => {
    const answer = await llm.query('show me all skills');
    expect(answer.metadata.execution_time_ms).toBeGreaterThanOrEqual(0);
  });
});
