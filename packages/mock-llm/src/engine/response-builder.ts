import { Answer, Intent, Story } from '../config/types';

export class ResponseBuilder {
  buildAnswer(
    intent: Intent,
    story: Story | undefined,
    results: any[],
    executionTime: number,
    source: 'mock-llm' | 'fallback-llm'
  ): Answer {
    return {
      intent,
      story,
      results,
      summary: this.buildSummary(intent, results),
      metadata: {
        execution_time_ms: executionTime,
        source
      }
    };
  }

  private buildSummary(intent: Intent, results: any[]): string {
    if (results.length === 0) return "I couldn't find any results for your question.";

    if (intent.action === 'explain' && results.length === 1) {
      return Object.entries(results[0])
        .filter(([key]) => !key.startsWith('_') && key !== 'id')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }

    if (intent.action === 'compare') return `Comparing ${results.length} items.`;

    return `Found ${results.length} result(s).`;
  }
}
