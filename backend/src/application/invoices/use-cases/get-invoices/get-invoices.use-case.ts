import { Injectable } from '@nestjs/common';
import { GetInvoicesDTO } from '../../dtos/get-invoices.dto';
import { InvoicesRepository } from '../../repositories/invoices.repository';

@Injectable()
export class GetInvoicesUseCase {
	constructor(private readonly invoicesRepository: InvoicesRepository) {}

	async execute(data: GetInvoicesDTO) {
		const take = data.size ?? 10;

		const items = await this.invoicesRepository.get({ ...data, size: take + 1 });

		const hasMore = items.length > take;

		const invoices = hasMore ? items.slice(0, take) : items;

		const nextCursor = hasMore ? invoices[invoices.length - 1].id : null;

		return { invoices, nextCursor };
	}
}
