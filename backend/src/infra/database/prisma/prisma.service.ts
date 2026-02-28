import { logsAdapter } from '@common/adapters/api-logs/api-logs.adapter';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { env } from '@/src/env';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor() {
		super({ adapter });
	}

	async onModuleInit() {
		try {
			await this.$connect();

			return logsAdapter.success('Database', 'DataBase connected');
		} catch (error) {
			logsAdapter.error('Database', `Error connecting to database: ${error.message}`);

			process.exit(1);
		}
	}

	async onModuleDestroy() {
		await this.$disconnect();
		return logsAdapter.info('Database', 'Database shutdown');
	}
}
