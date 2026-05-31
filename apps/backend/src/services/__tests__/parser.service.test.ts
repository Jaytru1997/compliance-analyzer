import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParserService } from '../parser.service';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

describe('ParserService.parseBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse PDF buffers correctly', async () => {
    const mockBuffer = Buffer.from('mock pdf data');
    const mockText = 'Parsed PDF Text';
    vi.mocked(pdfParse).mockResolvedValue({ text: mockText } as any);

    const result = await ParserService.parseBuffer(mockBuffer, 'application/pdf');

    expect(pdfParse).toHaveBeenCalledWith(mockBuffer);
    expect(result).toBe(mockText);
  });

  it('should parse DOCX buffers correctly', async () => {
    const mockBuffer = Buffer.from('mock docx data');
    const mockText = 'Parsed DOCX Text';
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: mockText, messages: [] });

    const result = await ParserService.parseBuffer(
      mockBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer: mockBuffer });
    expect(result).toBe(mockText);
  });

  it('should return utf-8 string for plain text buffers', async () => {
    const mockText = 'Plain text content';
    const mockBuffer = Buffer.from(mockText, 'utf-8');

    const result = await ParserService.parseBuffer(mockBuffer, 'text/plain');

    expect(result).toBe(mockText);
  });

  it('should throw "Unsupported file type" for unknown mime types', async () => {
    const mockBuffer = Buffer.from('data');
    await expect(ParserService.parseBuffer(mockBuffer, 'image/png')).rejects.toThrow(
      'Unsupported file type'
    );
  });
});
