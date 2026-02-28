import { CreateInvoiceUseCase } from '@application/invoices/use-cases/create-invoice/create-invoice.use-case';
import { DatabaseModule } from '@infra/database/database.module';
import { ProviderModule } from '@infra/providers/provider.module';
import { Module } from '@nestjs/common';
import { GetInvoicesUseCase } from '@/src/application/invoices/use-cases/get-invoices/get-invoices.use-case';
import { GetOverviewInvoicesUseCase } from '@/src/application/invoices/use-cases/get-overview-invoices/get-overview-invoices.use-case';
import { InvoicesController } from './controllers/invoices/invoices.controller';

@Module({
	imports: [DatabaseModule, ProviderModule],
	controllers: [InvoicesController],
	providers: [CreateInvoiceUseCase, GetInvoicesUseCase, GetOverviewInvoicesUseCase],
})
export class HttpModule {}
