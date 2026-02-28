import { randomUUID } from 'node:crypto';
import { InvoiceEntity } from '@application/invoices/entities/invoice.entity';
import { InMemoryInvoicesRepository } from '@application/invoices/in-memory/in-memory-invoices.repository';
import { GetInvoicesUseCase } from '@application/invoices/use-cases/get-invoices/get-invoices.use-case';

const makeInvoice = (partial: Partial<InvoiceEntity> = {}): InvoiceEntity =>
	new InvoiceEntity({
		id: randomUUID(),
		customerNumber: '3001422762',
		referenceMonth: 'JAN/2024',
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

describe('GetInvoicesUseCase', () => {
	let repository: InMemoryInvoicesRepository;
	let useCase: GetInvoicesUseCase;

	beforeEach(() => {
		repository = new InMemoryInvoicesRepository();
		useCase = new GetInvoicesUseCase(repository);
	});

	describe('without filters', () => {
		it('should return all invoices when no filters are provided', async () => {
			await repository.create(makeInvoice({ referenceMonth: 'JAN/2024' }));
			await repository.create(makeInvoice({ referenceMonth: 'FEV/2024' }));
			await repository.create(makeInvoice({ referenceMonth: 'MAR/2024' }));

			const result = await useCase.execute({});

			expect(result).toHaveLength(3);
		});

		it('should return an empty array when the repository is empty', async () => {
			const result = await useCase.execute({});

			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});
	});

	describe('filter by customerNumber', () => {
		it('should return only invoices for the specified customer', async () => {
			await repository.create(makeInvoice({ customerNumber: '3001422762' }));
			await repository.create(makeInvoice({ customerNumber: '3001422762' }));
			await repository.create(makeInvoice({ customerNumber: '7202210726' }));

			const results = await useCase.execute({ customerNumber: '3001422762' });

			expect(results).toHaveLength(2);

			for (const result of results) {
				expect(result.referenceMonth).toBe('JAN/2024');
			}
		});

		it('should return an empty array when the customer does not exist', async () => {
			await repository.create(makeInvoice({ customerNumber: '3001422762' }));

			const result = await useCase.execute({ customerNumber: '9999999999' });

			expect(result).toHaveLength(0);
		});
	});

	describe('filter by referenceMonth', () => {
		it('should return only invoices for the specified month', async () => {
			await repository.create(makeInvoice({ referenceMonth: 'JAN/2024' }));
			await repository.create(makeInvoice({ referenceMonth: 'JAN/2024' }));
			await repository.create(makeInvoice({ referenceMonth: 'FEV/2024' }));

			const results = await useCase.execute({ referenceMonth: 'JAN/2024' });

			expect(results).toHaveLength(2);

			for (const result of results) {
				expect(result.referenceMonth).toBe('JAN/2024');
			}
		});

		it('should return an empty array when the month does not exist', async () => {
			await repository.create(makeInvoice({ referenceMonth: 'JAN/2024' }));

			const result = await useCase.execute({ referenceMonth: 'DEZ/2099' });

			expect(result).toHaveLength(0);
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

			const result = await useCase.execute({
				customerNumber: '3001422762',
				referenceMonth: 'JAN/2024',
			});

			expect(result).toHaveLength(1);
			expect(result[0].customerNumber).toBe('3001422762');
			expect(result[0].referenceMonth).toBe('JAN/2024');
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

			const result = await useCase.execute({ cursor: first.id });

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe(second.id);
			expect(result[1].id).toBe(third.id);
		});

		it('should return all invoices when the cursor is not found', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const result = await useCase.execute({ cursor: randomUUID() });

			expect(result).toHaveLength(2);
		});
	});

	describe('limit by size', () => {
		it('should limit the number of returned invoices', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const result = await useCase.execute({ size: 2 });

			expect(result).toHaveLength(2);
		});

		it('should return all invoices when size is greater than total', async () => {
			await repository.create(makeInvoice());
			await repository.create(makeInvoice());

			const result = await useCase.execute({ size: 10 });

			expect(result).toHaveLength(2);
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

			const result = await useCase.execute({ cursor: first.id, size: 2 });

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe(second.id);
			expect(result[1].id).toBe(third.id);
		});
	});
});
