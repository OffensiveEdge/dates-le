import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

type SortOrder = 'asc' | 'desc' | 'alpha-asc' | 'alpha-desc';

interface SortOption {
	label: string;
	value: SortOrder;
}

export function registerSortCommand(context: vscode.ExtensionContext): void {
	const command = vscode.commands.registerCommand(
		'dates-le.postProcess.sort',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage(
					localize('runtime.sort.no-editor', 'No active editor found'),
				);
				return;
			}

			const sortOrder = await promptSortOrder();
			if (!sortOrder) {
				return;
			}

			try {
				const document = editor.document;
				const lines = extractNonEmptyLines(document.getText());
				const sorted = sortLines(lines, sortOrder.value);

				await replaceDocumentContent(document, sorted);

				vscode.window.showInformationMessage(
					localize(
						'runtime.sort.success',
						'Sorted {0} dates ({1})',
						sorted.length,
						sortOrder.label,
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
					localize('runtime.sort.error', 'Sorting failed: {0}', message),
				);
			}
		},
	);

	context.subscriptions.push(command);
}

async function promptSortOrder(): Promise<SortOption | undefined> {
	return vscode.window.showQuickPick<SortOption>(
		[
			{
				label: localize(
					'runtime.sort.pick.chronological-asc',
					'Chronological (Oldest First)',
				),
				value: 'asc',
			},
			{
				label: localize(
					'runtime.sort.pick.chronological-desc',
					'Reverse Chronological (Newest First)',
				),
				value: 'desc',
			},
			{
				label: localize('runtime.sort.pick.alpha-asc', 'Alphabetical (A → Z)'),
				value: 'alpha-asc',
			},
			{
				label: localize('runtime.sort.pick.alpha-desc', 'Alphabetical (Z → A)'),
				value: 'alpha-desc',
			},
		],
		{
			placeHolder: localize(
				'runtime.sort.pick.placeholder',
				'Select sort order',
			),
		},
	);
}

function extractNonEmptyLines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function sortLines(lines: string[], sortOrder: SortOrder): string[] {
	if (sortOrder === 'asc' || sortOrder === 'desc') {
		return sortChronologically(lines, sortOrder);
	}

	return sortAlphabetically(lines, sortOrder);
}

function sortChronologically(lines: string[], sortOrder: SortOrder): string[] {
	const datesWithOriginal = lines.map((line) => ({
		original: line,
		date: new Date(line),
	}));

	return datesWithOriginal
		.sort((a, b) => {
			const aTime = a.date.getTime();
			const bTime = b.date.getTime();

			if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
				return 0;
			}

			if (Number.isNaN(aTime)) {
				return 1;
			}

			if (Number.isNaN(bTime)) {
				return -1;
			}

			return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
		})
		.map((item) => item.original);
}

function sortAlphabetically(lines: string[], sortOrder: SortOrder): string[] {
	return [...lines].sort((a, b) => {
		return sortOrder === 'alpha-asc' ? a.localeCompare(b) : b.localeCompare(a);
	});
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
