import * as fs from 'fs';
import * as path from 'path';

export interface ImageAnalysisResult {
  format: string;
  size: number;
  base64?: string;
  error?: string;
}

/**
 * Simple image adapter for reading and encoding local images as base64.
 *
 * @server-only This adapter uses Node.js `fs` and `path` APIs and cannot run
 * in a browser environment. Do not import from `@nice-tools/fake-llm/browser`.
 */
export class ImageAdapter {
  async readImage(imagePath: string): Promise<ImageAnalysisResult> {
    try {
      if (!fs.existsSync(imagePath)) {
        return {
          format: 'unknown',
          size: 0,
          error: 'File not found'
        };
      }

      const buffer = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      
      return {
        format: ext.substring(1),
        size: buffer.length,
        base64: buffer.toString('base64')
      };
    } catch (error: any) {
      return {
        format: 'unknown',
        size: 0,
        error: error.message
      };
    }
  }

  async analyzeImage(imagePath: string): Promise<string> {
    const result = await this.readImage(imagePath);
    
    if (result.error) {
      return `Cannot analyze image: ${result.error}`;
    }

    return `Image format: ${result.format}, Size: ${Math.round(result.size / 1024)}KB`;
  }
}
