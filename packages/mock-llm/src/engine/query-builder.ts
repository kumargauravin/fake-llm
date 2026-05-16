import { ResolutionStep, Intent } from '../config/types';
import { QueryParams } from '../adapters/base.adapter';

export class QueryBuilder {
  buildQuery(step: ResolutionStep, intent: Intent): QueryParams {
    return {
      source: step.from_source || '',
      filters: { ...intent.filters }
    };
  }

  buildQueryPreview(step: ResolutionStep, intent: Intent, resolvedKeywords: string[] = []): {
    generatedQuery: string;
    searchPattern: string;
  } {
    const filters = intent.filters || {};
    const where = Object.entries(filters).map(([key, value]) =>
      typeof value === 'string' ? `c.${key} = '${value}'` : `c.${key} = ${value}`
    ).join(' AND ');
    const generatedQuery = where
      ? `SELECT * FROM c WHERE ${where}`
      : `SELECT * FROM c /* ${step.from_source || 'source'} */`;
    const terms = [...new Set([...(step.keyword ? [step.keyword] : []), ...resolvedKeywords])];
    const searchPattern = terms.length > 0
      ? `MATCH ${terms.map(term => `"${term}"`).join(' OR ')}`
      : `MATCH ${step.from_source || 'source'}*`;
    return { generatedQuery, searchPattern };
  }

  buildSQLWhere(filters: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) return '';
    const conditions = Object.entries(filters).map(([key, value]) =>
      typeof value === 'string' ? `c.${key} = '${value}'` : `c.${key} = ${value}`
    );
    return 'WHERE ' + conditions.join(' AND ');
  }
}
