import { randomUUID } from 'node:crypto';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceResponse {
	@ApiProperty({
		description: 'ID da fatura',
		example: randomUUID(),
		type: String,
	})
	readonly id: string;

	@ApiProperty({
		description: 'Número do cliente',
		example: '7005400387',
		type: String,
	})
	readonly customerNumber: string;

	@ApiProperty({
		description: 'Mês de referência',
		example: 'JAN/2024',
		type: String,
	})
	readonly referenceMonth: string;

	@ApiProperty({
		description: 'Quantidade de Energia Elétrica (kWh)',
		example: 50,
		type: Number,
	})
	readonly electricalEnergyQuantity: number;

	@ApiProperty({
		description: 'Valor de Energia Elétrica (R$)',
		example: 37.89,
		type: Number,
	})
	readonly electricalEnergyValue: number;

	@ApiProperty({
		description: 'Quantidade SCEE s/ ICMS (kWh)',
		example: 476,
		type: Number,
	})
	readonly sceeeEnergyWithoutICMSQuantity: number;

	@ApiProperty({
		description: 'Valor SCEE s/ ICMS (R$)',
		example: 216.98,
		type: Number,
	})
	readonly sceeeEnergyWithoutICMSValue: number;

	@ApiProperty({
		description: 'Quantidade de Energia Compensada GD (kWh)',
		example: 476,
		type: Number,
	})
	readonly gdiCompensatedEnergyQuantity: number;

	@ApiProperty({
		description: 'Valor de Energia Compensada GD (R$)',
		example: -217.16,
		type: Number,
	})
	readonly gdiCompensatedEnergyValue: number;

	@ApiProperty({
		description: 'Contrib. Ilum. Pública Municipal (R$)',
		example: 43.93,
		type: Number,
	})
	readonly contribMunicipalPublicLightValue: number;

	@ApiProperty({
		description: 'Valor consumo de Energia Elétrica (R$)',
		example: 37.89,
		type: Number,
	})
	readonly electricalEnergyConsumptionValue: number;

	@ApiProperty({
		description: 'Valor total sem GD (R$)',
		example: 81.64,
		type: Number,
	})
	readonly totalValueWithoutGD: number;

	@ApiProperty({
		description: 'Economia GD (R$)',
		example: 217.16,
		type: Number,
	})
	readonly gdEconomy: number;

	@ApiProperty({
		description: 'Data de criação',
		example: new Date(),
		type: Date,
	})
	readonly createdAt: Date;

	@ApiProperty({
		description: 'Data de atualização',
		example: new Date(),
		type: Date,
	})
	readonly updatedAt: Date;
}

export class GetInvoicesResponse {
	@ApiProperty({
		description: 'Lista de faturas',
		type: [InvoiceResponse],
		isArray: true,
	})
	readonly data: InvoiceResponse[];

	@ApiProperty({
		description: 'Mensagem de resposta',
		example: 'Lista de faturas!',
		type: String,
	})
	readonly message: string;
}

export class CreateInvoiceResponse {
	@ApiProperty({
		description: 'Mensagem de resposta',
		example: 'Fatura processada com sucesso!',
		type: String,
	})
	readonly message: string;
}

class OverviewEnergyResponse {
	@ApiProperty({
		description: 'Consumo de Energia Elétrica (kWh)',
		example: 1234.56,
		type: Number,
	})
	readonly consumption: number;

	@ApiProperty({
		description: 'Energia Compensada GD (kWh)',
		example: 890.12,
		type: Number,
	})
	readonly compensated: number;
}

class OverviewFinancialResponse {
	@ApiProperty({
		description: 'Valor Total sem GD (R$)',
		example: 500.0,
		type: Number,
	})
	readonly totalWithoutGD: number;

	@ApiProperty({
		description: 'Economia GD (R$)',
		example: 200.0,
		type: Number,
	})
	readonly gdEconomy: number;
}

class OverviewDataResponse {
	@ApiProperty({
		description: 'Overview sobre dados de consumo',
		type: OverviewEnergyResponse,
	})
	readonly energy: OverviewEnergyResponse;

	@ApiProperty({
		description: 'Overview financeiro',
		type: OverviewFinancialResponse,
	})
	readonly financial: OverviewFinancialResponse;
}

export class DashboardResponse {
	@ApiProperty({
		description: 'Informações gerais de overview das faturas',
		type: OverviewDataResponse,
	})
	readonly data: OverviewDataResponse;

	@ApiProperty({
		description: 'Mensagem da operação',
		example: 'Overview de faturas!',
		type: String,
	})
	readonly message: string;
}
