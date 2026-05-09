import { Storage } from '@google-cloud/storage';
import { BaseAdapter, QueryParams } from './base.adapter';

export interface GCSAdapterOptions {
  projectId: string;
  keyFilePath: string;
}

/**
 * Google Cloud Storage adapter for fetching JSON data from GCS buckets.
 *
 * @server-only The `@google-cloud/storage` SDK is Node.js-only and has no
 * browser build. Do not import from `@nice-tools/mock-llm/browser`.
 */
export class GCSAdapter extends BaseAdapter {
  private storage: Storage;

  constructor(private options: GCSAdapterOptions) {
    super();
    this.storage = new Storage({
      projectId: options.projectId,
      keyFilename: options.keyFilePath
    });
  }

  async query(params: QueryParams): Promise<any[]> {
    const bucket = this.storage.bucket(params.source);
    const [files] = await bucket.getFiles();
    const results: any[] = [];

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const [content] = await file.download();
        const data = JSON.parse(content.toString('utf8'));
        
        if (this.matchesFilters(data, params.filters || {})) {
          results.push(data);
        }
      }
    }

    return results;
  }

  async getById(id: string): Promise<any> {
    throw new Error('getById not implemented for GCSAdapter');
  }

  private matchesFilters(data: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => data[key] === value);
  }
}
