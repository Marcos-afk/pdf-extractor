import { randomUUID } from 'node:crypto';

export interface InvoiceEntityInput {
	id?: string;
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
	createdAt?: Date;
	updatedAt?: Date;
}

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

	constructor({
		id,
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
		createdAt,
		updatedAt,
	}: InvoiceEntityInput) {
		this.id = id ?? randomUUID();

		this.customerNumber = customerNumber;

		this.referenceMonth = referenceMonth;

		this.electricalEnergyQuantity = electricalEnergyQuantity;

		this.electricalEnergyValue = electricalEnergyValue;

		this.sceeeEnergyWithoutICMSQuantity = sceeeEnergyWithoutICMSQuantity;

		this.sceeeEnergyWithoutICMSValue = sceeeEnergyWithoutICMSValue;

		this.gdiCompensatedEnergyQuantity = gdiCompensatedEnergyQuantity;

		this.gdiCompensatedEnergyValue = gdiCompensatedEnergyValue;

		this.contribMunicipalPublicLightValue = contribMunicipalPublicLightValue;

		this.electricalEnergyConsumptionValue = electricalEnergyConsumptionValue;

		this.totalValueWithoutGD = totalValueWithoutGD;

		this.gdEconomy = gdEconomy;

		this.createdAt = createdAt ?? new Date();

		this.updatedAt = updatedAt ?? new Date();
	}
}
