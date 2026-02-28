import { InvoiceEntity, InvoiceEntityInput } from '@application/invoices/entities/invoice.entity';
import { InMemoryInvoicesRepository } from '@application/invoices/in-memory/in-memory-invoices.repository';
import { GetOverviewInvoicesUseCase } from '@application/invoices/use-cases/get-overview-invoices/get-overview-invoices.use-case';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

describe('GetOverviewInvoicesUseCase', () => {
	let repository: InMemoryInvoicesRepository;
	let useCase: GetOverviewInvoicesUseCase;
	let invoiceCounter: number;

	beforeEach(() => {
		repository = new InMemoryInvoicesRepository();
		useCase = new GetOverviewInvoicesUseCase(repository);
		invoiceCounter = 0;
	});

	const makeInvoice = (partial: Partial<InvoiceEntityInput> = {}) => {
		const month = MONTHS[invoiceCounter % 12];
		const year = 2024 + Math.floor(invoiceCounter / 12);

		invoiceCounter++;

		return new InvoiceEntity({
			customerNumber: '3001422762',
			referenceMonth: `${month}/${year}`,
			electricalEnergyQuantity: 100,
			electricalEnergyValue: 50,
			sceeeEnergyWithoutICMSQuantity: 200,
			sceeeEnergyWithoutICMSValue: 80,
			gdiCompensatedEnergyQuantity: 150,
			gdiCompensatedEnergyValue: -60,
			contribMunicipalPublicLightValue: 15,
			electricalEnergyConsumptionValue: 300,
			totalValueWithoutGD: 145,
			gdEconomy: 60,
			createdAt: new Date(),
			updatedAt: new Date(),
			...partial,
		});
	};

	describe('without filters', () => {
		it('should return zeros when the repository is empty', async () => {
			const result = await useCase.execute({});

			expect(result.energy.consumption).toBe(0);
			expect(result.energy.compensated).toBe(0);
			expect(result.financial.totalWithoutGD).toBe(0);
			expect(result.financial.gdEconomy).toBe(0);
		});

		it('should aggregate energy consumption from all invoices', async () => {
			await repository.create(
				makeInvoice({ electricalEnergyQuantity: 100, sceeeEnergyWithoutICMSQuantity: 200 }),
			);
			await repository.create(
				makeInvoice({ electricalEnergyQuantity: 50, sceeeEnergyWithoutICMSQuantity: 100 }),
			);

			const result = await useCase.execute({});

			expect(result.energy.consumption).toBe(450);
		});

		it('should aggregate compensated energy (GD) from all invoices', async () => {
			await repository.create(makeInvoice({ gdiCompensatedEnergyQuantity: 150 }));
			await repository.create(makeInvoice({ gdiCompensatedEnergyQuantity: 75 }));

			const result = await useCase.execute({});

			expect(result.energy.compensated).toBe(225);
		});

		it('should aggregate totalWithoutGD from all invoices', async () => {
			await repository.create(makeInvoice({ totalValueWithoutGD: 145 }));
			await repository.create(makeInvoice({ totalValueWithoutGD: 200 }));

			const result = await useCase.execute({});

			expect(result.financial.totalWithoutGD).toBe(345);
		});

		it('should aggregate gdEconomy from all invoices', async () => {
			await repository.create(makeInvoice({ gdEconomy: 60 }));
			await repository.create(makeInvoice({ gdEconomy: 40 }));

			const result = await useCase.execute({});

			expect(result.financial.gdEconomy).toBe(100);
		});

		it('should return the correct structure with energy and financial fields', async () => {
			await repository.create(makeInvoice());

			const result = await useCase.execute({});

			expect(result).toHaveProperty('energy');
			expect(result).toHaveProperty('financial');
			expect(result.energy).toHaveProperty('consumption');
			expect(result.energy).toHaveProperty('compensated');
			expect(result.financial).toHaveProperty('totalWithoutGD');
			expect(result.financial).toHaveProperty('gdEconomy');
		});
	});

	describe('filter by customerNumber', () => {
		beforeEach(async () => {
			await repository.create(
				makeInvoice({
					customerNumber: '3001422762',
					electricalEnergyQuantity: 100,
					sceeeEnergyWithoutICMSQuantity: 200,
					gdiCompensatedEnergyQuantity: 150,
					totalValueWithoutGD: 145,
					gdEconomy: 60,
				}),
			);
			await repository.create(
				makeInvoice({
					customerNumber: '3001422762',
					electricalEnergyQuantity: 120,
					sceeeEnergyWithoutICMSQuantity: 180,
					gdiCompensatedEnergyQuantity: 100,
					totalValueWithoutGD: 160,
					gdEconomy: 40,
				}),
			);
			await repository.create(
				makeInvoice({
					customerNumber: '7202210726',
					electricalEnergyQuantity: 500,
					sceeeEnergyWithoutICMSQuantity: 1000,
					gdiCompensatedEnergyQuantity: 800,
					totalValueWithoutGD: 900,
					gdEconomy: 300,
				}),
			);
		});

		it('should aggregate only invoices for the specified customer', async () => {
			const result = await useCase.execute({ customerNumber: '3001422762' });

			expect(result.energy.consumption).toBe(600);
			expect(result.energy.compensated).toBe(250);
			expect(result.financial.totalWithoutGD).toBe(305);
			expect(result.financial.gdEconomy).toBe(100);
		});

		it('should return zeros when the customer has no invoices', async () => {
			const result = await useCase.execute({ customerNumber: '9999999999' });

			expect(result.energy.consumption).toBe(0);
			expect(result.energy.compensated).toBe(0);
			expect(result.financial.totalWithoutGD).toBe(0);
			expect(result.financial.gdEconomy).toBe(0);
		});

		it('should support partial search by customer number', async () => {
			const result = await useCase.execute({ customerNumber: '300142' });

			expect(result.energy.consumption).toBe(600);
		});
	});
});
