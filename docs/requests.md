# fake-llm — Master Push Plan

## ✅ DONE

### Root Workspace
- [x] `package.json`
- [x] `nx.json`
- [x] `tsconfig.base.json`
- [x] `.gitignore`
- [x] `.env.example`

### packages/mock-llm — Config
- [x] `src/config/types.ts`
- [x] `src/config/loader.ts`
- [x] `src/config/validator.ts`

### packages/mock-llm — Package Config
- [x] `package.json`
- [x] `tsconfig.json`
- [x] `tsup.config.ts`
- [x] `jest.config.js`

### packages/mock-llm — Adapters
- [x] `src/adapters/base.adapter.ts`
- [x] `src/adapters/cosmos.adapter.ts`
- [x] `src/adapters/blob.adapter.ts`
- [x] `src/adapters/gcs.adapter.ts`
- [x] `src/adapters/mock-cosmos.adapter.ts`
- [x] `src/adapters/image.adapter.ts`

### packages/mock-llm — Engine
- [x] `src/engine/keyword-resolver.ts`

---

## 🔄 PENDING (in order)

### packages/mock-llm — Engine (remaining)
- [ ] `src/engine/nlp-matcher.ts`
- [ ] `src/engine/story-resolver.ts`
- [ ] `src/engine/query-builder.ts`
- [ ] `src/engine/response-builder.ts`

### packages/mock-llm — Main API
- [ ] `src/mock-llm.ts`
- [ ] `src/index.ts`

### packages/mock-llm — Tests
- [ ] `tests/nlp-matcher.test.ts`
- [ ] `tests/story-resolver.test.ts`
- [ ] `tests/adapters.test.ts`
- [ ] `tests/integration.test.ts`

### Demo Config (apps/demo-nextjs/config)
- [ ] `keywords/habit.json`
- [ ] `keywords/skill.json`
- [ ] `keywords/moral.json`
- [ ] `keywords/learning.json`
- [ ] `stories/daily_learning.json`
- [ ] `sources/local.json`

### Mock Database (apps/demo-nextjs/mock-db/learnings)
- [ ] `habits/habit_001.json`
- [ ] `habits/habit_002.json`
- [ ] `habits/habit_003.json`
- [ ] `habits/habit_004.json`
- [ ] `habits/habit_005.json`
- [ ] `skills/skill_001.json`
- [ ] `skills/skill_002.json`
- [ ] `skills/skill_003.json`
- [ ] `skills/skill_004.json`
- [ ] `morals/moral_001.json`
- [ ] `morals/moral_002.json`
- [ ] `morals/moral_003.json`

### Scripts
- [ ] `scripts/bump-version.js`
- [ ] `scripts/publish.js`
- [ ] `scripts/test-demo.js`
- [ ] `scripts/validate-config.js`

### CI/CD
- [ ] `.github/workflows/test.yml`
- [ ] `.github/workflows/publish.yml`

### Documentation
- [x] `docs/requests.md` ← THIS FILE
- [ ] `README.md` (full version)
