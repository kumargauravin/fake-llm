import { useState } from 'react';

interface Result {
  id: string;
  name: string;
  category?: string;
  frequency?: string;
  streak?: number;
  description?: string;
  [key: string]: any;
}

interface LLMAnswer {
  intent: { action: string; keywords: string[]; confidence: number };
  results: Result[];
  summary: string;
  metadata: { source: string; execution_time_ms: number };
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<LLMAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setAnswer(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Something went wrong');
      }

      const data: LLMAnswer = await res.json();
      setAnswer(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🤖 fake-llm Demo</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        Ask questions about your habits in natural language. Powered by <strong>mock-llm</strong>.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="e.g. list all fitness habits"
          style={{
            flex: 1, padding: '10px 14px', fontSize: 16,
            border: '1px solid #ccc', borderRadius: 6
          }}
        />
        <button
          onClick={handleQuery}
          disabled={loading}
          style={{
            padding: '10px 20px', fontSize: 16, background: '#0070f3',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
          }}
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 16 }}>⚠️ {error}</div>
      )}

      {answer && (
        <div>
          <div style={{ background: '#f0f4ff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p><strong>📝 Summary:</strong> {answer.summary}</p>
            <p style={{ fontSize: 13, color: '#888' }}>
              Action: <code>{answer.intent.action}</code> |
              Keywords: <code>{answer.intent.keywords.join(', ')}</code> |
              Confidence: <code>{(answer.intent.confidence * 100).toFixed(0)}%</code> |
              Time: <code>{answer.metadata.execution_time_ms}ms</code>
            </p>
          </div>

          {answer.results.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {answer.results.map((r) => (
                <div key={r.id} style={{
                  border: '1px solid #e0e0e0', borderRadius: 8,
                  padding: 16, background: '#fff'
                }}>
                  <h3 style={{ margin: '0 0 6px' }}>{r.name}</h3>
                  {r.category && <p style={{ margin: '2px 0', fontSize: 13 }}>📂 {r.category}</p>}
                  {r.frequency && <p style={{ margin: '2px 0', fontSize: 13 }}>🔁 {r.frequency}</p>}
                  {r.streak !== undefined && <p style={{ margin: '2px 0', fontSize: 13 }}>🔥 {r.streak} day streak</p>}
                  {r.description && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>{r.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888' }}>No results found.</p>
          )}
        </div>
      )}

      <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 16, fontSize: 13, color: '#aaa' }}>
        Try: "list all habits" · "find fitness habits" · "compare habit_001 and habit_002" · "explain meditation"
      </div>
    </main>
  );
}
