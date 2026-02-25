import {
	type CallHandler,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common';
import { catchError } from 'rxjs';
import { ForbiddenError } from '../types/forbidden-error';

@Injectable()
export class ForbiddenInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler) {
		return next.handle().pipe(
			catchError((error) => {
				if (error instanceof ForbiddenError) {
					throw new ForbiddenException(error.message);
				}

				throw error;
			}),
		);
	}
}
