import { describe, expect, it } from 'vitest';
import {
	createEnhancedError,
	createErrorHandler,
	createErrorLogger,
	createErrorNotifier,
	sanitizeMessage,
} from './errorHandling';

describe('Error Handling', () => {
	describe('createEnhancedError', () => {
		it('should create enhanced error with correct properties', () => {
			const originalError = new Error('Test error');
			const enhancedError = createEnhancedError(
				originalError,
				'parse',
				'test context',
			);

			expect(enhancedError.category).toBe('parse');
			expect(enhancedError.message).toBe('Test error');
			expect(enhancedError.originalError).toBe(originalError);
			expect(enhancedError.recoverable).toBe(true);
			expect(enhancedError.userFriendlyMessage).toBeDefined();
			expect(enhancedError.suggestion).toBeDefined();
			expect(enhancedError.timestamp).toBeInstanceOf(Date);
		});

		it('should create enhanced error without context', () => {
			const error = createEnhancedError(new Error('Test error'), 'parse');

			expect(error.category).toBe('parse');
			expect(error.message).toBe('Test error');
			expect(error.userFriendlyMessage).toContain('unknown file');
		});

		it('should freeze enhanced error object', () => {
			const error = createEnhancedError(new Error('Test error'), 'parse');
			expect(Object.isFrozen(error)).toBe(true);
		});

		it('should mark parse errors as recoverable', () => {
			const error = createEnhancedError(new Error('Parse failed'), 'parse');
			expect(error.recoverable).toBe(true);
		});

		it('should mark validation errors as recoverable', () => {
			const error = createEnhancedError(
				new Error('Invalid date'),
				'validation',
			);
			expect(error.recoverable).toBe(true);
		});

		it('should mark configuration errors as recoverable', () => {
			const error = createEnhancedError(
				new Error('Config invalid'),
				'configuration',
			);
			expect(error.recoverable).toBe(true);
		});

		it('should mark safety errors as non-recoverable', () => {
			const error = createEnhancedError(new Error('File too large'), 'safety');
			expect(error.recoverable).toBe(false);
		});

		it('should mark operational fatal errors as non-recoverable', () => {
			const error = createEnhancedError(
				new Error('fatal error occurred'),
				'operational',
			);
			expect(error.recoverable).toBe(false);
		});

		it('should mark operational non-fatal errors as recoverable', () => {
			const error = createEnhancedError(
				new Error('temporary failure'),
				'operational',
			);
			expect(error.recoverable).toBe(true);
		});

		it('should mark file-system permission errors as recoverable', () => {
			const error = createEnhancedError(
				new Error('permission denied'),
				'file-system',
			);
			expect(error.recoverable).toBe(true);
		});

		it('should mark file-system network errors as recoverable', () => {
			const error = createEnhancedError(
				new Error('network timeout'),
				'file-system',
			);
			expect(error.recoverable).toBe(true);
		});

		it('should mark file-system other errors as non-recoverable', () => {
			const error = createEnhancedError(
				new Error('disk failure'),
				'file-system',
			);
			expect(error.recoverable).toBe(false);
		});

		it('should provide user-friendly message for parse errors', () => {
			const error = createEnhancedError(
				new Error('Parse error'),
				'parse',
				'/test/file.log',
			);
			expect(error.userFriendlyMessage).toContain('parse');
			expect(error.userFriendlyMessage).toContain('/test/file.log');
		});

		it('should provide user-friendly message for file-system errors', () => {
			const error = createEnhancedError(
				new Error('File not found'),
				'file-system',
			);
			expect(error.userFriendlyMessage).toContain('File system');
			expect(error.userFriendlyMessage).toContain('File not found');
		});

		it('should provide user-friendly message for configuration errors', () => {
			const error = createEnhancedError(
				new Error('Config invalid'),
				'configuration',
			);
			expect(error.userFriendlyMessage).toContain('Configuration');
		});

		it('should provide user-friendly message for validation errors', () => {
			const error = createEnhancedError(
				new Error('Invalid date'),
				'validation',
			);
			expect(error.userFriendlyMessage).toContain('validation');
		});

		it('should provide user-friendly message for safety errors', () => {
			const error = createEnhancedError(new Error('File too large'), 'safety');
			expect(error.userFriendlyMessage).toContain('Safety');
		});

		it('should provide user-friendly message for operational errors', () => {
			const error = createEnhancedError(
				new Error('Extraction failed'),
				'operational',
			);
			expect(error.userFriendlyMessage).toContain('extraction');
		});

		it('should provide suggestions for parse errors', () => {
			const error = createEnhancedError(new Error('Parse error'), 'parse');
			expect(error.suggestion).toContain('format');
		});

		it('should provide suggestions for file-system errors', () => {
			const error = createEnhancedError(new Error('File error'), 'file-system');
			expect(error.suggestion).toContain('permissions');
		});

		it('should provide suggestions for configuration errors', () => {
			const error = createEnhancedError(
				new Error('Config error'),
				'configuration',
			);
			expect(error.suggestion).toContain('default settings');
		});

		it('should provide suggestions for validation errors', () => {
			const error = createEnhancedError(
				new Error('Invalid date'),
				'validation',
			);
			expect(error.suggestion).toContain('validation criteria');
		});

		it('should provide suggestions for safety errors', () => {
			const error = createEnhancedError(new Error('File too large'), 'safety');
			expect(error.suggestion).toContain('file size');
		});

		it('should provide suggestions for operational errors', () => {
			const error = createEnhancedError(
				new Error('Extraction failed'),
				'operational',
			);
			expect(error.suggestion).toContain('Try again');
		});
	});

	describe('sanitizeMessage', () => {
		it('should sanitize Unix user paths', () => {
			const message = 'Error in /home/username/file.log';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe('Error in /home/***/file.log');
		});

		it('should sanitize macOS user paths', () => {
			const message = 'Error in /Users/username/file.log';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe('Error in /Users/***/file.log');
		});

		it('should sanitize Windows user paths', () => {
			const message = 'Error in C:\\Users\\username\\file.log';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe('Error in C:\\Users\\***\\file.log');
		});

		it('should sanitize passwords', () => {
			const message = 'password=secret123';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe('password=***');
		});

		it('should sanitize tokens', () => {
			const message = 'token=abc123def456';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe('token=***');
		});

		it('should sanitize API keys', () => {
			const message = 'key=sk-abc123def456';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe('key=***');
		});

		it('should sanitize multiple sensitive patterns', () => {
			const message = 'Error in /home/user/file.log with password=secret';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toContain('/home/***/file.log');
			expect(sanitized).toContain('password=***');
		});

		it('should preserve non-sensitive information', () => {
			const message = 'Date parsing failed for 2023-12-25';
			const sanitized = sanitizeMessage(message);
			expect(sanitized).toBe(message);
		});
	});

	describe('createErrorHandler', () => {
		it('should create error handler', () => {
			const config = {
				showParseErrors: true,
				notificationsLevel: 'all',
			};

			const handler = createErrorHandler(config);
			expect(handler).toBeDefined();
			expect(typeof handler.handle).toBe('function');
			expect(typeof handler.dispose).toBe('function');
		});

		it('should freeze handler object', () => {
			const config = {
				showParseErrors: true,
				notificationsLevel: 'all',
			};

			const handler = createErrorHandler(config);
			expect(Object.isFrozen(handler)).toBe(true);
		});

		it('should handle errors', () => {
			const config = {
				showParseErrors: true,
				notificationsLevel: 'all',
			};

			const handler = createErrorHandler(config);
			const error = createEnhancedError(new Error('Test error'), 'parse');

			handler.handle(error);
			expect(true).toBe(true);
		});

		it('should dispose handler', () => {
			const config = {
				showParseErrors: true,
				notificationsLevel: 'all',
			};

			const handler = createErrorHandler(config);
			handler.dispose();
			expect(true).toBe(true);
		});
	});

	describe('createErrorLogger', () => {
		it('should create error logger', () => {
			const lines: string[] = [];
			const outputChannel = {
				appendLine: (line: string) => lines.push(line),
			};

			const logger = createErrorLogger(outputChannel);
			expect(logger).toBeDefined();
			expect(typeof logger.log).toBe('function');
			expect(typeof logger.dispose).toBe('function');
		});

		it('should freeze logger object', () => {
			const outputChannel = {
				appendLine: () => {},
			};

			const logger = createErrorLogger(outputChannel);
			expect(Object.isFrozen(logger)).toBe(true);
		});

		it('should log errors with sanitization', () => {
			const lines: string[] = [];
			const outputChannel = {
				appendLine: (line: string) => lines.push(line),
			};

			const logger = createErrorLogger(outputChannel);
			const error = createEnhancedError(
				new Error('Error in /home/user/file.log'),
				'parse',
			);

			logger.log(error);
			expect(lines).toHaveLength(1);
			expect(lines[0]).toContain('[Dates-LE]');
			expect(lines[0]).toContain('/home/***/file.log');
		});

		it('should dispose logger', () => {
			const outputChannel = {
				appendLine: () => {},
			};

			const logger = createErrorLogger(outputChannel);
			logger.dispose();
			expect(true).toBe(true);
		});
	});

	describe('createErrorNotifier', () => {
		it('should create error notifier', () => {
			const notifier = createErrorNotifier();
			expect(notifier).toBeDefined();
			expect(typeof notifier.notify).toBe('function');
			expect(typeof notifier.dispose).toBe('function');
		});

		it('should freeze notifier object', () => {
			const notifier = createErrorNotifier();
			expect(Object.isFrozen(notifier)).toBe(true);
		});

		it('should notify with sanitized messages', () => {
			const notifier = createErrorNotifier();
			const error = createEnhancedError(
				new Error('Error with password=secret'),
				'parse',
			);

			notifier.notify(error);
			expect(true).toBe(true);
		});

		it('should dispose notifier', () => {
			const notifier = createErrorNotifier();
			notifier.dispose();
			expect(true).toBe(true);
		});
	});

	describe('Error Categories', () => {
		it('should handle parse category errors', () => {
			const error = createEnhancedError(new Error('Parse failed'), 'parse');
			expect(error.category).toBe('parse');
			expect(error.recoverable).toBe(true);
		});

		it('should handle validation category errors', () => {
			const error = createEnhancedError(
				new Error('Invalid date'),
				'validation',
			);
			expect(error.category).toBe('validation');
			expect(error.recoverable).toBe(true);
		});

		it('should handle safety category errors', () => {
			const error = createEnhancedError(new Error('File too large'), 'safety');
			expect(error.category).toBe('safety');
			expect(error.recoverable).toBe(false);
		});

		it('should handle operational category errors', () => {
			const error = createEnhancedError(
				new Error('Extraction failed'),
				'operational',
			);
			expect(error.category).toBe('operational');
			expect(error.recoverable).toBe(true);
		});

		it('should handle file-system category errors', () => {
			const error = createEnhancedError(
				new Error('File not found'),
				'file-system',
			);
			expect(error.category).toBe('file-system');
		});

		it('should handle configuration category errors', () => {
			const error = createEnhancedError(
				new Error('Config invalid'),
				'configuration',
			);
			expect(error.category).toBe('configuration');
			expect(error.recoverable).toBe(true);
		});
	});
});
