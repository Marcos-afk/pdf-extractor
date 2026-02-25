import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
	UnauthorizedException,
} from '@nestjs/common';
import { catchError } from 'rxjs';
import { UnauthorizedError } from '../types/unauthorized-request-error';

@Injectable()
export class UnauthorizedRequestInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler) {
		return next.handle().pipe(
			catchError((error) => {
				if (error instanceof UnauthorizedError) {
					throw new UnauthorizedException(error.message);
				}

				throw error;
			}),
		);
	}
}
