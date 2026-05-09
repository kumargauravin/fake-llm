# Changelog

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
