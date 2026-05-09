import { BaseAdapter, QueryParams } from './base.adapter';

export interface HttpMockAdapterOptions {
  /**
   * Base URL for all data-source JSON files, e.g. `'https://example.com/data'`
   * or `'/data'` for a relative path on the same origin.
   *
   * A query for `source: 'knowledge/science'` fetches
   * `{baseUrl}/knowledge/science.json`.
   */
  baseUrl: string;
}

/**
 * Isomorphic data adapter that retrieves pre-aggregated JSON from a static
 * HTTP endpoint via `fetch()`.
 *
 * Works in both browser and Node.js (≥ 18) environments with no file-system
 * dependencies. Intended for use with `BrowserMockLLM` and static hosting
 * (e.g. GitHub Pages, CDN, or any HTTP server that can serve JSON files).
 *
 * Filtering and limiting are applied client-side after fetching the full
 * collection, matching the behaviour of `MockCosmosAdapter`.
 */
export class HttpMockAdapter extends BaseAdapter {
  constructor(private options: HttpMockAdapterOptions) {
    super();
  }

  async query(params: QueryParams): Promise<any[]> {
    // Validate source to prevent path traversal and protocol injection
    if (
      params.source.includes('..') ||
      params.source.startsWith('/') ||
      params.source.includes('://')
    ) {
      throw new Error(`HttpMockAdapter: Invalid source path '${params.source}'`);
    }

    const base = this.options.baseUrl.replace(/\/$/, '');
    const url = `${base}/${params.source}.json`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`HttpMockAdapter: Failed to fetch ${url} (${response.status})`);
    }

    const data = await response.json() as unknown;
    let items: any[] = Array.isArray(data) ? (data as any[]) : [data];

    if (params.filters && Object.keys(params.filters).length > 0) {
      items = items.filter(item => this.matchesFilters(item, params.filters!));
    }

    if (params.limit) {
      items = items.slice(0, params.limit);
    }

    return items;
  }

  async getById(_id: string): Promise<any> {
    throw new Error('HttpMockAdapter.getById is not supported — use query() with a filters object');
  }

  private matchesFilters(item: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      const itemValue = this.getNestedValue(item, key);
      return itemValue === value;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
