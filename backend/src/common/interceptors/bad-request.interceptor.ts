import {
	BadRequestException,
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common';
import { catchError } from 'rxjs';
import { BadRequestError } from '../types/bad-request-error';

@Injectable()
export class BadRequestInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler) {
		return next.handle().pipe(
			catchError((error) => {
				if (error instanceof BadRequestError) {
					throw new BadRequestException(error.message);
				}
				throw error;
			}),
		);
	}
}
