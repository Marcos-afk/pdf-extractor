import { Injectable } from '@nestjs/common';
import { Invoice, Prisma } from '@/generated/prisma/client';
import { GetInvoicesDTO } from '@/src/application/invoices/dtos/get-invoices.dto';
import { GetOverviewInvoicesDTO } from '@/src/application/invoices/dtos/get-overview-invoices.dto';
import { InvoiceEntity } from '@/src/application/invoices/entities/invoice.entity';
import {
	GetOverviewInvoicesResponseProps,
	InvoicesRepository,
} from '@/src/application/invoices/repositories/invoices.repository';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PrismaInvoicesRepository implements InvoicesRepository {
	constructor(private readonly prismaService: PrismaService) {}

	private toPrisma({
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
	}: InvoiceEntity) {
		return {
			id,
			customer_number: customerNumber,
			reference_month: referenceMonth,
			electrical_energy_quantity: electricalEnergyQuantity,
			electrical_energy_value: electricalEnergyValue,
			sceee_energy_without_icms_quantity: sceeeEnergyWithoutICMSQuantity,
			sceee_energy_without_icms_value: sceeeEnergyWithoutICMSValue,
			gdi_compensated_energy_quantity: gdiCompensatedEnergyQuantity,
			gdi_compensated_energy_value: gdiCompensatedEnergyValue,
			contrib_municipal_public_light_value: contribMunicipalPublicLightValue,
			electrical_energy_consumption_value: electricalEnergyConsumptionValue,
			total_value_without_gd: totalValueWithoutGD,
			gd_economy: gdEconomy,
			created_at: createdAt,
			updated_at: updatedAt,
		};
	}

	private toDomain({
		id,
		customer_number,
		reference_month,
		electrical_energy_quantity,
		electrical_energy_value,
		sceee_energy_without_icms_quantity,
		sceee_energy_without_icms_value,
		gdi_compensated_energy_quantity,
		gdi_compensated_energy_value,
		contrib_municipal_public_light_value,
		electrical_energy_consumption_value,
		total_value_without_gd,
		gd_economy,
		created_at,
		updated_at,
	}: Invoice) {
		return new InvoiceEntity({
			id,
			customerNumber: customer_number,
			referenceMonth: reference_month,
			electricalEnergyQuantity: electrical_energy_quantity,
			electricalEnergyValue: electrical_energy_value,
			sceeeEnergyWithoutICMSQuantity: sceee_energy_without_icms_quantity,
			sceeeEnergyWithoutICMSValue: sceee_energy_without_icms_value,
			gdiCompensatedEnergyQuantity: gdi_compensated_energy_quantity,
			gdiCompensatedEnergyValue: gdi_compensated_energy_value,
			contribMunicipalPublicLightValue: contrib_municipal_public_light_value,
			electricalEnergyConsumptionValue: electrical_energy_consumption_value,
			totalValueWithoutGD: total_value_without_gd,
			gdEconomy: gd_economy,
			createdAt: created_at,
			updatedAt: updated_at,
		});
	}

	async create(data: InvoiceEntity): Promise<InvoiceEntity> {
		const payload = this.toPrisma(data);

		const invoice = await this.prismaService.invoice.upsert({
			where: {
				customer_number_reference_month: {
					customer_number: data.customerNumber,
					reference_month: data.referenceMonth,
				},
			},
			create: payload,
			update: payload,
		});

		return this.toDomain(invoice);
	}

	async get({
		cursor,
		size,
		customerNumber,
		referenceMonth,
	}: GetInvoicesDTO): Promise<InvoiceEntity[]> {
		let whereConditions: Prisma.InvoiceWhereInput = {};

		const take = size ?? 10;

		if (customerNumber) {
			whereConditions = {
				...whereConditions,
				customer_number: {
					contains: customerNumber,
					mode: 'insensitive',
				},
			};
		}

		if (referenceMonth) {
			whereConditions = {
				...whereConditions,
				reference_month: {
					contains: referenceMonth,
					mode: 'insensitive',
				},
			};
		}

		const invoices = await this.prismaService.invoice.findMany({
			take,
			skip: cursor ? 1 : undefined,
			cursor: cursor ? { id: cursor } : undefined,
			where: whereConditions,
			orderBy: {
				created_at: 'desc',
			},
		});

		return invoices.map((invoice) => this.toDomain(invoice));
	}

	async getOverview({
		customerNumber,
	}: GetOverviewInvoicesDTO): Promise<GetOverviewInvoicesResponseProps> {
		let whereConditions: Prisma.InvoiceWhereInput = {};

		if (customerNumber) {
			whereConditions = {
				customer_number: {
					contains: customerNumber,
					mode: 'insensitive',
				},
			};
		}

		const invoicesSums = await this.prismaService.invoice.aggregate({
			where: whereConditions,
			_sum: {
				electrical_energy_quantity: true,
				sceee_energy_without_icms_quantity: true,
				gdi_compensated_energy_quantity: true,
				total_value_without_gd: true,
				gd_economy: true,
			},
		});

		const totalSums = invoicesSums._sum;

		return {
			energy: {
				consumption:
					(totalSums.electrical_energy_quantity ?? 0) +
					(totalSums.sceee_energy_without_icms_quantity ?? 0),
				compensated: totalSums.gdi_compensated_energy_quantity ?? 0,
			},
			financial: {
				totalWithoutGD: totalSums.total_value_without_gd ?? 0,
				gdEconomy: totalSums.gd_economy ?? 0,
			},
		};
	}
}
