import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PDF1_TEXT =
	'Valores Faturados\nItens da Fatura Unid. Quant. Preço Unit Valor (R$) PIS/COFINS Base Calc. Aliq. ICMS Tarifa Unit.\nICMS ICMS\nEnergia Elétrica kWh 100 0,95543124 95,52 0,74906000\nEnergia SCEE s/ ICMS kWh 2.300 0,50970610 1.172,31 0,48733000\nEnergia compensada GD I kWh 2.300 0,48733000 -1.120,85 0,48733000\nContrib Ilum Publica Municipal 40,45\nNº DO CLIENTE Nº DA INSTALAÇÃO\n7202210726 3001422762\nReferente a Vencimento Valor a pagar (R$)\nJAN/2024 09/02/2024 66,62\n';

const PDF2_TEXT =
	'Valores Faturados\nItens da Fatura Unid. Quant. Preço Unit Valor (R$) PIS/COFINS Base Calc. Aliq. ICMS Tarifa Unit.\nICMS ICMS\nEnergia Elétrica kWh 100 0,96136372 96,12 0,74906000\nEnergia SCEE s/ ICMS kWh 1.940 0,51287097 994,96 0,48733000\nEnergia compensada GD I kWh 1.940 0,48733000 -945,42 0,48733000\nContrib Ilum Publica Municipal 40,45\nNº DO CLIENTE Nº DA INSTALAÇÃO\n7202210726 3001422762\nReferente a Vencimento Valor a pagar (R$)\nFEV/2024 09/03/2024 186,11\n';

const MARCOS_TEXT =
	'Marcos André Lima de Melo\nDesenvolvedor Sênior Fullstack\nSobre\nDesenvolvedor Full Stack Sênior com 4+ anos de experiência\nem desenvolvimento de sistemas escaláveis utilizando\nNode.js, NestJS, Next.js, React Native, TypeScript e Go.';

const INVOICE_PDF_SIZE = 33405;
const MARCOS_PDF_SIZE = 139817;
const PDF1_BYTE_SIGNATURE = 0x35;

jest.mock('pdf-parse', () => ({
	PDFParse: class {
		private data: Buffer;
		constructor({ data }: { data: Buffer }) {
			this.data = data;
		}
		async getText() {
			if (this.data.length === MARCOS_PDF_SIZE) return { text: MARCOS_TEXT };
			if (this.data.length === INVOICE_PDF_SIZE) {
				return { text: this.data[14638] === PDF1_BYTE_SIGNATURE ? PDF1_TEXT : PDF2_TEXT };
			}
			return { text: '' };
		}
	},
}));

import { InMemoryInvoicesRepository } from '@application/invoices/in-memory/in-memory-invoices.repository';
import { CreateInvoiceUseCase } from '@application/invoices/use-cases/create-invoice/create-invoice.use-case';
import { FakePDFDataExtractorProvider } from '@infra/providers/pdf-data-extractor/fake-pdf-data-extractor.provider';
import { GetInvoicesDTO } from '@/src/application/invoices/dtos/get-invoices.dto';

const makePDFFile = (filename: string) => {
	const buffer = readFileSync(join(__dirname, 'pdf', filename));
	return {
		fieldname: 'file',
		originalname: filename,
		buffer,
		size: buffer.length,
	} as Express.Multer.File;
};

const makeMockProvider = (overrides = {}) => ({
	get: jest.fn().mockResolvedValue({
		customerNumber: '7202210726',
		referenceMonth: 'JAN/2024',
		electricalEnergyQuantity: 100,
		electricalEnergyValue: 50.75,
		sceeeEnergyWithoutICMSQuantity: 200,
		sceeeEnergyWithoutICMSValue: 80.25,
		gdiCompensatedEnergyQuantity: 300,
		gdiCompensatedEnergyValue: -120.5,
		contribMunicipalPublicLightValue: 15,
		...overrides,
	}),
});

