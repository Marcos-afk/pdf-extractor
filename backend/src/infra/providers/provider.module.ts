import { Module } from '@nestjs/common';
import { env } from 'src/env';
import { PDFDataExtractorOptions } from './pdf-data-extractor/constants/pdf-data-extractor-use.constant';
import { PDFDataExtractorProvider } from './pdf-data-extractor/types/pdf-data-extractor.provider';

@Module({
	providers: [
		{
			provide: PDFDataExtractorProvider,
			useClass: PDFDataExtractorOptions[env.NODE_ENV],
		},
	],
	exports: [PDFDataExtractorProvider],
})
export class ProviderModule {}
