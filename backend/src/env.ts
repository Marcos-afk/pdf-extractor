import 'dotenv/config';

import { logsAdapter } from '@common/adapters/api-logs/api-logs.adapter';
import { z } from 'zod';

const envSchema = z
	.object({
		PORT: z.coerce.number().default(5000),
		NODE_ENV: z
			.enum(['development', 'production', 'test'], {
				error: 'NODE_ENV inválido: use development, production ou test',
			})
			.default('development'),
		WHITELIST_REQUESTS: z.string().optional(),
		ANTHROPIC_KEY: z.string().optional(),
		GEMINI_KEY: z.string().optional(),
		DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL é requerido' }),
	})
	.superRefine((data, ctx) => {
		if (data.NODE_ENV === 'production' && !data.WHITELIST_REQUESTS) {
			ctx.addIssue({
				code: 'custom',
				path: ['WHITELIST_REQUESTS'],
				message: 'WHITELIST_REQUESTS é obrigatório em produção',
			});
		}

		if (!data.ANTHROPIC_KEY && !data.GEMINI_KEY) {
			ctx.addIssue({
				code: 'custom',
				path: ['ANTHROPIC_KEY'],
				message: 'Pelo menos uma chave de API deve ser fornecida: ANTHROPIC_KEY ou GEMINI_KEY',
			});
		}
	});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
	logsAdapter.error(
		'Environment variables',
		JSON.stringify(z.flattenError(parsedEnv.error).fieldErrors, null, 2),
	);

	process.exit(1);
}

export const env = parsedEnv.data;
