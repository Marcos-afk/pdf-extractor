import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CreateInvoiceUseCase } from '@application/invoices/use-cases/create-invoice/create-invoice.use-case';
import { BadRequestError } from '@common/types/bad-request-error';
import { GetInvoicesUseCase } from '@application/invoices/use-cases/get-invoices/get-invoices.use-case';
import { GetOverviewInvoicesUseCase } from '@application/invoices/use-cases/get-overview-invoices/get-overview-invoices.use-case';
import { BadRequestInterceptor } from '@common/interceptors/bad-request.interceptor';
import { ForbiddenInterceptor } from '@common/interceptors/forbidden.interceptor';
import { NotFoundInterceptor } from '@common/interceptors/not-found.interceptor';
import { PreconditionFailedInterceptor } from '@common/interceptors/precondition-failed.interceptor';
import { UnauthorizedRequestInterceptor } from '@common/interceptors/unauthorized-request.interceptor';
import { HealthController } from '@infra/http/controllers/health/health.controller';
import { InvoicesController } from '@infra/http/controllers/invoices/invoices.controller';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';

const makeInvoiceResponse = (partial = {}) => ({
	id: randomUUID(),
	customerNumber: '7202210726',
	referenceMonth: 'JAN/2024',
	electricalEnergyQuantity: 100,
	electricalEnergyValue: 95.52,
	sceeeEnergyWithoutICMSQuantity: 2300,
	sceeeEnergyWithoutICMSValue: 1172.31,
	gdiCompensatedEnergyQuantity: 2300,
	gdiCompensatedEnergyValue: -1120.85,
	contribMunicipalPublicLightValue: 40.45,
	electricalEnergyConsumptionValue: 2400,
	totalValueWithoutGD: 1308.28,
	gdEconomy: 1120.85,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...partial,
});

const makeOverviewResponse = () => ({
	energy: { consumption: 2400, compensated: 2300 },
	financial: { totalWithoutGD: 1308.28, gdEconomy: 1120.85 },
});

async function buildApp(
	overrides: {
		createInvoice?: Partial<{ execute: jest.Mock }>;
		getInvoices?: Partial<{ execute: jest.Mock }>;
		getOverviewInvoices?: Partial<{ execute: jest.Mock }>;
	} = {},
) {
	const createInvoiceMock = {
		execute: jest.fn().mockResolvedValue(makeInvoiceResponse()),
		...overrides.createInvoice,
	};

	const getInvoicesMock = {
		execute: jest.fn().mockResolvedValue({ invoices: [makeInvoiceResponse()], nextCursor: null }),
		...overrides.getInvoices,
	};

	const getOverviewMock = {
		execute: jest.fn().mockResolvedValue(makeOverviewResponse()),
		...overrides.getOverviewInvoices,
	};

	const moduleRef = await Test.createTestingModule({
		controllers: [InvoicesController, HealthController],
		providers: [
			{ provide: CreateInvoiceUseCase, useValue: createInvoiceMock },
			{ provide: GetInvoicesUseCase, useValue: getInvoicesMock },
			{ provide: GetOverviewInvoicesUseCase, useValue: getOverviewMock },
		],
	}).compile();

	const app = moduleRef.createNestApplication();

	app.useGlobalPipes(
		new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
	);

	app.useGlobalInterceptors(
		new BadRequestInterceptor(),
		new NotFoundInterceptor(),
		new UnauthorizedRequestInterceptor(),
		new ForbiddenInterceptor(),
		new PreconditionFailedInterceptor(),
	);

	await app.init();

	return {
		app,
		createInvoiceMock,
		getInvoicesMock,
		getOverviewMock,
	};
}

