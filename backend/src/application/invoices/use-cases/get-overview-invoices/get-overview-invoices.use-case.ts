import { Injectable } from '@nestjs/common';
import { GetOverviewInvoicesDTO } from '../../dtos/get-overview-invoices.dto';
import { InvoicesRepository } from '../../repositories/invoices.repository';

@Injectable()
export class GetOverviewInvoicesUseCase {
	constructor(private readonly invoicesRepository: InvoicesRepository) {}

	async execute(params: GetOverviewInvoicesDTO) {
		return await this.invoicesRepository.getOverview(params);
	}
}
