export class InvoiceEntity {
	id: string;
	customerNumber: string;
	referenceMonth: string;
	electricalEnergyQuantity: number;
	electricalEnergyValue: number;
	sceeeEnergyWithoutICMSQuantity: number;
	sceeeEnergyWithoutICMSValue: number;
	gdiCompensatedEnergyQuantity: number;
	gdiCompensatedEnergyValue: number;
	contribMunicipalPublicLightValue: number;
	electricalEnergyConsumptionValue: number;
	totalValueWithoutGD: number;
	gdEconomy: number;
	createdAt: Date;
	updatedAt: Date;

	constructor(partial: Partial<InvoiceEntity>) {
		Object.assign(this, partial);
	}
}
