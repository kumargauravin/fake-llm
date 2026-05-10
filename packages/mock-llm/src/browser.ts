/**
 * @nice-tools/fake-llm — browser entry point
 *
 * Import from `@nice-tools/fake-llm/browser` to get only isomorphic code that
 * works in both the browser and Node.js (≥ 18). No `fs`, `path`, or
 * Node.js-only cloud SDKs are imported from this entry point.
 *
 * Server-only classes (`ConfigLoader`, `MockCosmosAdapter`, `ImageAdapter`,
 * `GCSAdapter`, `BlobAdapter`, `MockLLM`) are NOT exported here.
 * Import from `@nice-tools/fake-llm` to get those.
 */

// Types (pure interfaces, fully isomorphic)
export * from './config/types';

// Base adapter interface (isomorphic)
export * from './adapters/base.adapter';

// Isomorphic engine classes
export * from './engine/nlp-matcher';
export * from './engine/keyword-resolver';
export * from './engine/story-resolver';
export * from './engine/query-builder';
export * from './engine/response-builder';

// Fetch-based (isomorphic) config loader and data adapter
export * from './config/fetch-loader';
export * from './adapters/http-mock.adapter';

// Core engine shared by MockLLM and BrowserMockLLM
export * from './mock-llm-engine';

// Browser-optimised orchestrator (the main export for browser consumers)
export * from './browser-mock-llm';
