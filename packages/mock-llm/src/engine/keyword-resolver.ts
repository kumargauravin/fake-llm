import { KeywordEntry } from '../config/types';

export class KeywordResolver {
  constructor(private keywords: KeywordEntry[]) {}

  resolve(term: string): KeywordEntry | undefined {
    const lowerTerm = term.toLowerCase();

    // Try exact keyword match first
    let match = this.keywords.find(kw => kw.keyword.toLowerCase() === lowerTerm);

    // Try exact alias match
    if (!match) {
      match = this.keywords.find(kw =>
        kw.aliases.some(alias => alias.toLowerCase() === lowerTerm)
      );
    }

    // Try partial: keyword is a substring of the term (e.g. term "blue sky" contains keyword "sky")
    if (!match) {
      match = this.keywords.find(kw =>
        kw.keyword.length > 2 && lowerTerm.includes(kw.keyword.toLowerCase())
      );
    }

    return match;
  }

  /**
   * Resolves a list of NLP-extracted terms AND also checks the full original query
   * against all keyword aliases (to handle multi-word alias phrases).
   */
  resolveAll(terms: string[], fullQuery?: string): KeywordEntry[] {
    const resolved = new Map<string, KeywordEntry>();

    // Resolve individual NLP terms
    for (const term of terms) {
      const kw = this.resolve(term);
      if (kw) resolved.set(kw.keyword, kw);
    }

    // Also check the full query (lowercased, no punctuation) against all aliases
    if (fullQuery) {
      const lowerQuery = fullQuery.toLowerCase().replace(/[?!.,;:'"]/g, ' ');
      for (const kw of this.keywords) {
        if (!resolved.has(kw.keyword)) {
          const aliasMatch = kw.aliases.some(alias => {
            const lowerAlias = alias.toLowerCase();
            return lowerAlias.length > 3 && lowerQuery.includes(lowerAlias);
          });
          if (aliasMatch) resolved.set(kw.keyword, kw);
        }
      }
    }

    return Array.from(resolved.values());
  }

  getRelatedKeywords(keyword: KeywordEntry): KeywordEntry[] {
    return this.keywords.filter(kw =>
      kw.category === keyword.category && kw.keyword !== keyword.keyword
    );
  }
}
