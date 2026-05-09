export const DEMO_MODULE = {
  show_debug: true,
  connections: {
    mockCosmos: { basePath: 'mock-db' },
    mockStorage: { basePath: 'public/data' }
  }
} as const;
