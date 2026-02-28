import { InvoicesRepository } from '@application/invoices/repositories/invoices.repository';
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaInvoicesRepository } from './prisma/repositories/invoices/prisma-invoices.repository';

@Module({
	imports: [],
	providers: [
		PrismaService,
		{
			provide: InvoicesRepository,
			useClass: PrismaInvoicesRepository,
		},
	],
	exports: [InvoicesRepository],
})
export class DatabaseModule {}
