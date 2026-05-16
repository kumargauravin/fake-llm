import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { MockLLM } from '@nice-tools/fake-llm';
import { DEMO_MODULE } from '../../lib/demo-module';

type MockLLMInstance = InstanceType<typeof MockLLM>;

let llm: MockLLMInstance | null = null;

async function getLLM(): Promise<MockLLMInstance> {
  if (!llm) {
    llm = new MockLLM({
      configSource: {
        type: 'local',
        location: { path: path.join(process.cwd(), 'config') }
      },
      connections: {
        mockCosmos: { basePath: path.join(process.cwd(), DEMO_MODULE.connections.mockCosmos.basePath) }
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

  const source = req.query.source as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  if (!source) {
    return res.status(400).json({ error: 'Missing required query parameter: source' });
  }

  try {
    const agent = await getLLM();
    const rows = await agent.getDataSourceSnapshot(source, limit);
    return res.status(200).json({ source, limit, rows });
  } catch (error: any) {
    console.error('Snapshot API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
