import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class ParserService {
  /**
   * Parse a Buffer based on its mime type.
   * This is the core parsing logic — fully testable without file I/O.
   */
  static async parseBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimeType === 'text/plain' || mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type');
    }
  }

  /**
   * Parse a document from disk.
   * Reads the file then delegates to parseBuffer.
   */
  static async parseDocument(filePath: string, mimeType: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      return await ParserService.parseBuffer(buffer, mimeType);
    } catch (error) {
      console.error(`Error parsing document: ${error}`);
      if (error instanceof Error && error.message === 'Unsupported file type') throw error;
      throw new Error('Failed to parse document');
    }
  }
}
