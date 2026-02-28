import { GetInvoicesDTO } from '../dtos/get-invoices.dto';
import { GetOverviewInvoicesDTO } from '../dtos/get-overview-invoices.dto';
import { InvoiceEntity } from '../entities/invoice.entity';

export interface GetOverviewInvoicesResponseProps {
	energy: {
		consumption: number;
		compensated: number;
	};
	financial: {
		totalWithoutGD: number;
		gdEconomy: number;
	};
}

export abstract class InvoicesRepository {
	abstract create(data: InvoiceEntity): Promise<InvoiceEntity>;

	abstract get(params: GetInvoicesDTO): Promise<InvoiceEntity[]>;

	abstract getOverview(params: GetOverviewInvoicesDTO): Promise<GetOverviewInvoicesResponseProps>;
}
