import { Injectable } from '@nestjs/common';
import { GetInvoicesDTO } from '../dtos/get-invoices.dto';
import { GetOverviewInvoicesDTO } from '../dtos/get-overview-invoices.dto';
import { InvoiceEntity } from '../entities/invoice.entity';
import {
	GetOverviewInvoicesResponseProps,
	InvoicesRepository,
} from '../repositories/invoices.repository';

@Injectable()
export class InMemoryInvoicesRepository implements InvoicesRepository {
	private db: InvoiceEntity[] = [];

	async create(data: InvoiceEntity): Promise<InvoiceEntity> {
		this.db.push(data);

		return data;
	}

	async get({
		customerNumber,
		referenceMonth,
		cursor,
		size,
	}: GetInvoicesDTO): Promise<InvoiceEntity[]> {
		let result = [...this.db];

		if (customerNumber) {
			result = result.filter((invoice) => invoice.customerNumber === customerNumber);
		}

		if (referenceMonth) {
			result = result.filter((invoice) => invoice.referenceMonth === referenceMonth);
		}

		if (cursor) {
			const cursorIndex = result.findIndex((invoice) => invoice.id === cursor);

			if (cursorIndex !== -1) {
				result = result.slice(cursorIndex + 1);
			}
		}

		if (size) {
			result = result.slice(0, size);
		}

		return result;
	}

	async getOverview({
		customerNumber,
	}: GetOverviewInvoicesDTO): Promise<GetOverviewInvoicesResponseProps> {
		let invoices = [...this.db];

		if (customerNumber) {
			invoices = invoices.filter((invoice) =>
				invoice.customerNumber.toLowerCase().includes(customerNumber.toLowerCase()),
			);
		}

		const consumption = invoices.reduce(
			(acc, invoice) =>
				acc + invoice.electricalEnergyQuantity + invoice.sceeeEnergyWithoutICMSQuantity,
			0,
		);

		const compensated = invoices.reduce(
			(acc, invoice) => acc + invoice.gdiCompensatedEnergyQuantity,
			0,
		);

		const totalWithoutGD = invoices.reduce((acc, invoice) => acc + invoice.totalValueWithoutGD, 0);

		const gdEconomy = invoices.reduce((acc, invoice) => acc + invoice.gdEconomy, 0);

		return {
			energy: { consumption, compensated },
			financial: { totalWithoutGD, gdEconomy },
		};
	}
}
