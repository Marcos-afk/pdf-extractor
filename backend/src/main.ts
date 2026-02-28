import { join } from 'node:path';
import { logsAdapter } from '@common/adapters/api-logs/api-logs.adapter';
import { BadRequestInterceptor } from '@common/interceptors/bad-request.interceptor';
import { ForbiddenInterceptor } from '@common/interceptors/forbidden.interceptor';
import { NotFoundInterceptor } from '@common/interceptors/not-found.interceptor';
import { PreconditionFailedInterceptor } from '@common/interceptors/precondition-failed.interceptor';
import { UnauthorizedRequestInterceptor } from '@common/interceptors/unauthorized-request.interceptor';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from './env';

async function bootstrap() {
	try {
		const app = await NestFactory.create<NestExpressApplication>(AppModule, {
			rawBody: true,
		});

		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			}),
		);

		app.useGlobalInterceptors(
			new BadRequestInterceptor(),
			new NotFoundInterceptor(),
			new UnauthorizedRequestInterceptor(),
			new ForbiddenInterceptor(),
			new PreconditionFailedInterceptor(),
		);

		app.useStaticAssets(join(__dirname, '../../tmp'), {
			prefix: '/uploads',
		});

		const config = new DocumentBuilder()
			.setTitle('PDF Extractor')
			.setDescription('API protocol interface of PDF Extractor')
			.setVersion('1.0')
			.addBearerAuth()
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('/api-docs', app, document);

		if (env.NODE_ENV === 'production') {
			const whitelist = env.WHITELIST_REQUESTS?.split(',') ?? [];

			app.enableCors({
				origin: (origin, callback) => {
					if (!origin || whitelist.includes(origin)) {
						return callback(null, true);
					}
					callback(new ForbiddenException('Not allowed by CORS'));
				},
				methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS', 'HEAD'],
				credentials: true,
			});
		}

		await app.listen(env.PORT);

		const serverAddress = await app.getUrl();
		logsAdapter.success('Server', `Server is running at: ${serverAddress}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logsAdapter.error('Server', message);
		process.exit(1);
	}
}

bootstrap();