describe('InvoicesController (HTTP)', () => {
	let app: INestApplication;

	afterEach(async () => {
		await app?.close();
	});

	describe('GET /health', () => {
		it('should return 200 with status ok', async () => {
			({ app } = await buildApp());

			const res = await supertest(app.getHttpServer()).get('/health');

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ message: 'API Online' });
		});
	});

	describe('GET /invoices', () => {
		it('should return 200 with invoices list and nextCursor', async () => {
			const invoiceData = makeInvoiceResponse();
			({ app } = await buildApp({
				getInvoices: {
					execute: jest.fn().mockResolvedValue({ invoices: [invoiceData], nextCursor: null }),
				},
			}));

			const res = await supertest(app.getHttpServer()).get('/invoices');

			expect(res.status).toBe(200);
			expect(res.body.message).toBe('Lista de faturas!');
			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].customerNumber).toBe(invoiceData.customerNumber);
			expect(res.body).toHaveProperty('nextCursor');
			expect(res.body.nextCursor).toBeNull();
		});

		it('should return nextCursor when there are more pages', async () => {
			const cursor = randomUUID();
			({ app } = await buildApp({
				getInvoices: {
					execute: jest
						.fn()
						.mockResolvedValue({ invoices: [makeInvoiceResponse()], nextCursor: cursor }),
				},
			}));

			const res = await supertest(app.getHttpServer()).get('/invoices');

			expect(res.status).toBe(200);
			expect(res.body.nextCursor).toBe(cursor);
		});

		it('should pass customerNumber filter to the use case', async () => {
			let capturedArgs: unknown;
			({ app } = await buildApp({
				getInvoices: {
					execute: jest.fn().mockImplementation((args) => {
						capturedArgs = args;
						return Promise.resolve({ invoices: [], nextCursor: null });
					}),
				},
			}));

			await supertest(app.getHttpServer()).get('/invoices?customerNumber=7202210726');

			expect((capturedArgs as { customerNumber: string }).customerNumber).toBe('7202210726');
		});

		it('should pass referenceMonth filter to the use case', async () => {
			let capturedArgs: unknown;
			({ app } = await buildApp({
				getInvoices: {
					execute: jest.fn().mockImplementation((args) => {
						capturedArgs = args;
						return Promise.resolve({ invoices: [], nextCursor: null });
					}),
				},
			}));

			await supertest(app.getHttpServer()).get('/invoices?referenceMonth=JAN/2024');

			expect((capturedArgs as { referenceMonth: string }).referenceMonth).toBe('JAN/2024');
		});

		it('should return 400 when cursor is not a valid UUID', async () => {
			({ app } = await buildApp());

			const res = await supertest(app.getHttpServer()).get('/invoices?cursor=not-a-uuid');

			expect(res.status).toBe(400);
		});

		it('should return 400 when size is not a number', async () => {
			({ app } = await buildApp());

			const res = await supertest(app.getHttpServer()).get('/invoices?size=abc');

			expect(res.status).toBe(400);
		});

		it('should return 400 when an unknown query param is sent', async () => {
			({ app } = await buildApp());

			const res = await supertest(app.getHttpServer()).get('/invoices?unknown=value');

			expect(res.status).toBe(400);
		});
	});

	describe('GET /invoices/overview', () => {
		it('should return 200 with energy and financial overview', async () => {
			({ app } = await buildApp());

			const res = await supertest(app.getHttpServer()).get('/invoices/overview');

			expect(res.status).toBe(200);
			expect(res.body.message).toBe('Overview de faturas!');
			expect(res.body.data).toHaveProperty('energy');
			expect(res.body.data).toHaveProperty('financial');
			expect(res.body.data.energy).toHaveProperty('consumption');
			expect(res.body.data.energy).toHaveProperty('compensated');
			expect(res.body.data.financial).toHaveProperty('totalWithoutGD');
			expect(res.body.data.financial).toHaveProperty('gdEconomy');
		});

		it('should pass customerNumber filter to the use case', async () => {
			let capturedArgs: unknown;
			({ app } = await buildApp({
				getOverviewInvoices: {
					execute: jest.fn().mockImplementation((args) => {
						capturedArgs = args;
						return Promise.resolve(makeOverviewResponse());
					}),
				},
			}));

			await supertest(app.getHttpServer()).get('/invoices/overview?customerNumber=7202210726');

			expect((capturedArgs as { customerNumber: string }).customerNumber).toBe('7202210726');
		});
	});

	describe('POST /invoices', () => {
		it('should return 201 with the processed invoice data', async () => {
			const invoiceData = makeInvoiceResponse();
			({ app } = await buildApp({
				createInvoice: { execute: jest.fn().mockResolvedValue(invoiceData) },
			}));

			const pdfBuffer = readFileSync(join(__dirname, 'pdf', '3001422762-01-2024.pdf'));

			const res = await supertest(app.getHttpServer()).post('/invoices').attach('file', pdfBuffer, {
				filename: '3001422762-01-2024.pdf',
				contentType: 'application/pdf',
			});

			expect(res.status).toBe(201);
			expect(res.body.message).toBe('Fatura processada com sucesso!');
			expect(res.body.data).toBeDefined();
			expect(res.body.data.customerNumber).toBe(invoiceData.customerNumber);
			expect(res.body.data.referenceMonth).toBe(invoiceData.referenceMonth);
		});

		it('should call the use case with the uploaded file', async () => {
			const executeMock = jest.fn().mockResolvedValue(makeInvoiceResponse());
			({ app } = await buildApp({ createInvoice: { execute: executeMock } }));

			const pdfBuffer = readFileSync(join(__dirname, 'pdf', '3001422762-01-2024.pdf'));

			await supertest(app.getHttpServer()).post('/invoices').attach('file', pdfBuffer, {
				filename: '3001422762-01-2024.pdf',
				contentType: 'application/pdf',
			});

			expect(executeMock).toHaveBeenCalledTimes(1);
			expect(executeMock).toHaveBeenCalledWith({
				file: expect.objectContaining({ originalname: '3001422762-01-2024.pdf' }),
			});
		});

		it('should return 415 when the uploaded file is not a PDF', async () => {
			({ app } = await buildApp());

			const res = await supertest(app.getHttpServer())
				.post('/invoices')
				.attach('file', Buffer.from('fake content'), {
					filename: 'document.txt',
					contentType: 'text/plain',
				});

			expect(res.status).toBe(415);
		});

		it('should return 400 when the LLM provider fails', async () => {
			({ app } = await buildApp({
				createInvoice: {
					execute: jest
						.fn()
						.mockRejectedValue(
							new BadRequestError('O serviço de extração está temporariamente indisponível.'),
						),
				},
			}));

			const pdfBuffer = readFileSync(join(__dirname, 'pdf', '3001422762-01-2024.pdf'));

			const res = await supertest(app.getHttpServer())
				.post('/invoices')
				.attach('file', pdfBuffer, {
					filename: '3001422762-01-2024.pdf',
					contentType: 'application/pdf',
				});

			expect(res.status).toBe(400);
			expect(res.body.message).toBe(
				'O serviço de extração está temporariamente indisponível.',
			);
		});

		it('should return 400 when the uploaded PDF is not a valid invoice', async () => {
			({ app } = await buildApp({
				createInvoice: {
					execute: jest
						.fn()
						.mockRejectedValue(
							new BadRequestError(
								'O PDF enviado não parece ser uma fatura de energia elétrica válida.',
							),
						),
				},
			}));

			const pdfBuffer = readFileSync(join(__dirname, 'pdf', '3001422762-01-2024.pdf'));

			const res = await supertest(app.getHttpServer())
				.post('/invoices')
				.attach('file', pdfBuffer, {
					filename: '3001422762-01-2024.pdf',
					contentType: 'application/pdf',
				});

			expect(res.status).toBe(400);
			expect(res.body.message).toBe(
				'O PDF enviado não parece ser uma fatura de energia elétrica válida.',
			);
		});
	});
});
