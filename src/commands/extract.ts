import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { getConfiguration } from '../config/config';
import { extractDates } from '../extraction/extract';
import type { Telemetry } from '../telemetry/telemetry';
import type { Configuration } from '../types';
import type { Notifier } from '../ui/notifier';
import type { StatusBar } from '../ui/statusBar';
import type { PerformanceMonitor } from '../utils/performance';
import { formatThroughput } from '../utils/performance';
import { handleSafetyChecks } from '../utils/safety';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function registerExtractCommand(
	context: vscode.ExtensionContext,
	deps: Readonly<{
		telemetry: Telemetry;
		notifier: Notifier;
		statusBar: StatusBar;
		performanceMonitor: PerformanceMonitor;
	}>,
): void {
	const command = vscode.commands.registerCommand(
		'dates-le.extractDates',
		async () => {
			deps.telemetry.event('command-extract-dates');

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				deps.notifier.showWarning(
					localize('runtime.extract.no-editor', 'No active editor found'),
				);
				return;
			}

			const document = editor.document;
			const config = getConfiguration();

			const safetyResult = handleSafetyChecks(document, config);
			if (!safetyResult.proceed) {
				deps.notifier.showWarning(safetyResult.message);
				return;
			}

			try {
				deps.statusBar.showProgress(
					localize('runtime.extract.progress', 'Extracting dates...'),
				);

				const timer = deps.performanceMonitor.startTimer('extract-dates');
				const result = await extractDates(
					document.getText(),
					document.languageId,
				);
				const metrics = deps.performanceMonitor.endTimer(timer);

				if (!result.success) {
					const errorMessage = result.errors[0]?.message || 'Unknown error';
					deps.notifier.showError(
						localize(
							'runtime.extract.failed',
							'Failed to extract dates: {0}',
							errorMessage,
						),
					);
					return;
				}

				if (result.dates.length === 0) {
					deps.notifier.showInfo(
						localize(
							'runtime.extract.no-dates',
							'No dates found in the current document',
						),
					);
					return;
				}

				const throughput = calculateThroughput(
					result.dates.length,
					metrics.duration,
				);
				const dateValues = result.dates.map((date) => date.value);

				const opened = await openResults(document, dateValues, config);
				if (!opened) {
					deps.notifier.showError(
						localize('runtime.extract.open-failed', 'Failed to open results'),
					);
					return;
				}

				await handleClipboard(
					dateValues,
					config.copyToClipboardEnabled,
					deps.notifier,
				);

				deps.notifier.showInfo(
					localize(
						'runtime.extract.success',
						'Extracted {0} dates ({1})',
						result.dates.length,
						formatThroughput(throughput),
					),
				);

				deps.telemetry.event('extract-success', { count: result.dates.length });
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: localize(
								'runtime.error.unknown-fallback',
								'Unknown error occurred',
							);
				deps.notifier.showError(`Extraction failed: ${message}`);
				deps.telemetry.event('extract-error', { error: message });
			} finally {
				deps.statusBar.hideProgress();
			}
		},
	);

	context.subscriptions.push(command);
}

function calculateThroughput(count: number, duration: number): number {
	if (duration <= 0) {
		return 0;
	}

	return (count * 1000) / duration;
}

async function openResults(
	document: vscode.TextDocument,
	dateValues: readonly string[],
	config: Configuration,
): Promise<boolean> {
	try {
		if (config.openResultsSideBySide) {
			const doc = await vscode.workspace.openTextDocument({
				content: dateValues.join('\n'),
				language: 'plaintext',
			});
			await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
			return true;
		}

		const edit = new vscode.WorkspaceEdit();
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			dateValues.join('\n'),
		);
		await vscode.workspace.applyEdit(edit);
		return true;
	} catch {
		return false;
	}
}

async function handleClipboard(
	dateValues: readonly string[],
	enabled: boolean,
	notifier: Notifier,
): Promise<void> {
	if (!enabled) {
		return;
	}

	const clipboardText = dateValues.join('\n');
	const maxClipboardSize = 1000000;

	if (clipboardText.length > maxClipboardSize) {
		notifier.showWarning(
			localize(
				'runtime.extract.clipboard.too-large',
				'Results too large for clipboard ({0} characters), skipping clipboard copy',
				clipboardText.length,
			),
		);
		return;
	}

	try {
		await vscode.env.clipboard.writeText(clipboardText);
	} catch (error) {
		notifier.showWarning(
			localize(
				'runtime.extract.clipboard.failed',
				'Failed to copy to clipboard: {0}',
				error instanceof Error ? error.message : 'Unknown error',
			),
		);
	}
}
