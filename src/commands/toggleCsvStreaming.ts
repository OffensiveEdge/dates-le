import * as vscode from 'vscode';
import { getConfiguration } from '../config/config';
import type { Telemetry } from '../telemetry/telemetry';

export function registerToggleCsvStreamingCommand(
	context: vscode.ExtensionContext,
	telemetry: Telemetry,
): void {
	const command = vscode.commands.registerCommand(
		'dates-le.csv.toggleStreaming',
		async () => {
			telemetry.event('command-toggle-csv-streaming');

			const config = getConfiguration();
			const currentValue = config.csvStreamingEnabled;
			const newValue = !currentValue;

			// Update the configuration
			await vscode.workspace
				.getConfiguration('dates-le')
				.update(
					'csv.streamingEnabled',
					newValue,
					vscode.ConfigurationTarget.Global,
				);

			// Show notification
			const message = newValue
				? 'CSV streaming enabled'
				: 'CSV streaming disabled';

			vscode.window.showInformationMessage(`Dates-LE: ${message}`);
		},
	);

	context.subscriptions.push(command);
}
