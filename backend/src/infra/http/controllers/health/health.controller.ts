import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CheckHealthResponse } from './types/response.props';

@ApiTags('Health')
@Controller('health')
export class HealthController {
	@ApiOperation({ summary: 'Verifica se a API está online' })
	@ApiResponse({
		status: HttpStatus.OK,
		type: CheckHealthResponse,
		description: 'API online',
	})
	@HttpCode(HttpStatus.OK)
	@Get('/')
	healthCheck(@Res() res: Response) {
		return res.status(HttpStatus.OK).json({
			message: 'API Online',
		});
	}
}
