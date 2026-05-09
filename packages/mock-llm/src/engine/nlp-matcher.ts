import nlp from 'compromise';
import { Intent } from '../config/types';

export class NLPMatcher {
  parseQuery(query: string): Intent {
    const doc = nlp(query);
    const action = this.extractAction(query);
    const keywords = this.extractKeywords(doc);
    const filters = this.extractFilters(query);
    const confidence = keywords.length > 0 ? 0.8 : 0.3;

    return { action, keywords, filters, confidence };
  }

  private extractAction(query: string): Intent['action'] {
    const q = query.toLowerCase();
    if (q.includes('compare') || q.includes('difference')) return 'compare';
    if (q.includes('diff') || q.includes('what changed')) return 'diff';
    if (q.includes('find') || q.includes('search') || q.includes('which')) return 'find';
    if (q.includes('explain') || q.includes('what is') || q.includes('tell me about')) return 'explain';
    return 'list';
  }

  private extractKeywords(doc: any): string[] {
    const nouns = doc.nouns().out('array');
    const adjectives = doc.adjectives().out('array');
    return [...new Set([...nouns, ...adjectives])]
      .map((w: string) => w.toLowerCase())
      .filter((w: string) => w.length > 2);
  }

  private extractFilters(query: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const pattern = /(?:where|with)?\s*(\w+)\s+(?:is|=|equals?)\s+['"]?([^'"\\s]+)['"]?/gi;
    let match;
    while ((match = pattern.exec(query)) !== null) {
      const [, key, value] = match;
      if (key && value) filters[key] = value;
    }
    return filters;
  }
}
