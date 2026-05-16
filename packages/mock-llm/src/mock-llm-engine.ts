import { Answer, AnswerDebug, AnswerDebugStep, Intent, KeywordEntry, Story } from './config/types';
import { NLPMatcher } from './engine/nlp-matcher';
import { KeywordResolver } from './engine/keyword-resolver';
import { StoryResolver, STORY_THRESHOLD } from './engine/story-resolver';
import { QueryBuilder } from './engine/query-builder';
import { ResponseBuilder } from './engine/response-builder';
import { BaseAdapter } from './adapters/base.adapter';

export interface QueryOptions {
  debug?: boolean;
}

export interface FallbackLLMConfig {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * Isomorphic query engine — works in both Node.js and browser environments.
 *
 * Constructed with already-loaded keywords, stories, a data adapter, and an
 * optional fallback-LLM config. Both `MockLLM` (server) and `BrowserMockLLM`
 * (browser) delegate all query logic to this class.
 */
export class MockLLMEngine {
  private nlpMatcher: NLPMatcher;
  private keywordResolver: KeywordResolver;
  private storyResolver: StoryResolver;
  private queryBuilder: QueryBuilder;
  private responseBuilder: ResponseBuilder;

  constructor(
    private keywords: KeywordEntry[],
    private stories: Story[],
    private adapter: BaseAdapter,
    private fallbackLLM?: FallbackLLMConfig
  ) {
    this.nlpMatcher = new NLPMatcher();
    this.queryBuilder = new QueryBuilder();
    this.responseBuilder = new ResponseBuilder();
    this.keywordResolver = new KeywordResolver(keywords);
    this.storyResolver = new StoryResolver(stories);
  }

  // ─── Introspection API ───────────────────────────────────────────────────────

  getKeywords(): KeywordEntry[] {
    return this.keywords;
  }

  getStories(): Story[] {
    return this.stories;
  }

  listDataSources(): string[] {
    const sources = new Set<string>();
    for (const kw of this.keywords) {
      if (kw.data_source) sources.add(kw.data_source);
    }
    for (const story of this.stories) {
      if (story.contract?.sources) {
        for (const source of story.contract.sources) {
          if (source) sources.add(source);
        }
      }
      for (const step of story.resolution_steps) {
        if (step.from_source) sources.add(step.from_source);
      }
    }
    return Array.from(sources);
  }

  async getDataSourceSnapshot(source: string, limit = 50): Promise<any[]> {
    return this.adapter.query({ source, limit });
  }

  // ─── Query ───────────────────────────────────────────────────────────────────

  async query(userQuery: string, opts: QueryOptions = { debug: true }): Promise<Answer> {
    const includeDebug = opts.debug !== false;
    const startTime = Date.now();
    const intent = this.nlpMatcher.parseQuery(userQuery);
    const nlpTerms = intent.keywords;
    const resolvedKeywords = this.keywordResolver.resolveAll(nlpTerms, userQuery);
    const unresolvedTerms = nlpTerms.filter(
      term => !resolvedKeywords.some(kw =>
        kw.keyword.toLowerCase() === term.toLowerCase() ||
        kw.aliases.some(a => a.toLowerCase() === term.toLowerCase())
      )
    );
    const storyCandidates = this.storyResolver.scoreAll(intent, resolvedKeywords);
    const storyMatch = storyCandidates.find(c => c.score > STORY_THRESHOLD);
    const matchedStory = storyMatch
      ? this.stories.find(s => ((s as any).story_id || (s as any).id) === storyMatch.storyId)
      : undefined;

    const debugSteps: AnswerDebugStep[] = [];

    if (!matchedStory && this.fallbackLLM?.enabled) {
      const debugInfo: AnswerDebug | undefined = includeDebug ? {
        rawQuery: userQuery,
        intent,
        resolvedKeywords,
        unresolvedTerms,
        storyCandidates,
        selectedStory: undefined,
        threshold: STORY_THRESHOLD,
        decision: 'no-story-fallback-llm',
        steps: [],
        totals: { results: 0, durationMs: Date.now() - startTime }
      } : undefined;
      const ans = await this.queryFallbackLLM(userQuery, intent, startTime);
      if (includeDebug && debugInfo) {
        debugInfo.totals.durationMs = Date.now() - startTime;
        debugInfo.decision = ans.metadata.source === 'fallback-llm' && ans.results.length > 0
          ? 'no-story-fallback-llm'
          : 'fallback-llm-error';
        ans.debug = debugInfo;
      }
      return ans;
    }

    if (!matchedStory) {
      const answer = this.responseBuilder.buildAnswer(intent, undefined, [], Date.now() - startTime, 'mock-llm');
      if (includeDebug) {
        answer.debug = {
          rawQuery: userQuery,
          intent,
          resolvedKeywords,
          unresolvedTerms,
          storyCandidates,
          selectedStory: undefined,
          threshold: STORY_THRESHOLD,
          decision: 'no-story-no-results',
          steps: [],
          totals: { results: 0, durationMs: Date.now() - startTime }
        };
      }
      return answer;
    }

    let results: any[] = [];
    let stepIndex = 0;
    for (const step of matchedStory.resolution_steps) {
      if (step.action === 'fetch') {
        const queryParams = this.queryBuilder.buildQuery(step, intent);
        const builtFilter = this.queryBuilder.buildSQLWhere(queryParams.filters || {});
        const data = await this.adapter.query(queryParams);
        if (includeDebug) {
          debugSteps.push({
            step: step.step ?? ++stepIndex,
            action: step.action,
            source: queryParams.source,
            queryParams,
            builtFilter: builtFilter || `GET ${queryParams.source}/*`,
            rowsReturned: data.length,
            sampleRows: data.slice(0, 3)
          });
        }
        results = [...results, ...data];
      }
    }

    const answer = this.responseBuilder.buildAnswer(intent, matchedStory, results, Date.now() - startTime, 'mock-llm');
    if (includeDebug) {
      answer.debug = {
        rawQuery: userQuery,
        intent,
        resolvedKeywords,
        unresolvedTerms,
        storyCandidates,
        selectedStory: { storyId: storyMatch!.storyId, score: storyMatch!.score },
        threshold: STORY_THRESHOLD,
        decision: 'matched-story',
        steps: debugSteps,
        totals: { results: results.length, durationMs: Date.now() - startTime }
      };
    }
    return answer;
  }

  private async queryFallbackLLM(userQuery: string, intent: Intent, startTime: number): Promise<Answer> {
    const llmConfig = this.fallbackLLM!;
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
      const data = await response.json() as any;
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
