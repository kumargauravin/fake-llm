import { StoryResolver } from '../src/engine/story-resolver';
import { Story, Intent, KeywordEntry } from '../src/config/types';

const mockStories: Story[] = [
  {
    story_id: 'story_001',
    description: 'List habits',
    keywords: ['habit', 'routine'],
    relations: [],
    resolution_steps: [{ step: 1, action: 'fetch', from_source: 'learnings/habits' }]
  },
  {
    story_id: 'story_002',
    description: 'Compare habits',
    keywords: ['habit', 'compare'],
    relations: [],
    resolution_steps: [{ step: 1, action: 'compare', from_source: 'learnings/habits' }]
  }
];

const mockKeywords: KeywordEntry[] = [
  { keyword: 'habit', category: 'entity', aliases: ['routine'], data_source: 'learnings/habits' },
  { keyword: 'compare', category: 'action', aliases: ['diff'], data_source: 'learnings/habits' }
];

describe('StoryResolver', () => {
  let resolver: StoryResolver;

  beforeEach(() => {
    resolver = new StoryResolver(mockStories);
  });

  it('should find best matching story for list intent', () => {
    const intent: Intent = { action: 'list', keywords: ['habit'], filters: {}, confidence: 0.8 };
    const resolved: KeywordEntry[] = [mockKeywords[0]];
    const match = resolver.findBestStory(intent, resolved);
    expect(match).toBeDefined();
    expect(match?.story.story_id).toBe('story_001');
  });

  it('should find compare story when compare intent given', () => {
    const intent: Intent = { action: 'compare', keywords: ['habit', 'compare'], filters: {}, confidence: 0.8 };
    const resolved: KeywordEntry[] = [mockKeywords[0], mockKeywords[1]];
    const match = resolver.findBestStory(intent, resolved);
    expect(match).toBeDefined();
    expect(match?.story.story_id).toBe('story_002');
  });

  it('should return undefined when no story matches', () => {
    const intent: Intent = { action: 'list', keywords: ['unknown'], filters: {}, confidence: 0.3 };
    const match = resolver.findBestStory(intent, []);
    expect(match).toBeUndefined();
  });

  it('should return all story candidates via scoreAll', () => {
    const intent: Intent = { action: 'list', keywords: ['habit'], filters: {}, confidence: 0.8 };
    const resolved: KeywordEntry[] = [mockKeywords[0]];
    const candidates = resolver.scoreAll(intent, resolved);
    expect(candidates.length).toBe(2);
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[1].score);
  });
});
