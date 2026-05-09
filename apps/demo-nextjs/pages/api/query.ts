import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { MockLLM } from 'mock-llm';

let llm: MockLLM | null = null;

async function getLLM(): Promise<MockLLM> {
  if (!llm) {
    llm = new MockLLM({
      configSource: {
        type: 'local',
        basePath: path.join(process.cwd(), 'config')
      },
      connections: {
        mockCosmos: {
          dataPath: path.join(process.cwd(), 'mock-db/learnings'),
          container: 'habits'
        }
      }
    });
    await llm.initialize();
  }
  return llm;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter.' });
  }

  try {
    const agent = await getLLM();
    const answer = await agent.query(query);
    return res.status(200).json(answer);
  } catch (error: any) {
    console.error('MockLLM query error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