describe('CreateInvoiceUseCase', () => {
	let repository: InMemoryInvoicesRepository;

	beforeEach(() => {
		repository = new InMemoryInvoicesRepository();
	});

	describe('derived fields calculation logic', () => {
		let useCase: CreateInvoiceUseCase;
		const file = {} as Express.Multer.File;

		beforeEach(() => {
			useCase = new CreateInvoiceUseCase(repository, makeMockProvider());
		});

		it('should calculate electricalEnergyConsumptionValue as the sum of quantities', async () => {
			const result = await useCase.execute({ file });

			expect(result.electricalEnergyConsumptionValue).toBe(300);
		});

		it('should calculate totalValueWithoutGD as the sum of values without GD', async () => {
			const result = await useCase.execute({ file });

			expect(result.totalValueWithoutGD).toBeCloseTo(146, 2);
		});

		it('should calculate gdEconomy as the absolute value of negative gdiCompensatedEnergyValue', async () => {
			const result = await useCase.execute({ file });

			expect(result.gdEconomy).toBeCloseTo(120.5, 2);
		});

		it('should calculate gdEconomy as the absolute value when gdiCompensatedEnergyValue is positive', async () => {
			const useCase2 = new CreateInvoiceUseCase(
				repository,
				makeMockProvider({ gdiCompensatedEnergyValue: 50 }),
			);
			const result = await useCase2.execute({ file });

			expect(result.gdEconomy).toBe(50);
		});

		it('gdEconomy should always be non-negative', async () => {
			const result = await useCase.execute({ file });

			expect(result.gdEconomy).toBeGreaterThanOrEqual(0);
		});

		it('should persist the invoice in the repository', async () => {
			await useCase.execute({ file });

			const invoices = await repository.get({} as GetInvoicesDTO);
			expect(invoices).toHaveLength(1);
			expect(invoices[0].customerNumber).toBe('7202210726');
			expect(invoices[0].referenceMonth).toBe('JAN/2024');
		});

		it('should return the invoice with all provider data', async () => {
			const result = await useCase.execute({ file });

			expect(result.customerNumber).toBe('7202210726');
			expect(result.referenceMonth).toBe('JAN/2024');
			expect(result.electricalEnergyQuantity).toBe(100);
			expect(result.electricalEnergyValue).toBe(50.75);
			expect(result.sceeeEnergyWithoutICMSQuantity).toBe(200);
			expect(result.sceeeEnergyWithoutICMSValue).toBe(80.25);
			expect(result.gdiCompensatedEnergyQuantity).toBe(300);
			expect(result.gdiCompensatedEnergyValue).toBe(-120.5);
			expect(result.contribMunicipalPublicLightValue).toBe(15);
		});
	});

	describe('integration with FakePDFDataExtractorProvider and real PDFs', () => {
		let provider: FakePDFDataExtractorProvider;
		let useCase: CreateInvoiceUseCase;

		beforeEach(() => {
			provider = new FakePDFDataExtractorProvider();
			useCase = new CreateInvoiceUseCase(repository, provider);
		});

		it('should extract correct data from 3001422762-01-2024.pdf (JAN/2024)', async () => {
			const file = makePDFFile('3001422762-01-2024.pdf');
			const result = await useCase.execute({ file });

			expect(result.customerNumber).toBe('7202210726');
			expect(result.referenceMonth).toBe('JAN/2024');
			expect(result.electricalEnergyQuantity).toBe(100);
			expect(result.electricalEnergyValue).toBeCloseTo(95.52, 2);
			expect(result.sceeeEnergyWithoutICMSQuantity).toBe(2300);
			expect(result.sceeeEnergyWithoutICMSValue).toBeCloseTo(1172.31, 2);
			expect(result.gdiCompensatedEnergyQuantity).toBe(2300);
			expect(result.gdiCompensatedEnergyValue).toBeCloseTo(-1120.85, 2);
			expect(result.contribMunicipalPublicLightValue).toBeCloseTo(40.45, 2);
		});

		it('should calculate correct derived fields from 3001422762-01-2024.pdf', async () => {
			const file = makePDFFile('3001422762-01-2024.pdf');
			const result = await useCase.execute({ file });

			expect(result.electricalEnergyConsumptionValue).toBe(2400);
			expect(result.totalValueWithoutGD).toBeCloseTo(1308.28, 2);
			expect(result.gdEconomy).toBeCloseTo(1120.85, 2);
		});

		it('should extract correct data from 3001422762-02-2024.pdf (FEV/2024)', async () => {
			const file = makePDFFile('3001422762-02-2024.pdf');
			const result = await useCase.execute({ file });

			expect(result.customerNumber).toBe('7202210726');
			expect(result.referenceMonth).toBe('FEV/2024');
			expect(result.electricalEnergyQuantity).toBe(100);
			expect(result.electricalEnergyValue).toBeCloseTo(96.12, 2);
			expect(result.sceeeEnergyWithoutICMSQuantity).toBe(1940);
			expect(result.sceeeEnergyWithoutICMSValue).toBeCloseTo(994.96, 2);
			expect(result.gdiCompensatedEnergyQuantity).toBe(1940);
			expect(result.gdiCompensatedEnergyValue).toBeCloseTo(-945.42, 2);
			expect(result.contribMunicipalPublicLightValue).toBeCloseTo(40.45, 2);
		});

		it('should calculate correct derived fields from 3001422762-02-2024.pdf', async () => {
			const file = makePDFFile('3001422762-02-2024.pdf');
			const result = await useCase.execute({ file });

			expect(result.electricalEnergyConsumptionValue).toBe(2040);
			expect(result.totalValueWithoutGD).toBeCloseTo(1131.53, 2);
			expect(result.gdEconomy).toBeCloseTo(945.42, 2);
		});

		it('should throw an error when the PDF has no buffer', async () => {
			const file = { fieldname: 'file', originalname: 'empty.pdf' } as Express.Multer.File;

			await expect(useCase.execute({ file })).rejects.toThrow('Arquivo PDF inválido.');
		});

		it('should throw an error when the PDF is not a valid energy invoice (Marcos André Lima de Melo.pdf)', async () => {
			const file = makePDFFile('Marcos André Lima de Melo.pdf');

			await expect(useCase.execute({ file })).rejects.toThrow(
				'O PDF enviado não parece ser uma fatura de energia elétrica válida.',
			);
		});
	});
});
