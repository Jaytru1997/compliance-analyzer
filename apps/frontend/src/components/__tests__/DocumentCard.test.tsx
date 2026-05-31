import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DocumentCard from '../DocumentCard';
import { DocumentMetadata } from '@compliance-analyzer/shared';

// Mock useNavigate at the top level
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockPdfDoc: DocumentMetadata = {
    id: 'pdf-123',
    originalName: 'ACME-Site-Procedure-SSP-001.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    uploadDate: '2024-05-15T10:30:00Z',
    complianceCategory: 'Procedure',
    summary: 'This is a test summary for the PDF document.',
    topics: ['Safety', 'Procedures', 'Operations', 'Documentation', 'Requirements'],
};

const mockDocxDoc: DocumentMetadata = {
    id: 'docx-456',
    originalName: 'Recognised-Standard-RS-OSHEM-001.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 51200,
    uploadDate: '2024-05-10T14:22:00Z',
    complianceCategory: 'Standard',
    summary: 'This document covers recognized standards.',
    topics: ['Standards', 'Compliance', 'HSE'],
};

const minimalDoc: DocumentMetadata = {
    id: 'minimal-789',
    originalName: 'Document.txt',
    mimeType: 'text/plain',
    size: 5120,
    uploadDate: '2024-05-01T08:00:00Z',
};

describe('DocumentCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render document name', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText(mockPdfDoc.originalName)).toBeInTheDocument();
        });

        it('should render compliance category chip', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('Procedure')).toBeInTheDocument();
        });

        it('should render file size', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('100.0 KB')).toBeInTheDocument();
        });

        it('should render formatted upload date', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('15 May 2024')).toBeInTheDocument();
        });

        it('should render summary when available', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText(mockPdfDoc.summary!)).toBeInTheDocument();
        });

        it('should render topics when available', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('Safety')).toBeInTheDocument();
        });

        it('should show +N indicator for topics beyond the first 4', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('+1')).toBeInTheDocument();
        });
    });

    describe('file type icons', () => {
        it('should show icon for PDF documents', () => {
            const { container } = renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            const svgIcons = container.querySelectorAll('svg');
            expect(svgIcons.length).toBeGreaterThan(0);
        });

        it('should show icon for non-PDF documents', () => {
            const { container } = renderWithRouter(<DocumentCard doc={mockDocxDoc} />);
            const svgIcons = container.querySelectorAll('svg');
            expect(svgIcons.length).toBeGreaterThan(0);
        });
    });

    describe('compliance category styling', () => {
        it('should display Standard category', () => {
            renderWithRouter(<DocumentCard doc={mockDocxDoc} />);
            expect(screen.getByText('Standard')).toBeInTheDocument();
        });

        it('should display Procedure category', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('Procedure')).toBeInTheDocument();
        });
    });

    describe('date formatting', () => {
        it('should format dates correctly', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('15 May 2024')).toBeInTheDocument();
        });

        it('should handle different date formats', () => {
            const docWithDifferentDate: DocumentMetadata = {
                ...mockPdfDoc,
                uploadDate: '2024-01-01T00:00:00Z',
            };
            renderWithRouter(<DocumentCard doc={docWithDifferentDate} />);
            expect(screen.getByText('1 Jan 2024')).toBeInTheDocument();
        });
    });

    describe('file size formatting', () => {
        it('should format file size in KB', () => {
            renderWithRouter(<DocumentCard doc={mockPdfDoc} />);
            expect(screen.getByText('100.0 KB')).toBeInTheDocument();
        });

        it('should handle small file sizes', () => {
            const smallDoc: DocumentMetadata = {
                ...mockPdfDoc,
                size: 1024,
            };
            renderWithRouter(<DocumentCard doc={smallDoc} />);
            expect(screen.getByText('1.0 KB')).toBeInTheDocument();
        });

        it('should handle large file sizes', () => {
            const largeDoc: DocumentMetadata = {
                ...mockPdfDoc,
                size: 5242880, // 5MB
            };
            renderWithRouter(<DocumentCard doc={largeDoc} />);
            expect(screen.getByText('5120.0 KB')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle documents with no optional fields', () => {
            const { container } = renderWithRouter(<DocumentCard doc={minimalDoc} />);
            expect(container).toBeInTheDocument();
            expect(screen.getByText('Document.txt')).toBeInTheDocument();
        });

        it('should handle zero byte documents', () => {
            const zeroByteDoc: DocumentMetadata = {
                ...mockPdfDoc,
                size: 0,
            };
            renderWithRouter(<DocumentCard doc={zeroByteDoc} />);
            expect(screen.getByText('0.0 KB')).toBeInTheDocument();
        });

        it('should handle documents with many topics', () => {
            const manyTopicsDoc: DocumentMetadata = {
                ...mockPdfDoc,
                topics: Array.from({ length: 20 }, (_, i) => `Topic${i + 1}`),
            };
            renderWithRouter(<DocumentCard doc={manyTopicsDoc} />);
            expect(screen.getByText('Topic1')).toBeInTheDocument();
            expect(screen.getByText('+16')).toBeInTheDocument();
        });
    });
});
