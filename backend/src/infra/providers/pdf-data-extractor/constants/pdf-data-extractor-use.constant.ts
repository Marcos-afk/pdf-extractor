import { AnthropicPDFDataExtractorProvider } from '../antropic-pdf-data-extractor.provider';
import { FakePDFDataExtractorProvider } from '../fake-pdf-data-extractor.provider';

export const PDFDataExtractorOptions = {
	development: FakePDFDataExtractorProvider,
	production: AnthropicPDFDataExtractorProvider,
};
