import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetOverviewInvoicesDTO {
	@ApiProperty({
		description: 'Filtrar por número do cliente',
		required: false,
		example: '7202210726',
		type: String,
	})
	@IsOptional()
	@IsString({ message: 'Número do cliente deve ser uma string' })
	readonly customerNumber?: string;
}
