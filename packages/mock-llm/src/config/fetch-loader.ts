import { KeywordEntry, Story } from './types';

export interface FetchConfigLoaderOptions {
  /** URL to a pre-aggregated JSON array of all keyword entries, e.g. '/data/keywords.json' */
  keywordsUrl: string;
  /** URL to a pre-aggregated JSON array of all story definitions, e.g. '/data/stories.json' */
  storiesUrl: string;
}

/**
 * Isomorphic config loader that fetches keyword and story definitions from
 * pre-aggregated JSON files via `fetch()`.
 *
 * Works in both browser and Node.js (≥ 18) environments with no file-system
 * dependencies. Intended for use with `BrowserMockLLM` and static hosting
 * (e.g. GitHub Pages, CDN, or any HTTP server that can serve JSON files).
 *
 * The expected JSON format for each URL is either:
 *   - An array: `[{ keyword: "sky", ... }, ...]`
 *   - A single object: `{ keyword: "sky", ... }` (wrapped into a one-element array)
 */
export class FetchConfigLoader {
  constructor(private options: FetchConfigLoaderOptions) {}

  async loadKeywords(): Promise<KeywordEntry[]> {
    const response = await fetch(this.options.keywordsUrl);
    if (!response.ok) {
      throw new Error(
        `FetchConfigLoader: Failed to fetch keywords from ${this.options.keywordsUrl} (${response.status})`
      );
    }
    const data = await response.json() as unknown;
    return Array.isArray(data) ? (data as KeywordEntry[]) : [data as KeywordEntry];
  }

  async loadStories(): Promise<Story[]> {
    const response = await fetch(this.options.storiesUrl);
    if (!response.ok) {
      throw new Error(
        `FetchConfigLoader: Failed to fetch stories from ${this.options.storiesUrl} (${response.status})`
      );
    }
    const data = await response.json() as unknown;
    return Array.isArray(data) ? (data as Story[]) : [data as Story];
  }
}
