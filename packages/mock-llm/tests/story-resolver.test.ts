import { StoryResolver } from '../src/engine/story-resolver';
import { Story, Intent, KeywordEntry } from '../src/config/types';

const mockStories: Story[] = [
  {
    id: 'story_001',
    name: 'List habits',
    keywords: ['habit', 'routine'],
    resolution_steps: [{ action: 'fetch', from_source: 'habits' }]
  },
  {
    id: 'story_002',
    name: 'Compare habits',
    keywords: ['habit', 'compare'],
    resolution_steps: [{ action: 'compare', from_source: 'habits' }]
  }
];

const mockKeywords: KeywordEntry[] = [
  { keyword: 'habit', category: 'entity', aliases: ['routine'] },
  { keyword: 'compare', category: 'action', aliases: ['diff'] }
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
    expect(match?.story.id).toBe('story_001');
  });

  it('should find compare story when compare intent given', () => {
    const intent: Intent = { action: 'compare', keywords: ['habit', 'compare'], filters: {}, confidence: 0.8 };
    const resolved: KeywordEntry[] = [mockKeywords[0], mockKeywords[1]];
    const match = resolver.findBestStory(intent, resolved);
    expect(match).toBeDefined();
    expect(match?.story.id).toBe('story_002');
  });

  it('should return undefined when no story matches', () => {
    const intent: Intent = { action: 'list', keywords: ['unknown'], filters: {}, confidence: 0.3 };
    const match = resolver.findBestStory(intent, []);
    expect(match).toBeUndefined();
  });
});
