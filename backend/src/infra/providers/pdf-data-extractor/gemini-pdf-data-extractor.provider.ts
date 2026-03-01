import { BadRequestError } from '@common/types/bad-request-error';
import { ApiError, GoogleGenAI, Type } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { env } from 'src/env';
import { z } from 'zod';
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

const pdfDataSchema = z.object({
	customerNumber: z.string(),
	referenceMonth: z.string(),
	ElectricalEnergyQuantity: z.coerce.number(),
	ElectricalEnergyValue: z.coerce.number(),
	SCEEEEnergyWithoutICMSQuantity: z.coerce.number(),
	SCEEEEnergyWithoutICMSValue: z.coerce.number(),
	GDICompensatedEnergyQuantity: z.coerce.number(),
	GDICompensatedEnergyValue: z.coerce.number(),
	ContribMunicipalPublicLightValue: z.coerce.number(),
});

const responseSchema = {
	type: Type.OBJECT,
	properties: {
		customerNumber: { type: Type.STRING },
		referenceMonth: { type: Type.STRING },
		ElectricalEnergyQuantity: { type: Type.NUMBER },
		ElectricalEnergyValue: { type: Type.NUMBER },
		SCEEEEnergyWithoutICMSQuantity: { type: Type.NUMBER },
		SCEEEEnergyWithoutICMSValue: { type: Type.NUMBER },
		GDICompensatedEnergyQuantity: { type: Type.NUMBER },
		GDICompensatedEnergyValue: { type: Type.NUMBER },
		ContribMunicipalPublicLightValue: { type: Type.NUMBER },
	},
	required: [
		'customerNumber',
		'referenceMonth',
		'ElectricalEnergyQuantity',
		'ElectricalEnergyValue',
		'SCEEEEnergyWithoutICMSQuantity',
		'SCEEEEnergyWithoutICMSValue',
		'GDICompensatedEnergyQuantity',
		'GDICompensatedEnergyValue',
		'ContribMunicipalPublicLightValue',
	],
};

@Injectable()
export class GeminiPDFDataExtractorProvider implements PDFDataExtractorProvider {
	private client = new GoogleGenAI({ apiKey: env.GEMINI_KEY });

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

	private handleApiError(error: unknown): never {
		if (error instanceof ApiError) {
			if (error.status === 500 || error.status === 503) {
				throw new BadRequestError('O serviço de extração está temporariamente indisponível.');
			}

			if (error.status === 429) {
				throw new BadRequestError(
					'Limite de requisições atingido. Tente novamente em alguns instantes.',
				);
			}

			if (error.status === 401 || error.status === 403) {
				throw new BadRequestError('Erro de autenticação com o serviço de extração.');
			}

			throw new BadRequestError(`Erro ao processar a fatura: ${error.message}`);
		}

		throw error;
	}

	private buildPrompt(pdfInText: string) {
		return `
Extraia os dados da seguinte fatura de energia elétrica e retorne no formato JSON especificado.

TEXTO DA FATURA:
${pdfInText}

Campos a extrair:
- customerNumber: número do cliente (string)
- referenceMonth: mês de referência no formato MES/ANO, ex: JAN/2024
- ElectricalEnergyQuantity: quantidade de Energia Elétrica em kWh
- ElectricalEnergyValue: valor em R$ da Energia Elétrica (positivo)
- SCEEEEnergyWithoutICMSQuantity: quantidade de Energia SCEE s/ ICMS em kWh
- SCEEEEnergyWithoutICMSValue: valor em R$ da Energia SCEE s/ ICMS
- GDICompensatedEnergyQuantity: quantidade de Energia Compensada GD I em kWh
- GDICompensatedEnergyValue: valor em R$ da Energia Compensada GD I
- ContribMunicipalPublicLightValue: valor em R$ da Contrib Ilum Pública Municipal

Para campos numéricos não encontrados, use 0 como valor padrão.
`;
	}

	async get({ pdf }: PDFDataProps): Promise<PDFDataResponseProps> {
		const pdfInText = await this.convertPdfToString(pdf);

		this.validateIfInvoice(pdfInText);

		let responseText: string | undefined;

		try {
			const response = await this.client.models.generateContent({
				model: 'gemini-3-flash-preview',
				contents: this.buildPrompt(pdfInText),
				config: {
					responseMimeType: 'application/json',
					responseSchema,
				},
			});

			responseText = response.text;
		} catch (error) {
			this.handleApiError(error);
		}

		if (!responseText) {
			throw new BadRequestError('Não foi possível extrair os dados da fatura.');
		}

		const parsed = pdfDataSchema.safeParse(JSON.parse(responseText));

		if (!parsed.success) {
			throw new BadRequestError('Não foi possível extrair os dados da fatura.');
		}

		const { data } = parsed;

		return {
			customerNumber: data.customerNumber,
			referenceMonth: data.referenceMonth,
			electricalEnergyQuantity: data.ElectricalEnergyQuantity,
			electricalEnergyValue: data.ElectricalEnergyValue,
			sceeeEnergyWithoutICMSQuantity: data.SCEEEEnergyWithoutICMSQuantity,
			sceeeEnergyWithoutICMSValue: data.SCEEEEnergyWithoutICMSValue,
			gdiCompensatedEnergyQuantity: data.GDICompensatedEnergyQuantity,
			gdiCompensatedEnergyValue: data.GDICompensatedEnergyValue,
			contribMunicipalPublicLightValue: data.ContribMunicipalPublicLightValue,
		};
	}
}
