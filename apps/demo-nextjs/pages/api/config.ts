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

  try {
    const agent = await getLLM();
    return res.status(200).json({
      keywords: agent.getKeywords(),
      stories: agent.getStories(),
      dataSources: agent.listDataSources(),
      module: {
        show_debug: DEMO_MODULE.show_debug,
        connections: {
          mockCosmos: { basePath: path.join(process.cwd(), DEMO_MODULE.connections.mockCosmos.basePath) },
          mockStorage: { basePath: path.join(process.cwd(), DEMO_MODULE.connections.mockStorage.basePath) }
        }
      }
    });
  } catch (error: any) {
    console.error('Config API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
