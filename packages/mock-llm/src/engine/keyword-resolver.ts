import { KeywordEntry } from '../config/types';

export class KeywordResolver {
  constructor(private keywords: KeywordEntry[]) {}

  resolve(term: string): KeywordEntry | undefined {
    const lowerTerm = term.toLowerCase();
    
    // Try exact match first
    let match = this.keywords.find(kw => kw.keyword.toLowerCase() === lowerTerm);
    
    // Try aliases
    if (!match) {
      match = this.keywords.find(kw => 
        kw.aliases.some(alias => alias.toLowerCase() === lowerTerm)
      );
    }
    
    // Try partial match
    if (!match) {
      match = this.keywords.find(kw => 
        kw.keyword.toLowerCase().includes(lowerTerm) ||
        kw.aliases.some(alias => alias.toLowerCase().includes(lowerTerm))
      );
    }
    
    return match;
  }

  resolveAll(terms: string[]): KeywordEntry[] {
    return terms
      .map(term => this.resolve(term))
      .filter((kw): kw is KeywordEntry => kw !== undefined);
  }

  getRelatedKeywords(keyword: KeywordEntry): KeywordEntry[] {
    return this.keywords.filter(kw => 
      kw.category === keyword.category && kw.keyword !== keyword.keyword
    );
  }
}
