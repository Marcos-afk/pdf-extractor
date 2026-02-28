import { randomUUID } from 'node:crypto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetInvoicesDTO {
	@ApiProperty({
		description: 'Número do cliente',
		required: false,
		example: '7202210726',
		type: String,
	})
	@IsOptional()
	@IsString({ message: 'Número do cliente deve ser uma string' })
	readonly customerNumber: string;

	@ApiProperty({
		description: 'Mês de referência',
		required: false,
		example: 'JAN/2024',
		type: String,
	})
	@IsOptional()
	@IsString({ message: 'Mês de referência deve ser uma string' })
	readonly referenceMonth: string;

	@ApiProperty({
		description: 'O cursor para a paginação',
		required: false,
		example: randomUUID(),
		type: String,
	})
	@IsOptional()
	@IsUUID(4, { message: 'O campo cursor deve ser um UUID válido' })
	readonly cursor?: string;

	@ApiProperty({
		description: 'O tamanho da página',
		required: false,
		example: 6,
		type: Number,
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: 'O campo size deve ser um número' })
	readonly size?: number;
}
