import { CosmosClient, Database, Container } from '@azure/cosmos';
import { BaseAdapter, QueryParams } from './base.adapter';

export interface CosmosAdapterOptions {
  endpoint: string;
  key: string;
  databaseId: string;
}

export class CosmosAdapter extends BaseAdapter {
  private client: CosmosClient;
  private database: Database;

  constructor(private options: CosmosAdapterOptions) {
    super();
    this.client = new CosmosClient({
      endpoint: options.endpoint,
      key: options.key
    });
    this.database = this.client.database(options.databaseId);
  }

  async query(params: QueryParams): Promise<any[]> {
    const container = this.database.container(params.source);
    
    let sql = `SELECT * FROM c`;
    const whereClause = this.buildWhereClause(params.filters || {});
    if (whereClause) {
      sql += ` ${whereClause}`;
    }

    if (params.orderBy) {
      sql += ` ORDER BY c.${params.orderBy}`;
    }

    if (params.limit) {
      sql += ` OFFSET 0 LIMIT ${params.limit}`;
    }

    const { resources } = await container.items.query(sql).fetchAll();
    return resources;
  }

  async getById(id: string): Promise<any> {
    // Note: Requires container name - simplified for demo
    throw new Error('getById requires container specification');
  }
}
