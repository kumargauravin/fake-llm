import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { MockLLM } from '@nice-tools/mock-llm';
import { DEMO_MODULE } from '../../lib/demo-module';

let llm: MockLLM | null = null;

async function getLLM(): Promise<MockLLM> {
  if (!llm) {
    llm = new MockLLM({
      configSource: {
        type: 'local',
        location: {
          path: path.join(process.cwd(), 'config')
        }
      },
      connections: {
        mockCosmos: {
          basePath: path.join(process.cwd(), DEMO_MODULE.connections.mockCosmos.basePath)
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
    const answer = await agent.query(query, { debug: DEMO_MODULE.show_debug });
    return res.status(200).json(answer);
  } catch (error: any) {
    console.error('MockLLM query error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
