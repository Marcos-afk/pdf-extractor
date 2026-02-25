import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
	PreconditionFailedException,
} from '@nestjs/common';
import { catchError } from 'rxjs';
import { PreconditionFailedError } from '../types/precondition-failed.error';

@Injectable()
export class PreconditionFailedInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler) {
		return next.handle().pipe(
			catchError((error) => {
				if (error instanceof PreconditionFailedError) {
					throw new PreconditionFailedException(error.message);
				}

				throw error;
			}),
		);
	}
}
