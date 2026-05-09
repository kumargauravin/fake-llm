import { ResolutionStep, Intent } from '../config/types';
import { QueryParams } from '../adapters/base.adapter';

export class QueryBuilder {
  buildQuery(step: ResolutionStep, intent: Intent): QueryParams {
    return {
      source: step.from_source || '',
      filters: { ...intent.filters }
    };
  }

  buildSQLWhere(filters: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) return '';
    const conditions = Object.entries(filters).map(([key, value]) =>
      typeof value === 'string' ? `c.${key} = '${value}'` : `c.${key} = ${value}`
    );
    return 'WHERE ' + conditions.join(' AND ');
  }
}
