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

    // If a single result has a direct answer field, return it
    if (results.length === 1 && results[0]?.answer) {
      return results[0].answer;
    }

    // For explain intent, prefer the answer field from the best match
    if (intent.action === 'explain') {
      const withAnswer = results.find(r => r.answer);
      if (withAnswer) return withAnswer.answer;
      return Object.entries(results[0])
        .filter(([key]) => !key.startsWith('_') && key !== 'id')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }

    if (intent.action === 'compare') return `Comparing ${results.length} items.`;

    // For multiple results, list all answers if available
    const answers = results.filter(r => r.answer).map(r => r.answer);
    if (answers.length > 0) return answers.join(' | ');

    return `Found ${results.length} result(s).`;
  }
}
