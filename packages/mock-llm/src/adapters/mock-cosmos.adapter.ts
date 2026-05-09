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
    // params.source should be "databaseId/containerId" or just "containerId"
    const parts = params.source.split('/');
    const containerPath = path.join(this.options.basePath, ...parts);

    let items: any[] = [];

    if (fs.existsSync(containerPath) && fs.statSync(containerPath).isDirectory()) {
      // Directory of individual JSON files (mock-cosmos style)
      const files = fs.readdirSync(containerPath).filter(f => f.endsWith('.json'));
      items = files.map(file => {
        const content = fs.readFileSync(path.join(containerPath, file), 'utf8');
        return JSON.parse(content);
      });
    } else {
      // Try a single JSON file containing an array (e.g. learnings/habits.json)
      const filePath = containerPath + '.json';
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        console.warn(`MockCosmosAdapter: Path not found: ${containerPath}`);
        return [];
      }
    }

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
