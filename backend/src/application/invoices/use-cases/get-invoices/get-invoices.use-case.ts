import { Injectable } from '@nestjs/common';
import { GetInvoicesDTO } from '../../dtos/get-invoices.dto';
import { InvoicesRepository } from '../../repositories/invoices.repository';

@Injectable()
export class GetInvoicesUseCase {
	constructor(private readonly invoicesRepository: InvoicesRepository) {}

	async execute(data: GetInvoicesDTO) {
		return await this.invoicesRepository.get(data);
	}
}
