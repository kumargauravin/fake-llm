import nlp from 'compromise';
import { Intent } from '../config/types';

// Stop words to remove from extracted terms
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'let', 'make',
  'why', 'what', 'how', 'when', 'where', 'who', 'which', 'that',
  'this', 'these', 'those', 'it', 'its', 'my', 'your', 'his', 'her',
  'our', 'their', 'me', 'him', 'us', 'them', 'and', 'or', 'but', 'if',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'just', 'also', 'not', 'no', 'nor', 'so', 'yet', 'both', 'either',
]);

export class NLPMatcher {
  parseQuery(query: string): Intent {
    // Strip punctuation for cleaner NLP processing
    const cleanQuery = query.replace(/[?!.,;:'"]/g, ' ').trim();
    const doc = nlp(cleanQuery);
    const action = this.extractAction(query);
    const keywords = this.extractKeywords(doc, cleanQuery);
    const filters = this.extractFilters(query);
    const confidence = keywords.length > 0 ? 0.8 : 0.3;

    return { action, keywords, filters, confidence };
  }

  private extractAction(query: string): Intent['action'] {
    const q = query.toLowerCase();
    if (q.includes('compare') || q.includes('difference')) return 'compare';
    if (q.includes('diff') || q.includes('what changed')) return 'diff';
    if (q.includes('find') || q.includes('search') || q.includes('which')) return 'find';
    if (q.includes('explain') || q.includes('what is') || q.includes('tell me about') || q.startsWith('why')) return 'explain';
    return 'list';
  }

  private extractKeywords(doc: any, cleanQuery: string): string[] {
    const nouns = doc.nouns().out('array') as string[];
    const adjectives = doc.adjectives().out('array') as string[];

    // Also split noun phrases into individual words
    const allTerms: string[] = [];
    for (const term of [...nouns, ...adjectives]) {
      // Split multi-word noun phrases into individual words
      const parts = term.toLowerCase().split(/\s+/);
      allTerms.push(...parts);
    }

    // Also add individual words from the clean query as fallback
    const queryWords = cleanQuery.toLowerCase().split(/\s+/);
    allTerms.push(...queryWords);

    return [...new Set(allTerms)]
      .map(w => w.toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  private extractFilters(query: string): Record<string, any> {
    const filters: Record<string, any> = {};
    // Only extract filters from explicit "field is/= value" patterns (not question words like "why")
    const questionWords = new Set(['why', 'what', 'how', 'when', 'where', 'who', 'which']);
    const pattern = /(?:where|with)\s+(\w+)\s+(?:is|=|equals?)\s+['"]?([^'"\s]+)['"]?/gi;
    let match;
    while ((match = pattern.exec(query)) !== null) {
      const [, key, value] = match;
      if (key && value && !questionWords.has(key.toLowerCase())) {
        filters[key] = value;
      }
    }
    return filters;
  }
}
