import { AdapterConnections, ConfigSource, Answer, KeywordEntry, Story } from './config/types';
import { ConfigLoader } from './config/loader';
import { MockCosmosAdapter } from './adapters/mock-cosmos.adapter';
import { CosmosAdapter } from './adapters/cosmos.adapter';
import { BaseAdapter } from './adapters/base.adapter';
import { MockLLMEngine, QueryOptions, FallbackLLMConfig } from './mock-llm-engine';

export { QueryOptions } from './mock-llm-engine';

export interface MockLLMOptions {
  configSource: ConfigSource;
  connections: AdapterConnections;
}

/**
 * Server-side (Node.js) orchestrator for the mock-LLM engine.
 *
 * Loads configuration from the local file system via `ConfigLoader` and reads
 * data via `MockCosmosAdapter` or `CosmosAdapter`. All query logic is
 * delegated to the isomorphic `MockLLMEngine`.
 *
 * For browser / edge environments use `BrowserMockLLM` from
 * `@nice-tools/fake-llm/browser` instead.
 */
export class MockLLM {
  private configLoader: ConfigLoader;
  private engine!: MockLLMEngine;

  constructor(private options: MockLLMOptions) {
    this.configLoader = new ConfigLoader(options.configSource, options.connections);
  }

  async initialize(): Promise<void> {
    const [keywords, stories] = await Promise.all([
      this.configLoader.loadKeywords(),
      this.configLoader.loadStories(),
    ]);

    let adapter: BaseAdapter;
    if (this.options.connections.mockCosmos) {
      adapter = new MockCosmosAdapter(this.options.connections.mockCosmos);
    } else if (this.options.connections.cosmos) {
      adapter = new CosmosAdapter({
        endpoint: this.options.connections.cosmos.endpoint,
        key: this.options.connections.cosmos.key,
        databaseId: 'default'
      });
    } else {
      throw new Error('No data adapter configured');
    }

    const fallbackLLM = this.options.connections.fallbackLLM?.enabled
      ? (this.options.connections.fallbackLLM as FallbackLLMConfig)
      : undefined;

    this.engine = new MockLLMEngine(keywords, stories, adapter, fallbackLLM);
  }

  // ─── Introspection API ───────────────────────────────────────────────────────

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
