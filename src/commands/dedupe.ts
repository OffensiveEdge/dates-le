import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function registerDedupeCommand(context: vscode.ExtensionContext): void {
	const command = vscode.commands.registerCommand(
		'dates-le.postProcess.dedupe',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage(
					localize('runtime.dedupe.no-editor', 'No active editor found'),
				);
				return;
			}

			try {
				const document = editor.document;
				const text = document.getText();
				const lines = text.split('\n').map((line) => line.trim());

				const deduped = deduplicateLines(lines);
				const removedCount = lines.length - deduped.length;

				await replaceDocumentContent(document, deduped);

				vscode.window.showInformationMessage(
					localize(
						'runtime.dedupe.success',
						'Removed {0} duplicate dates ({1} remaining)',
						removedCount,
						deduped.length,
					),
				);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: localize(
								'runtime.error.unknown-fallback',
								'Unknown error occurred',
							);
				vscode.window.showErrorMessage(
					localize(
						'runtime.dedupe.error',
						'Deduplication failed: {0}',
						message,
					),
				);
			}
		},
	);

	context.subscriptions.push(command);
}

function deduplicateLines(lines: string[]): string[] {
	const seen = new Set<string>();
	const deduped: string[] = [];

	for (const line of lines) {
		if (line === '' || seen.has(line)) {
			continue;
		}

		seen.add(line);
		deduped.push(line);
	}

	return deduped;
}

async function replaceDocumentContent(
	document: vscode.TextDocument,
	lines: string[],
): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(
		document.uri,
		new vscode.Range(0, 0, document.lineCount, 0),
		lines.join('\n'),
	);
	await vscode.workspace.applyEdit(edit);
}
