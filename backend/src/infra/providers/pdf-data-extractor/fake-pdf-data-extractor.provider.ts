import { BadRequestError } from '@common/types/bad-request-error';
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import {
	PDFDataExtractorProvider,
	PDFDataProps,
	PDFDataResponseProps,
} from './types/pdf-data-extractor.provider';

const PDF_INVOICE_KEYWORDS = [
	'energia elétrica',
	'energia eletrica',
	'kwh',
	'fatura',
	'consumo',
	'distribuidora',
	'iluminação pública',
	'iluminacao publica',
	'scee',
	'gd i',
];

@Injectable()
export class FakePDFDataExtractorProvider implements PDFDataExtractorProvider {
	private async convertPdfToString(pdf: Express.Multer.File) {
		if (!pdf?.buffer) {
			throw new BadRequestError('Arquivo PDF inválido.');
		}

		try {
			const parser = new PDFParse({ data: pdf.buffer });
			const result = await parser.getText();

			if (!result.text || result.text.trim().length === 0) {
				throw new BadRequestError(
					'O PDF enviado não contém texto legível. Verifique se o arquivo não está digitalizado como imagem.',
				);
			}

			return result.text;
		} catch {
			throw new BadRequestError(
				'Não foi possível ler o PDF. O arquivo pode estar corrompido ou protegido.',
			);
		}
	}

	private validateIfInvoice(text: string) {
		const textLower = text.toLowerCase();
		const matchedKeywords = PDF_INVOICE_KEYWORDS.filter((keyword) => textLower.includes(keyword));

		if (matchedKeywords.length < 2) {
			throw new BadRequestError(
				'O PDF enviado não parece ser uma fatura de energia elétrica válida.',
			);
		}
	}

	private extractNumber(text: string, pattern: RegExp) {
		const match = text.match(pattern);
		if (!match) return 0;

		const raw = match[1].replace(/\./g, '').replace(',', '.');
		const value = parseFloat(raw);
		return Number.isNaN(value) ? 0 : value;
	}

	private extractString(text: string, pattern: RegExp) {
		const match = text.match(pattern);
		return match ? match[1].trim() : '';
	}

	private extractData(text: string) {
		const customerNumber = this.extractString(
			text,
			/(?:n[oº°]?\s*(?:do\s*)?cliente|cliente\s*n[oº°]?)[^\d]*(\d{6,})/i,
		);

		const referenceMonth = this.extractString(
			text,
			/referente\s*a[\s\S]*?([A-Za-záéíóúâêîôûãõàèìòùç]{3}\/\d{4})/i,
		);

		const electricalEnergyQuantity = this.extractNumber(
			text,
			/energia\s*el[eé]trica\s+kWh\s+([\d.,]+)/i,
		);

		const electricalEnergyValue = this.extractNumber(
			text,
			/energia\s*el[eé]trica\s+kWh\s+[\d.,]+\s+[\d.,]+\s+([\d.,]+)/i,
		);

		const sceeeEnergyWithoutICMSQuantity = this.extractNumber(
			text,
			/energia\s*scee\s*s\/\s*icms\s+kWh\s+([\d.,]+)/i,
		);

		const sceeeEnergyWithoutICMSValue = this.extractNumber(
			text,
			/energia\s*scee\s*s\/\s*icms\s+kWh\s+[\d.,]+\s+[\d.,]+\s+([\d.,]+)/i,
		);

		const gdiCompensatedEnergyQuantity = this.extractNumber(
			text,
			/energia\s*compensada\s*gd\s*i\s+kWh\s+([\d.,]+)/i,
		);

		const gdiCompensatedEnergyValue = this.extractNumber(
			text,
			/energia\s*compensada\s*gd\s*i\s+kWh\s+[\d.,]+\s+[\d.,]+\s+(-?[\d.,]+)/i,
		);

		const contribMunicipalPublicLightValue = this.extractNumber(
			text,
			/contrib\s*ilum\s*p[uú]blica\s*municipal\s+([\d.,]+)/i,
		);

		return {
			customerNumber,
			referenceMonth,
			electricalEnergyQuantity,
			electricalEnergyValue,
			sceeeEnergyWithoutICMSQuantity,
			sceeeEnergyWithoutICMSValue,
			gdiCompensatedEnergyQuantity,
			gdiCompensatedEnergyValue,
			contribMunicipalPublicLightValue,
		};
	}

	async get({ pdf }: PDFDataProps): Promise<PDFDataResponseProps> {
		const pdfInText = await this.convertPdfToString(pdf);

		this.validateIfInvoice(pdfInText);

		return this.extractData(pdfInText);
	}
}
