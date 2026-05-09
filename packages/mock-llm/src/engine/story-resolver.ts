import { Story, Intent, KeywordEntry } from '../config/types';

export interface StoryMatch {
  story: Story;
  score: number;
  matchedKeywords: string[];
}

export class StoryResolver {
  constructor(private stories: Story[]) {}

  findBestStory(intent: Intent, resolvedKeywords: KeywordEntry[]): StoryMatch | undefined {
    const matches = this.stories.map(story => {
      const score = this.scoreStory(story, intent, resolvedKeywords);
      const matchedKeywords = resolvedKeywords
        .filter(kw => story.keywords.includes(kw.keyword))
        .map(kw => kw.keyword);
      return { story, score, matchedKeywords };
    });

    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];
    return best && best.score > 0.3 ? best : undefined;
  }

  private scoreStory(story: Story, intent: Intent, resolvedKeywords: KeywordEntry[]): number {
    let score = 0;
    const keywordNames = resolvedKeywords.map(kw => kw.keyword);
    const overlap = story.keywords.filter(kw => keywordNames.includes(kw)).length;
    const keywordScore = overlap / Math.max(story.keywords.length, keywordNames.length, 1);
    score += keywordScore * 0.7;

    if (intent.action === 'compare' && story.resolution_steps.some(s => s.action === 'compare')) score += 0.2;
    if (intent.action === 'diff' && story.resolution_steps.some(s => s.action === 'diff')) score += 0.2;
    if (overlap === story.keywords.length) score += 0.1;

    return Math.min(score, 1.0);
  }
}
