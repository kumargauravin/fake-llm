/**
 * Runtime connection configuration (passed at agent creation, NOT in config files)
 */
export interface AdapterConnections {
  cosmos?: {
    endpoint: string;
    key: string;
  };
  blob?: {
    connectionString?: string;
    sasToken?: string;
    accountKey?: string;
  };
  gcs?: {
    projectId: string;
    keyFilePath: string;
  };
  mockCosmos?: {
    basePath: string; // e.g., './mock-db'
  };
  fallbackLLM?: {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    model: string;
  };
}

/**
 * Describes where configuration files are stored
 */
export interface ConfigSource {
  type: 'local' | 'blob' | 'cosmos' | 'gcs';
  location: {
    container?: string;
    databaseId?: string;
    bucket?: string;
    path?: string;
  };
}

/**
 * A keyword defines a domain concept (e.g., "habit", "skill", "moral")
 */
export interface KeywordEntry {
  keyword: string;
  aliases: string[];
  category: string;
  data_source: string; // e.g., "learnings/habits"
  source_kind?: 'cosmos' | 'blob' | 'logs' | 'static';
  schema?: Record<string, string>; // field name → type
}

export interface StoryContract {
  source_kind: 'cosmos' | 'blob' | 'logs' | 'cross-source';
  sources: string[];
  patterns?: string[];
  query_examples?: string[];
  notes?: string;
}

/**
 * A story defines how keywords relate and how to resolve queries
 */
export interface Story {
  story_id: string;
  description: string;
  keywords: string[];
  relations: Relation[];
  resolution_steps: ResolutionStep[];
  contract?: StoryContract;
}

export interface Relation {
  from_keyword: string;
  to_keyword: string;
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many';
  join_via?: string; // field name for joining
}

export interface ResolutionStep {
  step: number;
  action: 'fetch' | 'filter' | 'enrich' | 'compare' | 'diff';
  keyword?: string;
  from_source?: string;
  on?: string;
  left?: string;
  right?: string;
}

/**
 * Parsed user intent from NLP
 */
export interface Intent {
  action: 'list' | 'find' | 'compare' | 'diff' | 'explain';
  keywords: string[];
  filters: Record<string, any>;
  confidence: number;
}

export interface QueryParams {
  source: string;
  filters?: Record<string, any>;
  limit?: number;
  orderBy?: string;
}

export interface AnswerDebugStep {
  step: number;
  action: string;
  source?: string;
  queryParams?: QueryParams;
  builtFilter?: string;
  rowsReturned: number;
  sampleRows: any[];
}

export interface AnswerDebug {
  rawQuery: string;
  intent: Intent;
  resolvedKeywords: KeywordEntry[];
  unresolvedTerms: string[];
  storyCandidates: Array<{
    storyId: string;
    score: number;
    matchedKeywords: string[];
    storyKeywords: string[];
  }>;
  selectedStory?: { storyId: string; score: number };
  threshold: number;
  decision:
    | 'matched-story'
    | 'no-story-fallback-llm'
    | 'no-story-no-results'
    | 'fallback-llm-error';
  steps: AnswerDebugStep[];
  totals: { results: number; durationMs: number };
}

/**
 * Resolved answer from the engine
 */
export interface Answer {
  intent: Intent;
  story?: Story;
  results: any[];
  summary: string;
  metadata: {
    execution_time_ms: number;
    source: 'mock-llm' | 'fallback-llm';
  };
  debug?: AnswerDebug;
}
