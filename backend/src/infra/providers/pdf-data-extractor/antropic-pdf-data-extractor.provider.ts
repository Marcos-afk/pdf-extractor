import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { BadRequestError } from '@common/types/bad-request-error';
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

@Injectable()
export class AnthropicPDFDataExtractorProvider implements PDFDataExtractorProvider {
	private client = new Anthropic({
		apiKey: env.ANTHROPIC_KEY,
	});

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

	async get({ pdf }: PDFDataProps): Promise<PDFDataResponseProps> {
		const pdfInText = await this.convertPdfToString(pdf);

		this.validateIfInvoice(pdfInText);

		let response: Awaited<ReturnType<typeof this.client.messages.parse>>;

		try {
			response = await this.client.messages.parse({
				model: 'claude-3-5-sonnet-latest',
				max_tokens: 1024,
				messages: [
					{
						role: 'user',
						content: `
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
`,
					},
				],
				output_config: {
					format: zodOutputFormat(pdfDataSchema),
				},
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

		if (!response.parsed_output) {
			throw new BadRequestError('Não foi possível extrair os dados da fatura.');
		}

		return response.parsed_output;
	}
}
