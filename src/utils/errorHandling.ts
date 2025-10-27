import * as nls from 'vscode-nls';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export type ErrorCategory =
	| 'parse'
	| 'validation'
	| 'safety'
	| 'operational'
	| 'file-system'
	| 'configuration';

export interface EnhancedError {
	readonly category: ErrorCategory;
	readonly originalError: Error;
	readonly message: string;
	readonly userFriendlyMessage: string;
	readonly suggestion: string;
	readonly recoverable: boolean;
	readonly timestamp: Date;
}

export interface ErrorHandler {
	handle(error: EnhancedError): void;
	dispose(): void;
}

export interface ErrorLogger {
	log(error: EnhancedError): void;
	dispose(): void;
}

export interface ErrorNotifier {
	notify(error: EnhancedError): void;
	dispose(): void;
}

export function createEnhancedError(
	error: Error,
	category: ErrorCategory,
	context?: string,
): EnhancedError {
	return Object.freeze({
		category,
		originalError: error,
		message: error.message,
		userFriendlyMessage: buildUserFriendlyMessage(error, category, context),
		suggestion: buildSuggestion(category),
		recoverable: isRecoverable(error, category),
		timestamp: new Date(),
	});
}

export function createErrorHandler(_config: {
	showParseErrors: boolean;
	notificationsLevel: string;
}): ErrorHandler {
	return Object.freeze({
		handle(error: EnhancedError): void {
			console.error(`[Dates-LE] Error: ${error.message}`);
		},
		dispose(): void {
			// Cleanup if needed
		},
	});
}

export function createErrorLogger(outputChannel: {
	appendLine: (message: string) => void;
}): ErrorLogger {
	return Object.freeze({
		log(error: EnhancedError): void {
			const sanitizedMessage = sanitizeMessage(error.message);
			outputChannel.appendLine(`[Dates-LE] ${sanitizedMessage}`);
		},
		dispose(): void {
			// Cleanup if needed
		},
	});
}

export function createErrorNotifier(): ErrorNotifier {
	return Object.freeze({
		notify(error: EnhancedError): void {
			const sanitizedMessage = sanitizeMessage(error.userFriendlyMessage);
			console.warn(`[Dates-LE] ${sanitizedMessage}`);
		},
		dispose(): void {
			// Cleanup if needed
		},
	});
}

export function sanitizeMessage(message: string): string {
	return message
		.replace(/\/Users\/[^/]+\//g, '/Users/***/')
		.replace(/\/home\/[^/]+\//g, '/home/***/')
		.replace(/C:\\Users\\[^\\]+\\/g, 'C:\\Users\\***\\')
		.replace(/password[=:]\s*[^\s]+/gi, 'password=***')
		.replace(/token[=:]\s*[^\s]+/gi, 'token=***')
		.replace(/key[=:]\s*[^\s]+/gi, 'key=***');
}

function isRecoverable(error: Error, category: ErrorCategory): boolean {
	switch (category) {
		case 'safety':
			return false;
		case 'operational':
			return !error.message.includes('fatal');
		case 'file-system':
			return (
				error.message.includes('permission') ||
				error.message.includes('network')
			);
		default:
			return true;
	}
}

function buildUserFriendlyMessage(
	error: Error,
	category: ErrorCategory,
	context?: string,
): string {
	switch (category) {
		case 'parse':
			return localize(
				'runtime.error.parse',
				'Failed to parse date values: {0}',
				context || 'unknown file',
			);
		case 'file-system':
			return localize(
				'runtime.error.file-system',
				'File system error: {0}',
				error.message,
			);
		case 'configuration':
			return localize(
				'runtime.error.configuration',
				'Configuration error: {0}',
				error.message,
			);
		case 'validation':
			return localize(
				'runtime.error.validation',
				'Date validation failed: {0}',
				error.message,
			);
		case 'safety':
			return localize(
				'runtime.error.safety',
				'Safety threshold exceeded: {0}',
				error.message,
			);
		case 'operational':
			return localize(
				'runtime.error.operational',
				'Date extraction failed: {0}',
				error.message,
			);
		default:
			return localize(
				'runtime.error.unknown',
				'Unknown error: {0}',
				error.message,
			);
	}
}

function buildSuggestion(category: ErrorCategory): string {
	switch (category) {
		case 'parse':
			return localize(
				'runtime.error.parse.suggestion',
				'Check the date format and ensure values are valid',
			);
		case 'file-system':
			return localize(
				'runtime.error.file-system.suggestion',
				'Check file permissions and ensure the file exists',
			);
		case 'configuration':
			return localize(
				'runtime.error.configuration.suggestion',
				'Reset to default settings or check configuration syntax',
			);
		case 'validation':
			return localize(
				'runtime.error.validation.suggestion',
				'Review date values and ensure they meet validation criteria',
			);
		case 'safety':
			return localize(
				'runtime.error.safety.suggestion',
				'Reduce file size or adjust safety thresholds',
			);
		case 'operational':
			return localize(
				'runtime.error.operational.suggestion',
				'Try again or check system resources',
			);
		default:
			return localize(
				'runtime.error.unknown.suggestion',
				'Check the logs for more details and consider reporting this issue',
			);
	}
}

void localize;
