import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
	NotFoundException,
} from '@nestjs/common';
import { catchError } from 'rxjs';
import { NotFoundError } from '../types/not-found-error';

@Injectable()
export class NotFoundInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler) {
		return next.handle().pipe(
			catchError((error) => {
				if (error instanceof NotFoundError) {
					throw new NotFoundException(error.message);
				}

				throw error;
			}),
		);
	}
}
