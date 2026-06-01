import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiService } from '../ai.service';
import { DocumentChunk, GapAnalysisFinding } from '@compliance-analyzer/shared';

// Use vi.hoisted to share mocks between mock definition and tests
const { mockMessagesCreate, mockMessagesStream } = vi.hoisted(() => ({
    mockMessagesCreate: vi.fn(),
    mockMessagesStream: vi.fn(),
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
    const mockStream = {
        [Symbol.asyncIterator]: vi.fn(async function* () {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } };
        }),
    };

    class MockAnthropic {
        messages = {
            create: mockMessagesCreate,
            stream: mockMessagesStream,
        };
    }

    return {
        default: MockAnthropic,
    };
});

describe('AiService', () => {
    let aiService: AiService;

    beforeEach(() => {
        vi.clearAllMocks();
        aiService = new AiService();
    });

    describe('summarizeDocument', () => {
        it('should parse and return summary with topics', async () => {
            const mockResponse = {
                content: [
                    {
                        type: 'text',
                        text: '{"summary": "Document about safety procedures", "topics": ["safety", "procedures"]}',
                    },
                ],
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const result = await aiService.summarizeDocument('Safety procedures for mining operations...');

            expect(result).toEqual({
                summary: 'Document about safety procedures',
                topics: ['safety', 'procedures'],
            });
            expect(mockMessagesCreate).toHaveBeenCalledWith({
                model: 'claude-sonnet-4-6',
                max_tokens: 1024,
                temperature: 0.0,
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                    }),
                ]),
            });
        });

        it('should handle markdown-wrapped JSON', async () => {
            const mockResponse = {
                content: [
                    {
                        type: 'text',
                        text: '```json\n{"summary": "Test summary", "topics": ["test"]}\n```',
                    },
                ],
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const result = await aiService.summarizeDocument('Test content');

            expect(result).toEqual({
                summary: 'Test summary',
                topics: ['test'],
            });
        });

        it('should return error object when JSON parsing fails', async () => {
            const mockResponse = {
                content: [
                    {
                        type: 'text',
                        text: 'Invalid JSON response',
                    },
                ],
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const result = await aiService.summarizeDocument('Test content');

            expect(result).toEqual({
                summary: 'Failed to generate summary.',
                topics: [],
            });
        });

        it('should truncate large documents to 50000 chars', async () => {
            const largeText = 'A'.repeat(100000);
            const mockResponse = {
                content: [
                    {
                        type: 'text',
                        text: '{"summary": "Summary", "topics": []}',
                    },
                ],
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            await aiService.summarizeDocument(largeText);

            const callArgs = mockMessagesCreate.mock.calls[0][0];
            const prompt = callArgs.messages[0].content;
            expect(prompt).toContain(largeText.substring(0, 50000));
            expect(prompt.length).toBeLessThan(100000);
        });
    });

    describe('answerQuery', () => {
        it('should answer query with context citations', async () => {
            const mockChunks: DocumentChunk[] = [
                {
                    id: 'c1',
                    text: 'All workers must wear hard hats on site.',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Safety Manual',
                        section: '2.1',
                        subsection: 'PPE Requirements',
                        pageNumber: 5,
                        topics: ['PPE'],
                        complianceCategory: 'Standard',
                    },
                },
            ];

            const mockResponse = {
                content: [
                    {
                        type: 'text',
                        text: 'According to the Safety Manual section 2.1 (Page 5), all workers must wear hard hats on site.',
                    },
                ],
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const result = await aiService.answerQuery('What PPE is required?', mockChunks);

            expect(result).toContain('hard hats');
            expect(mockMessagesCreate).toHaveBeenCalled();

            // Verify context formatting includes citations
            const callArgs = mockMessagesCreate.mock.calls[0][0];
            const prompt = callArgs.messages[0].content;
            expect(prompt).toContain('[Citation: 2.1 (Page 5)]');
            expect(prompt).toContain('All workers must wear hard hats on site.');
        });

        it('should handle empty context gracefully', async () => {
            const mockResponse = {
                content: [
                    {
                        type: 'text',
                        text: 'The provided documents do not contain information to answer this question.',
                    },
                ],
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const result = await aiService.answerQuery('Query?', []);

            expect(result).toBeDefined();
        });

        it('should format multiple chunks with proper citations', async () => {
            const mockChunks: DocumentChunk[] = [
                {
                    id: 'c1',
                    text: 'First requirement',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '1.0',
                        subsection: '',
                        pageNumber: 1,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
                {
                    id: 'c2',
                    text: 'Second requirement',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '2.0',
                        subsection: '',
                        pageNumber: 2,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
            ];

            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: 'Combined answer' }],
            });

            await aiService.answerQuery('Test?', mockChunks);

            const callArgs = mockMessagesCreate.mock.calls[0][0];
            const prompt = callArgs.messages[0].content;
            expect(prompt).toContain('[Citation: 1.0 (Page 1)]');
            expect(prompt).toContain('[Citation: 2.0 (Page 2)]');
        });
    });

    describe('rerankChunks', () => {
        it('should return empty array for no chunks', async () => {
            const result = await aiService.rerankChunks('query', []);
            expect(result).toEqual([]);
        });

        it('should return chunks as-is if 2 or fewer', async () => {
            const mockChunks: DocumentChunk[] = [
                {
                    id: 'c1',
                    text: 'Content 1',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '1.0',
                        subsection: '',
                        pageNumber: 1,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
                {
                    id: 'c2',
                    text: 'Content 2',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '2.0',
                        subsection: '',
                        pageNumber: 2,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
            ];

            const result = await aiService.rerankChunks('query', mockChunks);
            expect(result).toEqual(mockChunks);
            expect(mockMessagesCreate).not.toHaveBeenCalled();
        });

        it('should rerank chunks by relevance score', async () => {
            const mockChunks: DocumentChunk[] = [
                {
                    id: 'c1',
                    text: 'First content',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '1.0',
                        subsection: '',
                        pageNumber: 1,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
                {
                    id: 'c2',
                    text: 'Second content',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '2.0',
                        subsection: '',
                        pageNumber: 2,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
                {
                    id: 'c3',
                    text: 'Third content',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '3.0',
                        subsection: '',
                        pageNumber: 3,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
            ];

            // Return scores in order: [3, 8, 5] -> should reorder to c2(8), c3(5), c1(3)
            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: '[3, 8, 5]' }],
            });

            const result = await aiService.rerankChunks('test query', mockChunks);

            expect(result[0].id).toBe('c2'); // Score 8 - highest
            expect(result[1].id).toBe('c3'); // Score 5 - middle
            expect(result[2].id).toBe('c1'); // Score 3 - lowest
        });

        it('should handle markdown-wrapped score array', async () => {
            const mockChunks = Array.from({ length: 3 }, (_, i) => ({
                id: `c${i + 1}`,
                text: `Content ${i + 1}`,
                metadata: {
                    documentId: 'doc1',
                    title: 'Doc',
                    section: `${i + 1}.0`,
                    subsection: '',
                    pageNumber: i + 1,
                    topics: [],
                    complianceCategory: 'Standard' as const,
                },
            }));

            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: '```json\n[9, 5, 7]\n```' }],
            });

            const result = await aiService.rerankChunks('test', mockChunks);

            expect(result[0].id).toBe('c1'); // Score 9
            expect(result[1].id).toBe('c3'); // Score 7
            expect(result[2].id).toBe('c2'); // Score 5
        });

        it('should gracefully degrade to original order on parse error', async () => {
            const mockChunks: DocumentChunk[] = Array.from({ length: 3 }, (_, i) => ({
                id: `c${i + 1}`,
                text: `Content ${i + 1}`,
                metadata: {
                    documentId: 'doc1',
                    title: 'Doc',
                    section: `${i + 1}.0`,
                    subsection: '',
                    pageNumber: i + 1,
                    topics: [],
                    complianceCategory: 'Standard',
                },
            }));

            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: 'Invalid JSON' }],
            });

            const result = await aiService.rerankChunks('test', mockChunks);

            expect(result).toEqual(mockChunks);
        });
    });

    describe('expandQuery', () => {
        it('should expand query with synonyms and acronym expansions', async () => {
            mockMessagesCreate.mockResolvedValue({
                content: [
                    {
                        type: 'text',
                        text: 'Personal Protective Equipment hazard risk inspection audit',
                    },
                ],
            });

            const result = await aiService.expandQuery('PPE requirements');

            expect(result).toContain('PPE requirements');
            expect(result).toContain('Personal Protective Equipment');
            expect(result).toContain('hazard');
        });

        it('should gracefully degrade to original query on error', async () => {
            mockMessagesCreate.mockRejectedValue(new Error('API Error'));

            const result = await aiService.expandQuery('test query');

            expect(result).toBe('test query');
        });

        it('should trim and combine original and expanded terms', async () => {
            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: '  expanded terms  ' }],
            });

            const result = await aiService.expandQuery('original');

            expect(result).toBe('original expanded terms');
            expect(result).not.toContain('  ');
        });
    });

    describe('performGapAnalysis', () => {
        it('should return array of gap analysis findings', async () => {
            const mockFindings: GapAnalysisFinding[] = [
                {
                    type: 'Partial Gap',
                    requirement: 'Safety training requirement',
                    standardCitation: '5.2',
                    procedureCitation: '3.1',
                    severity: 'High',
                    recommendation: 'Expand training content',
                },
            ];

            mockMessagesCreate.mockResolvedValue({
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(mockFindings),
                    },
                ],
            });

            const result = await aiService.performGapAnalysis('Standard text', 'Procedure text');

            expect(result).toEqual(mockFindings);
            expect(result[0].type).toBe('Partial Gap');
        });

        it('should handle markdown-wrapped JSON array', async () => {
            const mockFindings = [
                {
                    type: 'Full Gap',
                    requirement: 'Missing requirement',
                    standardCitation: '2.0',
                    procedureCitation: 'Not found',
                    severity: 'High',
                    recommendation: 'Add requirement',
                },
            ];

            mockMessagesCreate.mockResolvedValue({
                content: [
                    {
                        type: 'text',
                        text: `\`\`\`json\n${JSON.stringify(mockFindings)}\n\`\`\``,
                    },
                ],
            });

            const result = await aiService.performGapAnalysis('Standard', 'Procedure');

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('Full Gap');
        });

        it('should handle truncated JSON by repairing incomplete objects', async () => {
            const truncatedJson =
                '[{"type": "Partial Gap", "requirement": "Test", "standardCitation": "1.0", "procedureCitation": "1.1", "severity": "Medium", "recommendation": "Update"}, {"type": "Full Gap", "requirement": "Another';

            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: truncatedJson }],
            });

            const result = await aiService.performGapAnalysis('Standard', 'Procedure');

            // Should recover the complete first object
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('Partial Gap');
        });

        it('should return empty array when no JSON found', async () => {
            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: 'No JSON here' }],
            });

            const result = await aiService.performGapAnalysis('Standard', 'Procedure');

            expect(result).toEqual([]);
        });

        it('should handle all gap finding types', async () => {
            const mockFindings: GapAnalysisFinding[] = [
                {
                    type: 'Full Compliance',
                    requirement: 'Fully compliant',
                    standardCitation: '1.0',
                    procedureCitation: '1.0',
                    severity: 'Low',
                    recommendation: 'Maintain current practice',
                },
                {
                    type: 'Partial Gap',
                    requirement: 'Partially met',
                    standardCitation: '2.0',
                    procedureCitation: '2.1',
                    severity: 'Medium',
                    recommendation: 'Enhance details',
                },
                {
                    type: 'Full Gap',
                    requirement: 'Completely missing',
                    standardCitation: '3.0',
                    procedureCitation: 'Not found',
                    severity: 'High',
                    recommendation: 'Implement requirement',
                },
            ];

            mockMessagesCreate.mockResolvedValue({
                content: [{ type: 'text', text: JSON.stringify(mockFindings) }],
            });

            const result = await aiService.performGapAnalysis('Standard', 'Procedure');

            expect(result).toHaveLength(3);
            expect(result.map((f: GapAnalysisFinding) => f.type)).toEqual(['Full Compliance', 'Partial Gap', 'Full Gap']);
        });
    });

    describe('streamAnswer', () => {
        it('should stream answer tokens via SSE', async () => {
            const mockChunks: DocumentChunk[] = [
                {
                    id: 'c1',
                    text: 'Chunk content',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '1.0',
                        subsection: '',
                        pageNumber: 1,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
            ];

            const mockRes = {
                headersSent: false,
                setHeader: vi.fn(),
                flushHeaders: vi.fn(),
                write: vi.fn(),
                end: vi.fn(),
            };

            mockMessagesStream.mockReturnValue({
                [Symbol.asyncIterator]: vi.fn(async function* () {
                    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } };
                    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } };
                }),
            });

            await aiService.streamAnswer('Query?', mockChunks, mockRes as any);

            // Verify SSE headers
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
            expect(mockRes.flushHeaders).toHaveBeenCalled();

            // Verify stream data written
            expect(mockRes.write).toHaveBeenCalledWith('data: Hello \n\n');
            expect(mockRes.write).toHaveBeenCalledWith('data: world\n\n');
            expect(mockRes.write).toHaveBeenCalledWith('data: [DONE]\n\n');
            expect(mockRes.end).toHaveBeenCalled();
        });

        it('should escape newlines in tokens for SSE compliance', async () => {
            const mockChunks: DocumentChunk[] = [
                {
                    id: 'c1',
                    text: 'Content',
                    metadata: {
                        documentId: 'doc1',
                        title: 'Doc',
                        section: '1.0',
                        subsection: '',
                        pageNumber: 1,
                        topics: [],
                        complianceCategory: 'Standard',
                    },
                },
            ];

            const mockRes = {
                headersSent: false,
                setHeader: vi.fn(),
                flushHeaders: vi.fn(),
                write: vi.fn(),
                end: vi.fn(),
            };

            mockMessagesStream.mockReturnValue({
                [Symbol.asyncIterator]: vi.fn(async function* () {
                    yield {
                        type: 'content_block_delta',
                        delta: { type: 'text_delta', text: 'Line 1\nLine 2' },
                    };
                }),
            });

            await aiService.streamAnswer('Query?', mockChunks, mockRes as any);

            // Newlines should be escaped
            expect(mockRes.write).toHaveBeenCalledWith('data: Line 1\\nLine 2\n\n');
        });

        it('should handle streaming errors gracefully', async () => {
            const mockChunks: DocumentChunk[] = [];
            const mockRes = {
                headersSent: false,
                setHeader: vi.fn(),
                flushHeaders: vi.fn(),
                write: vi.fn(),
                end: vi.fn(),
            };

            mockMessagesStream.mockReturnValue({
                [Symbol.asyncIterator]: vi.fn(async function* () {
                    throw new Error('Stream error');
                }),
            });

            await aiService.streamAnswer('Query?', mockChunks, mockRes as any);

            expect(mockRes.write).toHaveBeenCalledWith('data: [ERROR]\n\n');
            expect(mockRes.end).toHaveBeenCalled();
        });
    });
});
