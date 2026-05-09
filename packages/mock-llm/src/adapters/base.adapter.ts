import { QueryParams } from '../config/types';

/**
 * Base adapter interface for data sources
 */
export interface IDataAdapter {
  query(params: QueryParams): Promise<any[]>;
  getById(id: string): Promise<any>;
}

export { QueryParams };

export abstract class BaseAdapter implements IDataAdapter {
  abstract query(params: QueryParams): Promise<any[]>;
  abstract getById(id: string): Promise<any>;

  protected buildWhereClause(filters: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) {
      return '';
    }

    const conditions = Object.entries(filters).map(([key, value]) => {
      if (typeof value === 'string') {
        return `c.${key} = '${value}'`;
      }
      return `c.${key} = ${value}`;
    });

    return 'WHERE ' + conditions.join(' AND ');
  }
}
