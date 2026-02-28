import { HttpModule } from '@infra/http/http.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
	imports: [
		ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
		HttpModule,
		ThrottlerModule.forRoot({
			throttlers: [
				{
					ttl: 60,
					limit: 100,
				},
			],
		}),
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
