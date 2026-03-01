import Anthropic from '@anthropic-ai/sdk';
import { BadRequestError } from '@common/types/bad-request-error';
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

const INVOICE_TOOL = {
	name: 'extract_invoice_data',
	description: 'Extrai os dados estruturados de uma fatura de energia elétrica',
	input_schema: {
		type: 'object' as const,
		properties: {
			customerNumber: {
				type: 'string',
				description:
					'Número do cliente extraído da fatura de energia. OBRIGATÓRIO: use exatamente "INVALID" se o documento NÃO for uma fatura de energia elétrica (ex: currículo, contrato, manual, nota fiscal de outro tipo, etc.).',
			},
			referenceMonth: {
				type: 'string',
				description: 'Mês de referência no formato MES/ANO, ex: JAN/2024',
			},
			ElectricalEnergyQuantity: {
				type: 'number',
				description: 'Quantidade de Energia Elétrica em kWh',
			},
			ElectricalEnergyValue: {
				type: 'number',
				description: 'Valor em R$ da Energia Elétrica (positivo)',
			},
			SCEEEEnergyWithoutICMSQuantity: {
				type: 'number',
				description: 'Quantidade de Energia SCEE s/ ICMS em kWh',
			},
			SCEEEEnergyWithoutICMSValue: {
				type: 'number',
				description: 'Valor em R$ da Energia SCEE s/ ICMS',
			},
			GDICompensatedEnergyQuantity: {
				type: 'number',
				description: 'Quantidade de Energia Compensada GD I em kWh',
			},
			GDICompensatedEnergyValue: {
				type: 'number',
				description: 'Valor em R$ da Energia Compensada GD I',
			},
			ContribMunicipalPublicLightValue: {
				type: 'number',
				description: 'Valor em R$ da Contrib Ilum Pública Municipal',
			},
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
	},
} as const;

const PROMPT = `PASSO 1 — VALIDAÇÃO (obrigatório antes de qualquer extração):
Verifique se este documento é uma fatura de energia elétrica. Uma fatura válida deve conter TODOS estes elementos:
- Número do cliente (campo "Nº DO CLIENTE" ou equivalente)
- Mês de referência da fatura
- Itens de cobrança com unidade kWh (Energia Elétrica, SCEE s/ ICMS, Energia Compensada GD I, etc.)
- Contribuição de Iluminação Pública Municipal

Se o documento for qualquer outra coisa (currículo, contrato, manual, nota fiscal de produto, descrição de vaga, etc.), você DEVE retornar customerNumber como "INVALID" e todos os campos numéricos como 0. NÃO tente inventar ou inferir dados de documentos que não sejam faturas de energia elétrica.

PASSO 2 — EXTRAÇÃO (somente se for uma fatura válida):
Extraia os campos solicitados. Para campos numéricos presentes na fatura mas com valor zero, use 0. Para campos não encontrados, use 0.`;


@Injectable()
export class AnthropicPDFDataExtractorProvider implements PDFDataExtractorProvider {
	private client = new Anthropic({
		apiKey: env.ANTHROPIC_KEY,
	});

	async get({ pdf }: PDFDataProps): Promise<PDFDataResponseProps> {
		if (!pdf?.buffer) {
			throw new BadRequestError('Arquivo PDF inválido.');
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let response: any;

		try {
			response = await this.client.beta.messages.create({
				betas: ['pdfs-2024-09-25'],
				model: 'claude-3-5-sonnet-latest',
				max_tokens: 1024,
				tools: [INVOICE_TOOL],
				tool_choice: { type: 'tool', name: 'extract_invoice_data' },
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'document',
								source: {
									type: 'base64',
									media_type: 'application/pdf',
									data: pdf.buffer.toString('base64'),
								},
							},
							{ type: 'text', text: PROMPT },
						],
					},
				],
			});
		} catch (error) {
			if (error instanceof Anthropic.InternalServerError) {
				throw new BadRequestError('O serviço de extração está temporariamente indisponível.');
			}

			if (error instanceof Anthropic.RateLimitError) {
				throw new BadRequestError(
					'Limite de requisições atingido. Tente novamente em alguns instantes.',
				);
			}

			if (error instanceof Anthropic.APIConnectionError) {
				throw new BadRequestError('Não foi possível conectar ao serviço de extração.');
			}

			if (error instanceof Anthropic.AuthenticationError) {
				throw new BadRequestError('Erro de autenticação com o serviço de extração.');
			}

			if (error instanceof Anthropic.APIError) {
				throw new BadRequestError(`Erro ao processar a fatura: ${error.message}`);
			}

			throw error;
		}

		const toolUseBlock = response.content.find(
			(block: { type: string }) => block.type === 'tool_use',
		);

		if (!toolUseBlock) {
			throw new BadRequestError('Não foi possível extrair os dados da fatura.');
		}

		const parsed = pdfDataSchema.safeParse(toolUseBlock.input);

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
