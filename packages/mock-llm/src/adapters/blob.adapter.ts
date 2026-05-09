import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { BaseAdapter, QueryParams } from './base.adapter';

export interface BlobAdapterOptions {
  connectionString?: string;
  sasToken?: string;
  accountName?: string;
  accountKey?: string;
}

export class BlobAdapter extends BaseAdapter {
  private blobServiceClient: BlobServiceClient;

  constructor(private options: BlobAdapterOptions) {
    super();
    
    if (options.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
    } else if (options.sasToken && options.accountName) {
      const blobSasUrl = `https://${options.accountName}.blob.core.windows.net${options.sasToken}`;
      this.blobServiceClient = new BlobServiceClient(blobSasUrl);
    } else {
      throw new Error('BlobAdapter requires connectionString or sasToken + accountName');
    }
  }

  async query(params: QueryParams): Promise<any[]> {
    const containerClient = this.blobServiceClient.getContainerClient(params.source);
    const results: any[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      if (blob.name.endsWith('.json')) {
        const blobClient = containerClient.getBlobClient(blob.name);
        const downloadResponse = await blobClient.download();
        const content = await this.streamToString(downloadResponse.readableStreamBody!);
        const data = JSON.parse(content);
        
        // Apply filters
        if (this.matchesFilters(data, params.filters || {})) {
          results.push(data);
        }
      }
    }

    return results;
  }

  async getById(id: string): Promise<any> {
    throw new Error('getById not implemented for BlobAdapter');
  }

  private matchesFilters(data: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => data[key] === value);
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
}
