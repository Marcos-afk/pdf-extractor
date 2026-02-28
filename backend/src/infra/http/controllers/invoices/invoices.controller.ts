import { GetInvoicesDTO } from '@application/invoices/dtos/get-invoices.dto';
import { GetOverviewInvoicesDTO } from '@application/invoices/dtos/get-overview-invoices.dto';
import { CreateInvoiceUseCase } from '@application/invoices/use-cases/create-invoice/create-invoice.use-case';
import { GetInvoicesUseCase } from '@application/invoices/use-cases/get-invoices/get-invoices.use-case';
import { GetOverviewInvoicesUseCase } from '@application/invoices/use-cases/get-overview-invoices/get-overview-invoices.use-case';
import { UploadInterceptor } from '@common/interceptors/upload.interceptor';
import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Query,
	Res,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
	CreateInvoiceResponse,
	DashboardResponse,
	GetInvoicesResponse,
} from './types/response.props';
@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
	constructor(
		private readonly createInvoiceUseCase: CreateInvoiceUseCase,
		private readonly getInvoicesUseCase: GetInvoicesUseCase,
		private readonly getOverviewInvoicesUseCase: GetOverviewInvoicesUseCase,
	) {}

	@ApiOperation({
		description:
			'Retorna totais agregados de energia (kWh) e financeiro (R$) para o dashboard. ' +
			'Consumo de Energia Elétrica vs Energia Compensada GD; Valor Total sem GD vs Economia GD.',
		summary: 'Dashboard de resultados de energia e financeiros',
	})
	@ApiResponse({
		description: 'OK',
		type: DashboardResponse,
		status: HttpStatus.OK,
	})
	@HttpCode(HttpStatus.OK)
	@Get('/overview')
	async getOverview(@Query() query: GetOverviewInvoicesDTO, @Res() res: Response) {
		const dashboard = await this.getOverviewInvoicesUseCase.execute(query);

		return res.status(HttpStatus.OK).json({
			message: 'Overview de faturas!',
			data: dashboard,
		});
	}

	@ApiOperation({
		description: 'Listar faturas',
		summary: 'Listar dados de fatura com paginação por scroll',
	})
	@ApiResponse({
		description: 'OK',
		type: GetInvoicesResponse,
		status: HttpStatus.OK,
	})
	@HttpCode(HttpStatus.OK)
	@Get('/')
	async get(@Query() data: GetInvoicesDTO, @Res() res: Response) {
		const { invoices, nextCursor } = await this.getInvoicesUseCase.execute(data);

		return res.status(HttpStatus.OK).json({
			message: 'Lista de faturas!',
			data: invoices,
			nextCursor,
		});
	}

	@ApiOperation({
		description: 'Processar dados de uma fatura(PDF)',
		summary: 'Processar dados da fatura(PDF)',
	})
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: { type: 'string', format: 'binary' },
			},
			required: ['file'],
		},
	})
	@ApiResponse({
		description: 'CREATED',
		type: CreateInvoiceResponse,
		status: HttpStatus.CREATED,
	})
	@UseInterceptors(
		UploadInterceptor({
			fieldName: 'file',
			allowedMimeTypes: ['application/pdf'],
			maxSizeInMb: 10,
		}),
	)
	@HttpCode(HttpStatus.CREATED)
	@Post('/')
	async createInvoice(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
		const invoice = await this.createInvoiceUseCase.execute({ file });

		return res.status(HttpStatus.CREATED).json({
			message: 'Fatura processada com sucesso!',
			data: invoice,
		});
	}
}
