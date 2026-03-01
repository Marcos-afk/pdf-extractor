import { BadRequestError } from '@common/types/bad-request-error';
import { ApiError, GoogleGenAI, Type } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { env } from 'src/env';
import { z } from 'zod';
import {
	PDFDataExtractorProvider,
	PDFDataProps,
	PDFDataResponseProps,
} from './types/pdf-data-extractor.provider';

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

const PROMPT = `PASSO 1 — VALIDAÇÃO (obrigatório antes de qualquer extração):
Verifique se este documento é uma fatura de energia elétrica. Uma fatura válida deve conter TODOS estes elementos:
- Número do cliente (campo "Nº DO CLIENTE" ou equivalente)
- Mês de referência da fatura
- Itens de cobrança com unidade kWh (Energia Elétrica, SCEE s/ ICMS, Energia Compensada GD I, etc.)
- Contribuição de Iluminação Pública Municipal

Se o documento for qualquer outra coisa (currículo, contrato, manual, nota fiscal de produto, descrição de vaga, etc.), você DEVE retornar customerNumber como "INVALID" e todos os campos numéricos como 0. NÃO tente inventar ou inferir dados de documentos que não sejam faturas de energia elétrica.

PASSO 2 — EXTRAÇÃO (somente se for uma fatura válida):
Extraia os campos abaixo. Para campos não encontrados, use 0.
- customerNumber: número do cliente (string)
- referenceMonth: mês de referência no formato MES/ANO, ex: JAN/2024
- ElectricalEnergyQuantity: quantidade de Energia Elétrica em kWh
- ElectricalEnergyValue: valor em R$ da Energia Elétrica (positivo)
- SCEEEEnergyWithoutICMSQuantity: quantidade de Energia SCEE s/ ICMS em kWh
- SCEEEEnergyWithoutICMSValue: valor em R$ da Energia SCEE s/ ICMS
- GDICompensatedEnergyQuantity: quantidade de Energia Compensada GD I em kWh
- GDICompensatedEnergyValue: valor em R$ da Energia Compensada GD I
- ContribMunicipalPublicLightValue: valor em R$ da Contrib Ilum Pública Municipal`;

@Injectable()
export class GeminiPDFDataExtractorProvider implements PDFDataExtractorProvider {
	private client = new GoogleGenAI({ apiKey: env.GEMINI_KEY });

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

	async get({ pdf }: PDFDataProps): Promise<PDFDataResponseProps> {
		if (!pdf?.buffer) {
			throw new BadRequestError('Arquivo PDF inválido.');
		}

		let responseText: string | undefined;

		try {
			const response = await this.client.models.generateContent({
				model: 'gemini-3-flash-preview',
				contents: [
					{
						parts: [
							{
								inlineData: {
									mimeType: 'application/pdf',
									data: pdf.buffer.toString('base64'),
								},
							},
							{ text: PROMPT },
						],
					},
				],
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

		if (data.customerNumber === 'INVALID') {
			throw new BadRequestError(
				'O PDF enviado não parece ser uma fatura de energia elétrica válida.',
			);
		}

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