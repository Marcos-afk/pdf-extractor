import { randomUUID } from 'node:crypto';
import { InvoiceEntity, InvoiceEntityInput } from '@application/invoices/entities/invoice.entity';
import { InMemoryInvoicesRepository } from '@application/invoices/in-memory/in-memory-invoices.repository';
import { GetInvoicesUseCase } from '@application/invoices/use-cases/get-invoices/get-invoices.use-case';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

describe('GetInvoicesUseCase', () => {
	let repository: InMemoryInvoicesRepository;
	let useCase: GetInvoicesUseCase;
	let invoiceCounter: number;

	beforeEach(() => {
		repository = new InMemoryInvoicesRepository();
		useCase = new GetInvoicesUseCase(repository);
		invoiceCounter = 0;
	});

	const makeInvoice = (partial: Partial<InvoiceEntityInput> = {}) => {
		const month = MONTHS[invoiceCounter % 12];
		const year = 2024 + Math.floor(invoiceCounter / 12);

		invoiceCounter++;

		return new InvoiceEntity({
			id: randomUUID(),
			customerNumber: '3001422762',
			referenceMonth: `${month}/${year}`,
			electricalEnergyQuantity: 100,
			electricalEnergyValue: 50.75,
			sceeeEnergyWithoutICMSQuantity: 200,
			sceeeEnergyWithoutICMSValue: 80.25,
			gdiCompensatedEnergyQuantity: 300,
			gdiCompensatedEnergyValue: -120.5,
			contribMunicipalPublicLightValue: 15,
			electricalEnergyConsumptionValue: 300,
			totalValueWithoutGD: 146,
			gdEconomy: 120.5,
			createdAt: new Date(),
			updatedAt: new Date(),
			...partial,
		});
	};

	describe('without filters', () => {
		it('should return all invoices when no filters are provided', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { invoices } = await useCase.execute({});

			expect(invoices).toHaveLength(3);
		});

		it('should return an empty array when the repository is empty', async () => {
			const { invoices } = await useCase.execute({});

			expect(invoices).toHaveLength(0);
			expect(invoices).toEqual([]);
		});

		it('should return nextCursor as null when there are no more pages', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { nextCursor } = await useCase.execute({ size: 10 });

			expect(nextCursor).toBeNull();
		});
	});

	describe('filter by customerNumber', () => {
		it('should return only invoices for the specified customer', async () => {
			await repository.create(makeInvoice({ customerNumber: '3001422762' }));
			await repository.create(makeInvoice({ customerNumber: '3001422762' }));
			await repository.create(makeInvoice({ customerNumber: '7202210726' }));

			const { invoices } = await useCase.execute({ customerNumber: '3001422762' });

			expect(invoices).toHaveLength(2);

			for (const invoice of invoices) {
				expect(invoice.customerNumber).toBe('3001422762');
			}
		});

		it('should return an empty array when the customer does not exist', async () => {
			await repository.create(makeInvoice({ customerNumber: '3001422762' }));

			const { invoices } = await useCase.execute({ customerNumber: '9999999999' });

			expect(invoices).toHaveLength(0);
		});
	});

	describe('filter by referenceMonth', () => {
		it('should return only invoices for the specified month', async () => {
			await repository.create(makeInvoice({ referenceMonth: 'JAN/2024' }));
			await repository.create(
				makeInvoice({ referenceMonth: 'JAN/2024', customerNumber: '7202210726' }),
			);
			await repository.create(makeInvoice({ referenceMonth: 'FEV/2024' }));

			const { invoices } = await useCase.execute({ referenceMonth: 'JAN/2024' });

			expect(invoices).toHaveLength(2);

			for (const invoice of invoices) {
				expect(invoice.referenceMonth).toBe('JAN/2024');
			}
		});

		it('should return an empty array when the month does not exist', async () => {
			await repository.create(makeInvoice({ referenceMonth: 'JAN/2024' }));

			const { invoices } = await useCase.execute({ referenceMonth: 'DEZ/2099' });

			expect(invoices).toHaveLength(0);
		});
	});

	describe('combined filter (customerNumber + referenceMonth)', () => {
		it('should return only invoices matching both filters', async () => {
			await repository.create(
				makeInvoice({ customerNumber: '3001422762', referenceMonth: 'JAN/2024' }),
			);
			await repository.create(
				makeInvoice({ customerNumber: '3001422762', referenceMonth: 'FEV/2024' }),
			);
			await repository.create(
				makeInvoice({ customerNumber: '7202210726', referenceMonth: 'JAN/2024' }),
			);

			const { invoices } = await useCase.execute({
				customerNumber: '3001422762',
				referenceMonth: 'JAN/2024',
			});

			expect(invoices).toHaveLength(1);
			expect(invoices[0].customerNumber).toBe('3001422762');
			expect(invoices[0].referenceMonth).toBe('JAN/2024');
		});
	});

	describe('cursor pagination', () => {
		it('should return invoices after the specified cursor', async () => {
			const first = makeInvoice();
			const second = makeInvoice();
			const third = makeInvoice();

			await repository.create(first);
			await repository.create(second);
			await repository.create(third);

			const { invoices } = await useCase.execute({ cursor: first.id });

			expect(invoices).toHaveLength(2);
			expect(invoices[0].id).toBe(second.id);
			expect(invoices[1].id).toBe(third.id);
		});

		it('should return all invoices when the cursor is not found', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { invoices } = await useCase.execute({ cursor: randomUUID() });

			expect(invoices).toHaveLength(2);
		});
	});

	describe('limit by size', () => {
		it('should limit the number of returned invoices', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { invoices } = await useCase.execute({ size: 2 });

			expect(invoices).toHaveLength(2);
		});

		it('should return all invoices when size is greater than total', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { invoices } = await useCase.execute({ size: 10 });

			expect(invoices).toHaveLength(2);
		});
	});

	describe('cursor + size combined', () => {
		it('should paginate from cursor and limit by size', async () => {
			const first = makeInvoice();
			const second = makeInvoice();
			const third = makeInvoice();
			const fourth = makeInvoice();

			await repository.create(first);
			await repository.create(second);
			await repository.create(third);
			await repository.create(fourth);

			const { invoices } = await useCase.execute({ cursor: first.id, size: 2 });

			expect(invoices).toHaveLength(2);
			expect(invoices[0].id).toBe(second.id);
			expect(invoices[1].id).toBe(third.id);
		});
	});

	describe('nextCursor', () => {
		it('should return nextCursor pointing to the last item of the page when there are more results', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { invoices, nextCursor } = await useCase.execute({ size: 2 });

			expect(invoices).toHaveLength(2);
			expect(nextCursor).toBe(invoices[invoices.length - 1].id);
		});

		it('should return nextCursor as null when results fit within the page size', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const { nextCursor } = await useCase.execute({ size: 5 });

			expect(nextCursor).toBeNull();
		});

		it('should return nextCursor as null when the repository is empty', async () => {
			const { nextCursor } = await useCase.execute({});

			expect(nextCursor).toBeNull();
		});
	});

	describe('upsert behavior', () => {
		it('should update an existing invoice when the same customer and month are inserted again', async () => {
			await repository.create(
				makeInvoice({ referenceMonth: 'JAN/2024', electricalEnergyValue: 50 }),
			);
			await repository.create(
				makeInvoice({ referenceMonth: 'JAN/2024', electricalEnergyValue: 99 }),
			);

			const { invoices } = await useCase.execute({ referenceMonth: 'JAN/2024' });

			expect(invoices).toHaveLength(1);
			expect(invoices[0].electricalEnergyValue).toBe(99);
		});
	});
});
