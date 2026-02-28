import { ApiProperty } from '@nestjs/swagger';

export class CheckHealthResponse {
	@ApiProperty({
		description: 'Mensagem da operação',
		example: 'API Online!',
		type: String,
	})
	readonly message: string;
}
