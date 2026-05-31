import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class ParserService {
  /**
   * Parse a document based on its mime type.
   */
  static async parseDocument(filePath: string, mimeType: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);

      if (mimeType === 'application/pdf') {
        const data = await pdfParse(buffer);
        return data.text;
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } else {
        // Fallback for plain text
        return buffer.toString('utf-8');
      }
    } catch (error) {
      console.error(`Error parsing document: ${error}`);
      throw new Error('Failed to parse document');
    }
  }
}
