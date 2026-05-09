import { Answer, KeywordEntry, Story } from './config/types';
import { FetchConfigLoader } from './config/fetch-loader';
import { HttpMockAdapter } from './adapters/http-mock.adapter';
import { MockLLMEngine, QueryOptions, FallbackLLMConfig } from './mock-llm-engine';

export { QueryOptions } from './mock-llm-engine';

export interface BrowserMockLLMOptions {
  /** URL to a pre-aggregated JSON array of all keyword entries, e.g. '/data/keywords.json' */
  keywordsUrl: string;
  /** URL to a pre-aggregated JSON array of all story definitions, e.g. '/data/stories.json' */
  storiesUrl: string;
  /**
   * Base URL for data-source JSON files. A query for `source: 'knowledge/science'`
   * fetches `{dataBaseUrl}/knowledge/science.json`.
   */
  dataBaseUrl: string;
  fallbackLLM?: FallbackLLMConfig;
}

/**
 * Browser-safe orchestrator for the mock-LLM engine.
 *
 * Loads configuration and data via `fetch()` with no file-system dependencies.
 * Import from `@nice-tools/mock-llm/browser` to keep bundlers from pulling in
 * Node.js-only modules (`fs`, `path`, `@google-cloud/storage`, etc.).
 *
 * @example
 * ```ts
 * import { BrowserMockLLM } from '@nice-tools/mock-llm/browser';
 *
 * const llm = new BrowserMockLLM({
 *   keywordsUrl: '/data/keywords.json',
 *   storiesUrl:  '/data/stories.json',
 *   dataBaseUrl: '/data',
 * });
 * await llm.initialize();
 * const answer = await llm.query('what is the color of sky');
 * ```
 */
export class BrowserMockLLM {
  private engine!: MockLLMEngine;

  constructor(private options: BrowserMockLLMOptions) {}

  async initialize(): Promise<void> {
    const loader = new FetchConfigLoader({
      keywordsUrl: this.options.keywordsUrl,
      storiesUrl: this.options.storiesUrl,
    });
    const [keywords, stories] = await Promise.all([
      loader.loadKeywords(),
      loader.loadStories(),
    ]);
    const adapter = new HttpMockAdapter({ baseUrl: this.options.dataBaseUrl });
    const fallbackLLM = this.options.fallbackLLM?.enabled
      ? this.options.fallbackLLM
      : undefined;
    this.engine = new MockLLMEngine(keywords, stories, adapter, fallbackLLM);
  }

  // ─── Introspection API (mirrors MockLLM) ─────────────────────────────────────

  getKeywords(): KeywordEntry[] { return this.engine.getKeywords(); }
  getStories(): Story[] { return this.engine.getStories(); }
  listDataSources(): string[] { return this.engine.listDataSources(); }

  async getDataSourceSnapshot(source: string, limit = 50): Promise<any[]> {
    return this.engine.getDataSourceSnapshot(source, limit);
  }

  // ─── Query ───────────────────────────────────────────────────────────────────

  async query(userQuery: string, opts: QueryOptions = { debug: true }): Promise<Answer> {
    return this.engine.query(userQuery, opts);
  }
}
