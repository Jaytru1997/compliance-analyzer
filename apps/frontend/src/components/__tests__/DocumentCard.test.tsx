import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DocumentMetadata } from '@compliance-analyzer/shared';

import DocumentCard from '../DocumentCard';

// Wrapper component for tests - includes BrowserRouter for Router context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

const mockDoc: DocumentMetadata = {
    id: 'test-123',
    originalName: 'Test-Document.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    uploadDate: '2024-05-15T10:30:00Z',
    complianceCategory: 'Procedure',
    summary: 'This is a test summary.',
    topics: ['Safety', 'Procedures'],
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
}

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
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText(mockPdfDoc.originalName)).toBeInTheDocument();
        });

        it('should render compliance category chip', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('Procedure')).toBeInTheDocument();
        });

        it('should render file size', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('100.0 KB')).toBeInTheDocument();
        });

        it('should render formatted upload date', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('May 15, 2024')).toBeInTheDocument();
        });

        it('should render summary when available', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText(mockPdfDoc.summary!)).toBeInTheDocument();
        });

        it('should render topics when available', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('Safety')).toBeInTheDocument();
        });

        it('should show +N indicator for topics beyond the first 4', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('+1')).toBeInTheDocument();
        });
    });

    describe('file type icons', () => {
        it('should show icon for PDF documents', () => {
            const { container } = render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            const svgIcons = container.querySelectorAll('svg');
            expect(svgIcons.length).toBeGreaterThan(0);
        });

        it('should show icon for non-PDF documents', () => {
            const { container } = render(<DocumentCard doc={mockDocxDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            const svgIcons = container.querySelectorAll('svg');
            expect(svgIcons.length).toBeGreaterThan(0);
        });
    });

    describe('compliance category styling', () => {
        it('should display Standard category', () => {
            render(<DocumentCard doc={mockDocxDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('Standard')).toBeInTheDocument();
        });

        it('should display Procedure category', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('Procedure')).toBeInTheDocument();
        });
    });

    describe('date formatting', () => {
        it('should format dates correctly', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('May 15, 2024')).toBeInTheDocument();
        });

        it('should handle different date formats', () => {
            const docWithDifferentDate: DocumentMetadata = {
                ...mockPdfDoc,
                uploadDate: '2024-01-01T00:00:00Z',
            };
            render(<DocumentCard doc={docWithDifferentDate} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
        });
    });

    describe('file size formatting', () => {
        it('should format file size in KB', () => {
            render(<DocumentCard doc={mockPdfDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('100.0 KB')).toBeInTheDocument();
        });

        it('should handle small file sizes', () => {
            const smallDoc: DocumentMetadata = {
                ...mockPdfDoc,
                size: 1024,
            };
            render(<DocumentCard doc={smallDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('1.0 KB')).toBeInTheDocument();
        });

        it('should handle large file sizes', () => {
            const largeDoc: DocumentMetadata = {
                ...mockPdfDoc,
                size: 5242880, // 5MB
            };
            render(<DocumentCard doc={largeDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('5120.0 KB')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle documents with no optional fields', () => {
            const { container } = render(<DocumentCard doc={minimalDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(container).toBeInTheDocument();
            expect(screen.getByText('Document.txt')).toBeInTheDocument();
        });

        it('should handle zero byte documents', () => {
            const zeroByteDoc: DocumentMetadata = {
                ...mockPdfDoc,
                size: 0,
            };
            render(<DocumentCard doc={zeroByteDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('0.0 KB')).toBeInTheDocument();
        });

        it('should handle documents with many topics', () => {
            const manyTopicsDoc: DocumentMetadata = {
                ...mockPdfDoc,
                topics: Array.from({ length: 20 }, (_, i) => `Topic${i + 1}`),
            };
            render(<DocumentCard doc={manyTopicsDoc} onDelete={vi.fn()} />, { wrapper: TestWrapper });
            expect(screen.getByText('Topic1')).toBeInTheDocument();
            expect(screen.getByText('+16')).toBeInTheDocument();
        });
    });
});
