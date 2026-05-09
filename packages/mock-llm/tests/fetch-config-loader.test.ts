import { FetchConfigLoader } from '../src/config/fetch-loader';
import { KeywordEntry, Story } from '../src/config/types';

const mockKeywords: KeywordEntry[] = [
  { keyword: 'sky', aliases: ['blue sky', 'sky color'], category: 'science', data_source: 'knowledge/science' },
  { keyword: 'habit', aliases: ['routine'], category: 'entity', data_source: 'learnings/habits' },
];

const mockStories: Story[] = [
  {
    story_id: 'sky-001',
    description: 'Why is the sky blue',
    keywords: ['sky'],
    relations: [],
    resolution_steps: [{ step: 1, action: 'fetch', from_source: 'knowledge/science' }]
  },
];

describe('FetchConfigLoader', () => {
  let loader: FetchConfigLoader;

  beforeEach(() => {
    loader = new FetchConfigLoader({
      keywordsUrl: 'https://example.com/data/keywords.json',
      storiesUrl: 'https://example.com/data/stories.json',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadKeywords()', () => {
    it('should load keywords from the configured URL', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockKeywords),
      } as any);

      const result = await loader.loadKeywords();

      expect(result).toEqual(mockKeywords);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/data/keywords.json');
    });

    it('should wrap a single keyword object in an array', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockKeywords[0]),
      } as any);

      const result = await loader.loadKeywords();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockKeywords[0]);
    });

    it('should throw when the keyword fetch returns a non-OK status', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 } as any);

      await expect(loader.loadKeywords()).rejects.toThrow('404');
    });

    it('should include the URL in the error message', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 } as any);

      await expect(loader.loadKeywords()).rejects.toThrow(
        'https://example.com/data/keywords.json'
      );
    });
  });

  describe('loadStories()', () => {
    it('should load stories from the configured URL', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStories),
      } as any);

      const result = await loader.loadStories();

      expect(result).toEqual(mockStories);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/data/stories.json');
    });

    it('should wrap a single story object in an array', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStories[0]),
      } as any);

      const result = await loader.loadStories();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockStories[0]);
    });

    it('should throw when the story fetch returns a non-OK status', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503 } as any);

      await expect(loader.loadStories()).rejects.toThrow('503');
    });

    it('should include the URL in the error message', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 } as any);

      await expect(loader.loadStories()).rejects.toThrow(
        'https://example.com/data/stories.json'
      );
    });
  });
});
