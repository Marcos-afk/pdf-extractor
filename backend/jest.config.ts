import { Config } from 'jest';

const config: Config = {
	moduleFileExtensions: ['js', 'json', 'ts'],
	rootDir: '.',
	testEnvironment: 'node',
	testRegex: 'test/.*\\.(e2e-spec|spec)\\.ts$',
	transform: {
		'^.+\\.(t|j)s$': ['ts-jest', { tsconfig: './tsconfig.json' }],
	},
	moduleNameMapper: {
		'^@application/(.*)$': '<rootDir>/src/application/$1',
		'^@infra/(.*)$': '<rootDir>/src/infra/$1',
		'^@common/(.*)$': '<rootDir>/src/common/$1',
	},
};

export default config;
