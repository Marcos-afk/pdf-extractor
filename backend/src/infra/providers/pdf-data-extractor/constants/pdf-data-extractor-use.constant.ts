import { FakePDFDataExtractorProvider } from '../fake-pdf-data-extractor.provider';
import { GeminiPDFDataExtractorProvider } from '../gemini-pdf-data-extractor.provider';

export const PDFDataExtractorOptions = {
	development: FakePDFDataExtractorProvider,
	production: GeminiPDFDataExtractorProvider,
};
