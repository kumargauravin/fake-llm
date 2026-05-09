import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { MockLLM } from '@nice-tools/mock-llm';

let llm: MockLLM | null = null;

async function getLLM(): Promise<MockLLM> {
  if (!llm) {
    llm = new MockLLM({
      configSource: {
        type: 'local',
        location: { path: path.join(process.cwd(), 'config') }
      },
      connections: {
        mockCosmos: { basePath: path.join(process.cwd(), 'mock-db') }
      }
    });
    await llm.initialize();
  }
  return llm;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const agent = await getLLM();
    return res.status(200).json({
      keywords: agent.getKeywords(),
      stories: agent.getStories(),
      dataSources: agent.listDataSources()
    });
  } catch (error: any) {
    console.error('Config API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
