import { AdapterConnections, ConfigSource, Answer, Intent, KeywordEntry, Story } from './config/types';
import { ConfigLoader } from './config/loader';
import { NLPMatcher } from './engine/nlp-matcher';
import { KeywordResolver } from './engine/keyword-resolver';
import { StoryResolver } from './engine/story-resolver';
import { QueryBuilder } from './engine/query-builder';
import { ResponseBuilder } from './engine/response-builder';
import { MockCosmosAdapter } from './adapters/mock-cosmos.adapter';
import { CosmosAdapter } from './adapters/cosmos.adapter';
import { BaseAdapter } from './adapters/base.adapter';

export interface MockLLMOptions {
  configSource: ConfigSource;
  connections: AdapterConnections;
}

export class MockLLM {
  private configLoader: ConfigLoader;
  private nlpMatcher: NLPMatcher;
  private keywordResolver!: KeywordResolver;
  private storyResolver!: StoryResolver;
  private queryBuilder: QueryBuilder;
  private responseBuilder: ResponseBuilder;
  private adapter!: BaseAdapter;
  private keywords: KeywordEntry[] = [];
  private stories: Story[] = [];
  private fallbackLLMEnabled: boolean = false;

  constructor(private options: MockLLMOptions) {
    this.configLoader = new ConfigLoader(options.configSource, options.connections);
    this.nlpMatcher = new NLPMatcher();
    this.queryBuilder = new QueryBuilder();
    this.responseBuilder = new ResponseBuilder();
    this.fallbackLLMEnabled = options.connections.fallbackLLM?.enabled || false;
  }

  async initialize(): Promise<void> {
    this.keywords = await this.configLoader.loadKeywords();
    this.stories = await this.configLoader.loadStories();
    this.keywordResolver = new KeywordResolver(this.keywords);
    this.storyResolver = new StoryResolver(this.stories);

    if (this.options.connections.mockCosmos) {
      this.adapter = new MockCosmosAdapter(this.options.connections.mockCosmos);
    } else if (this.options.connections.cosmos) {
      this.adapter = new CosmosAdapter({
        endpoint: this.options.connections.cosmos.endpoint,
        key: this.options.connections.cosmos.key,
        databaseId: 'default'
      });
    } else {
      throw new Error('No data adapter configured');
    }
  }

  async query(userQuery: string): Promise<Answer> {
    const startTime = Date.now();
    const intent = this.nlpMatcher.parseQuery(userQuery);
    const resolvedKeywords = this.keywordResolver.resolveAll(intent.keywords);
    const storyMatch = this.storyResolver.findBestStory(intent, resolvedKeywords);

    if (!storyMatch && this.fallbackLLMEnabled) {
      return await this.queryFallbackLLM(userQuery, intent, startTime);
    }

    if (!storyMatch) {
      return this.responseBuilder.buildAnswer(intent, undefined, [], Date.now() - startTime, 'mock-llm');
    }

    let results: any[] = [];
    for (const step of storyMatch.story.resolution_steps) {
      if (step.action === 'fetch') {
        const queryParams = this.queryBuilder.buildQuery(step, intent);
        const data = await this.adapter.query(queryParams);
        results = [...results, ...data];
      }
    }

    return this.responseBuilder.buildAnswer(intent, storyMatch.story, results, Date.now() - startTime, 'mock-llm');
  }

  private async queryFallbackLLM(userQuery: string, intent: Intent, startTime: number): Promise<Answer> {
    const llmConfig = this.options.connections.fallbackLLM!;
    try {
      const response = await fetch(llmConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.apiKey}`
        },
        body: JSON.stringify({
          model: llmConfig.model,
          messages: [{ role: 'user', content: userQuery }]
        })
      });
      const data = await response.json();
      const llmAnswer = data.choices?.[0]?.message?.content || 'No response from LLM';
      return {
        intent, story: undefined,
        results: [{ answer: llmAnswer }],
        summary: llmAnswer,
        metadata: { execution_time_ms: Date.now() - startTime, source: 'fallback-llm' }
      };
    } catch (error: any) {
      return {
        intent, story: undefined, results: [],
        summary: `Fallback LLM error: ${error.message}`,
        metadata: { execution_time_ms: Date.now() - startTime, source: 'fallback-llm' }
      };
    }
  }
}
