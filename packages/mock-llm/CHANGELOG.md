# Changelog

## [1.2.0] - 2026-05-09

### Added
- **`MockLLMEngine`** — isomorphic core engine extracted from `MockLLM`. Accepts
  already-loaded keywords, stories, a `BaseAdapter`, and an optional
  `FallbackLLMConfig`. Works in both browser and Node.js. Both `MockLLM` and the
  new `BrowserMockLLM` delegate all query and introspection logic to this class.
- **`FetchConfigLoader`** — isomorphic config loader (`src/config/fetch-loader.ts`).
  Loads keyword and story definitions from pre-aggregated JSON files via `fetch()`
  with no file-system dependencies. Constructor accepts `{ keywordsUrl, storiesUrl }`.
- **`HttpMockAdapter`** — isomorphic data adapter (`src/adapters/http-mock.adapter.ts`).
  Fetches pre-aggregated JSON from a static HTTP base URL via `fetch()`. A query for
  `source: 'knowledge/science'` fetches `{baseUrl}/knowledge/science.json`. Returns
  an empty array for 404 responses; applies filters and limit client-side.
- **`BrowserMockLLM`** — browser-safe orchestrator. Wraps `FetchConfigLoader`,
  `HttpMockAdapter`, and `MockLLMEngine`. Exposes the same API as `MockLLM`
  (`initialize()`, `query()`, introspection methods). Import from
  `@nice-tools/fake-llm/browser`.
- **`@nice-tools/fake-llm/browser` sub-path export** — new entry point
  (`src/browser.ts`) that exports only isomorphic code: engine classes,
  `FetchConfigLoader`, `HttpMockAdapter`, `MockLLMEngine`, `BrowserMockLLM`, and
  types. No `fs`, `path`, or Node.js-only cloud SDK imports.
- **`FallbackLLMConfig`** interface exported from `mock-llm-engine.ts`.
- **`MockLLMOptions`** and **`BrowserMockLLMOptions`** interfaces exported from
  `index.ts`.

### Changed
- **`MockLLM`** refactored to delegate all query/introspection logic to
  `MockLLMEngine`. Public API is identical; `initialize()` now loads keywords and
  stories in parallel via `Promise.all`.
- **`BlobAdapter.streamToString`** replaced by `readDownloadResponse` which handles
  both environments: uses `response.blobBody` (→ `Blob.text()`) in the browser and
  `response.readableStreamBody` (→ Node.js stream events) in Node.js.
- **`GCSAdapter`** and **`ImageAdapter`** marked with `@server-only` JSDoc.
- Package version bumped to `1.2.0`.

## [1.1.0] - 2026-05-09

### Added
- **`AnswerDebug` block** on every `Answer`: includes `rawQuery`, `intent`, `resolvedKeywords`, `unresolvedTerms`, `storyCandidates` (with scores), `selectedStory`, `threshold`, `decision`, per-step `queryParams` / `builtFilter` / `sampleRows`, and `totals`.
- **`query(userQuery, { debug?: boolean })`** — optional second argument (defaults to `{ debug: true }`). Pass `{ debug: false }` to skip debug overhead.
- **`StoryResolver.scoreAll(intent, keywords)`** — returns the full sorted list of story candidates used internally by `findBestStory`.
- **Introspection API** on `MockLLM`:
  - `getKeywords()` — returns all loaded `KeywordEntry[]`
  - `getStories()` — returns all loaded `Story[]`
  - `listDataSources()` — unique data sources from keywords + story resolution steps
  - `getDataSourceSnapshot(source, limit?)` — live rows from any adapter source
- **`ConfigLoader`** now handles both single-object and array-of-objects keyword/story files.
- **`MockCosmosAdapter`** now supports both directory-of-JSON-files and single-JSON-array-file layouts.

### Changed
- `STORY_THRESHOLD` constant exported from `story-resolver.ts` (was inline `0.1`).
- `QueryParams` interface moved to `config/types.ts` (re-exported from `base.adapter.ts` for backwards compatibility).

## [1.0.1] - 2026-01-01

Initial public release.
