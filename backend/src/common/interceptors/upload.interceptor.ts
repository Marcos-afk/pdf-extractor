import {
	BadRequestException,
	CallHandler,
	ExecutionContext,
	Injectable,
	mixin,
	NestInterceptor,
	PayloadTooLargeException,
	UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import multer, { memoryStorage, StorageEngine } from 'multer';
import { Observable } from 'rxjs';

export interface UploadOptions {
	fieldName?: string;
	maxCount?: number;
	maxSizeInMb?: number;
	allowedMimeTypes?: string[];
	storage?: StorageEngine;
}

interface HandlerMulterErrorProps {
	error: multer.MulterError;
	maxSizeInMb: number;
	maxCount: number;
	fieldName: string;
}

function handleMulterError({ error, maxSizeInMb, maxCount, fieldName }: HandlerMulterErrorProps) {
	switch (error.code) {
		case 'LIMIT_FILE_SIZE':
			return new PayloadTooLargeException(`O arquivo excede o tamanho máximo de ${maxSizeInMb}MB`);
		case 'LIMIT_FILE_COUNT':
			return new BadRequestException(`Número de arquivos excede o limite de ${maxCount}`);
		case 'LIMIT_UNEXPECTED_FILE':
			return new BadRequestException(
				`Campo inesperado: '${error.field}'. Esperado: '${fieldName}'`,
			);
		default:
			return new BadRequestException(error.message);
	}
}

export function UploadInterceptor(options: UploadOptions = {}) {
	const {
		fieldName = 'file',
		maxCount = 1,
		maxSizeInMb = 10,
		allowedMimeTypes = [],
		storage = memoryStorage(),
	} = options;

	const upload = multer({
		storage,
		limits: {
			fileSize: maxSizeInMb * 1024 * 1024,
			files: maxCount,
		},
		fileFilter: (_req, file, callback) => {
			if (!allowedMimeTypes.includes(file.mimetype)) {
				return callback(
					new UnsupportedMediaTypeException(
						`Tipo '${file.mimetype}' não é permitido. Aceitos: ${allowedMimeTypes.join(', ')}`,
					),
				);
			}

			callback(null, true);
		},
	});

	@Injectable()
	class MixinUploadInterceptor implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
			const http = context.switchToHttp();
			const req = http.getRequest<Request>();
			const res = http.getResponse<Response>();

			const handler = maxCount === 1 ? upload.single(fieldName) : upload.array(fieldName, maxCount);

			return new Observable((observer) => {
				handler(req, res, (error: unknown) => {
					if (error instanceof multer.MulterError) {
						observer.error(handleMulterError({ error, maxSizeInMb, maxCount, fieldName }));
						return;
					}

					if (error) {
						observer.error(error);
						return;
					}

					next.handle().subscribe({
						next: (value) => observer.next(value),
						error: (err) => observer.error(err),
						complete: () => observer.complete(),
					});
				});
			});
		}
	}

	return mixin(MixinUploadInterceptor);
}
