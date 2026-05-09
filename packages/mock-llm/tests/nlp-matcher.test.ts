import { NLPMatcher } from '../src/engine/nlp-matcher';

describe('NLPMatcher', () => {
  let matcher: NLPMatcher;

  beforeEach(() => {
    matcher = new NLPMatcher();
  });

  it('should detect list action by default', () => {
    const intent = matcher.parseQuery('show me all habits');
    expect(intent.action).toBe('list');
  });

  it('should detect compare action', () => {
    const intent = matcher.parseQuery('compare habit_001 and habit_002');
    expect(intent.action).toBe('compare');
  });

  it('should detect find action', () => {
    const intent = matcher.parseQuery('find habits with category hygiene');
    expect(intent.action).toBe('find');
  });

  it('should detect explain action', () => {
    const intent = matcher.parseQuery('explain what is habit_001');
    expect(intent.action).toBe('explain');
  });

  it('should extract keywords', () => {
    const intent = matcher.parseQuery('list all morning habits');
    expect(intent.keywords.length).toBeGreaterThan(0);
  });

  it('should return a confidence score', () => {
    const intent = matcher.parseQuery('list habits');
    expect(intent.confidence).toBeGreaterThan(0);
    expect(intent.confidence).toBeLessThanOrEqual(1);
  });
});
