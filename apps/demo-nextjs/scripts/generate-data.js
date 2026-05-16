#!/usr/bin/env node
'use strict';

/**
 * Prebuild script: aggregates config and mock-db JSON files into public/data/
 * so the static export can serve them via BrowserMockLLM / FetchConfigLoader.
 *
 * Outputs:
 *   public/data/keywords.json      – flat array merged from config/keywords/*.json
 *   public/data/stories.json       – flat array merged from config/stories/*.json
 *   public/data/context-map.json   – demo context manifest for the static UI
 *   public/data/<source>.json      – one file per data_source referenced in keywords:
 *                                    • if mock-db/<source>/ is a directory, all its
 *                                      *.json files are merged into a single array
 *                                    • if mock-db/<source>.json is a file, it is copied
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(APP_DIR, 'config');
const MOCK_DB_DIR = path.join(APP_DIR, 'mock-db');
const OUT_DIR = path.join(APP_DIR, 'public', 'data');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function inferSourceKind(source) {
  if (source.startsWith('observability/') || source.startsWith('logs/')) return 'logs';
  if (source.startsWith('content/') || source.startsWith('blob/')) return 'blob';
  return 'cosmos';
}

/** Read all *.json files in a directory and flatten them into a single array. */
function aggregateJsonFiles(dir) {
  const results = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    const data = readJson(path.join(dir, file));
    if (Array.isArray(data)) {
      results.push(...data);
    } else {
      results.push(data);
    }
  }
  return results;
}

// ── Aggregate config/keywords → public/data/keywords.json ───────────────────
ensureDir(OUT_DIR);
const keywords = aggregateJsonFiles(path.join(CONFIG_DIR, 'keywords'));
fs.writeFileSync(path.join(OUT_DIR, 'keywords.json'), JSON.stringify(keywords, null, 2));
console.log(`keywords.json: ${keywords.length} entries`);

// ── Aggregate config/stories → public/data/stories.json ─────────────────────
const stories = aggregateJsonFiles(path.join(CONFIG_DIR, 'stories'));
fs.writeFileSync(path.join(OUT_DIR, 'stories.json'), JSON.stringify(stories, null, 2));
console.log(`stories.json: ${stories.length} entries`);

// ── Aggregate config/taxonomy → public/data/taxonomy.json ───────────────────
const taxonomy = aggregateJsonFiles(path.join(CONFIG_DIR, 'taxonomy'));
fs.writeFileSync(path.join(OUT_DIR, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2));
console.log(`taxonomy.json: ${taxonomy.length} entries`);

// ── Process each data_source referenced in keywords → public/data/<source>.json
const dataSources = [...new Set([
  ...keywords.filter(k => k.data_source).map(k => k.data_source),
  ...stories.flatMap(story => (story.contract?.sources || [])),
  ...stories.flatMap(story => (story.resolution_steps || []).map(step => step.from_source).filter(Boolean))
])];
console.log('mock-db:');
for (const source of dataSources) {
  const outFile = path.join(OUT_DIR, source + '.json');
  ensureDir(path.dirname(outFile));

  const dirPath = path.join(MOCK_DB_DIR, source);
  const filePath = path.join(MOCK_DB_DIR, source + '.json');

  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    // Directory of individual record files: aggregate into a single array
    const data = aggregateJsonFiles(dirPath);
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    console.log(`  ${source}.json (${data.length} entries, merged from directory)`);
  } else if (fs.existsSync(filePath)) {
    // Already an aggregated JSON file: copy as-is
    const data = readJson(filePath);
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    const count = Array.isArray(data) ? data.length : 1;
    console.log(`  ${source}.json (${count} entries, copied from file)`);
  } else {
    console.warn(`  WARNING: data source '${source}' not found in mock-db (tried directory and .json file)`);
  }
}

const sourceCatalog = dataSources.map(source => ({
  source,
  source_kind: inferSourceKind(source),
  file: `data/${source}.json`,
  rowCount: (() => {
    const dirPath = path.join(MOCK_DB_DIR, source);
    const filePath = path.join(MOCK_DB_DIR, source + '.json');
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      return aggregateJsonFiles(dirPath).length;
    }
    if (fs.existsSync(filePath)) {
      const data = readJson(filePath);
      return Array.isArray(data) ? data.length : 1;
    }
    return 0;
  })()
}));

const storyContracts = stories.map(story => ({
  story_id: story.story_id,
  description: story.description,
  keywords: story.keywords || [],
  source_kind: story.contract?.source_kind || (story.contract?.sources?.length > 1 ? 'cross-source' : 'cosmos'),
  sources: story.contract?.sources || [...new Set((story.resolution_steps || []).map(step => step.from_source).filter(Boolean))],
  patterns: story.contract?.patterns || story.keywords || [],
  query_examples: story.contract?.query_examples || [],
  notes: story.contract?.notes || ''
}));

const contextMap = {
  module: {
    show_debug: true,
    connections: {
      mockCosmos: { basePath: 'mock-db' },
      mockStorage: { basePath: 'public/data' }
    }
  },
  keywords,
  stories,
  taxonomy,
  dataSources,
  sourceCatalog,
  storyContracts
};

fs.writeFileSync(path.join(OUT_DIR, 'context-map.json'), JSON.stringify(contextMap, null, 2));
console.log(`context-map.json: ${storyContracts.length} contracts, ${sourceCatalog.length} sources`);

console.log('Data generation complete.');
