import { InvoicesRepository } from '@application/invoices/repositories/invoices.repository';
import { PDFDataExtractorProvider } from '@infra/providers/pdf-data-extractor/types/pdf-data-extractor.provider';
import { Injectable } from '@nestjs/common';
import { InvoiceEntity } from '../../entities/invoice.entity';

type CreateInvoiceUseCaseData = {
	file: Express.Multer.File;
};

@Injectable()
export class CreateInvoiceUseCase {
	constructor(
		private readonly invoicesRepository: InvoicesRepository,
		private readonly pdfDataExtractorProvider: PDFDataExtractorProvider,
	) {}

	async execute({ file }: CreateInvoiceUseCaseData) {
		const {
			contribMunicipalPublicLightValue,
			customerNumber,
			electricalEnergyQuantity,
			electricalEnergyValue,
			gdiCompensatedEnergyQuantity,
			gdiCompensatedEnergyValue,
			referenceMonth,
			sceeeEnergyWithoutICMSQuantity,
			sceeeEnergyWithoutICMSValue,
		} = await this.pdfDataExtractorProvider.get({ pdf: file });

		const electricalEnergyConsumptionValue =
			electricalEnergyQuantity + sceeeEnergyWithoutICMSQuantity;

		const totalValueWithoutGD =
			electricalEnergyValue + sceeeEnergyWithoutICMSValue + contribMunicipalPublicLightValue;

		const gdEconomy = Math.abs(gdiCompensatedEnergyValue);

		const invoice = new InvoiceEntity({
			customerNumber,
			referenceMonth,
			electricalEnergyQuantity,
			electricalEnergyValue,
			sceeeEnergyWithoutICMSQuantity,
			sceeeEnergyWithoutICMSValue,
			gdiCompensatedEnergyQuantity,
			gdiCompensatedEnergyValue,
			contribMunicipalPublicLightValue,
			electricalEnergyConsumptionValue,
			totalValueWithoutGD,
			gdEconomy,
		});

		return await this.invoicesRepository.create(invoice);
	}
}
