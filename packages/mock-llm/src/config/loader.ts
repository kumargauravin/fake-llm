import * as fs from 'fs';
import * as path from 'path';
import { ConfigSource, KeywordEntry, Story } from './types';
import { BlobServiceClient } from '@azure/storage-blob';
import { CosmosClient } from '@azure/cosmos';
import { Storage } from '@google-cloud/storage';

export class ConfigLoader {
  constructor(private source: ConfigSource, private connections: any) {}

  async loadKeywords(): Promise<KeywordEntry[]> {
    if (this.source.type === 'local') {
      return this.loadLocalKeywords();
    }
    // Add blob, cosmos, gcs loaders as needed
    throw new Error(`Unsupported config source: ${this.source.type}`);
  }

  async loadStories(): Promise<Story[]> {
    if (this.source.type === 'local') {
      return this.loadLocalStories();
    }
    throw new Error(`Unsupported config source: ${this.source.type}`);
  }

  private loadLocalKeywords(): KeywordEntry[] {
    const keywordsPath = path.join(this.source.location.path!, 'keywords');
    const files = fs.readdirSync(keywordsPath).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const content = fs.readFileSync(path.join(keywordsPath, file), 'utf8');
      return JSON.parse(content) as KeywordEntry;
    });
  }

  private loadLocalStories(): Story[] {
    const storiesPath = path.join(this.source.location.path!, 'stories');
    const files = fs.readdirSync(storiesPath).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const content = fs.readFileSync(path.join(storiesPath, file), 'utf8');
      return JSON.parse(content) as Story;
    });
  }
}
