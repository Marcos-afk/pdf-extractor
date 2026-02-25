export abstract class LogsAdapterProps {
	abstract success(scope: string, message: string): void;
	abstract error(scope: string, message: string): void;
	abstract info(scope: string, message: string): void;
}
