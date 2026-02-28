import pino from 'pino';
import { LogsAdapterProps } from './types/logs.adapter-props';

class LogsAdapter implements LogsAdapterProps {
	private log: pino.Logger;

	constructor() {
		this.log = pino({
			name: 'api-logs',
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:standard',
				},
			},
		});
	}

	success(scope: string, message: string): void {
		const logger = this.log.child({ scope });
		logger.info(message);
	}

	error(scope: string, message: string): void {
		const logger = this.log.child({ scope });
		logger.error(message);
	}

	info(scope: string, message: string): void {
		const logger = this.log.child({ scope });
		logger.debug(message);
	}
}

export const logsAdapter = new LogsAdapter();
