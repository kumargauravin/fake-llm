import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, QueryParams } from './base.adapter';

export interface MockCosmosAdapterOptions {
  basePath: string; // e.g., './mock-db'
}

/**
 * Mock Cosmos DB adapter that reads from folder structure:
 * basePath/{databaseId}/{containerId}/{id}.json
 */
export class MockCosmosAdapter extends BaseAdapter {
  constructor(private options: MockCosmosAdapterOptions) {
    super();
  }

  async query(params: QueryParams): Promise<any[]> {
    // params.source should be "databaseId/containerId"
    const [dbId, containerId] = params.source.split('/');
    const containerPath = path.join(this.options.basePath, dbId, containerId);

    if (!fs.existsSync(containerPath)) {
      console.warn(`MockCosmosAdapter: Path not found: ${containerPath}`);
      return [];
    }

    const files = fs.readdirSync(containerPath).filter(f => f.endsWith('.json'));
    let items = files.map(file => {
      const content = fs.readFileSync(path.join(containerPath, file), 'utf8');
      return JSON.parse(content);
    });

    // Apply filters
    if (params.filters && Object.keys(params.filters).length > 0) {
      items = items.filter(item => this.matchesFilters(item, params.filters!));
    }

    // Apply limit
    if (params.limit) {
      items = items.slice(0, params.limit);
    }

    return items;
  }

  async getById(id: string): Promise<any> {
    throw new Error('getById requires source specification in MockCosmosAdapter');
  }

  private matchesFilters(item: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      // Support nested property access (e.g., "details.status")
      const itemValue = this.getNestedValue(item, key);
      return itemValue === value;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
