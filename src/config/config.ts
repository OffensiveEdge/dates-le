import * as vscode from 'vscode';
import type { Configuration } from '../types';

export type NotificationLevel = 'all' | 'important' | 'silent';

export type Preset =
	| 'minimal'
	| 'balanced'
	| 'comprehensive'
	| 'performance'
	| 'dates';

export function getConfiguration(): Configuration {
	const config = vscode.workspace.getConfiguration('dates-le');

	return Object.freeze({
		copyToClipboardEnabled: Boolean(
			config.get('copyToClipboardEnabled', false),
		),
		dedupeEnabled: Boolean(config.get('dedupeEnabled', false)),
		notificationsLevel: getNotificationLevel(config),
		openResultsSideBySide: Boolean(config.get('openResultsSideBySide', false)),
		safetyEnabled: Boolean(config.get('safety.enabled', true)),
		safetyFileSizeWarnBytes: getMinValue(
			config.get('safety.fileSizeWarnBytes', 1000000),
			1000,
		),
		safetyLargeOutputLinesThreshold: getMinValue(
			config.get('safety.largeOutputLinesThreshold', 50000),
			100,
		),
		safetyManyDocumentsThreshold: getMinValue(
			config.get('safety.manyDocumentsThreshold', 8),
			1,
		),
		showParseErrors: Boolean(config.get('showParseErrors', false)),
		statusBarEnabled: Boolean(config.get('statusBar.enabled', true)),
		telemetryEnabled: Boolean(config.get('telemetryEnabled', false)),
		csvStreamingEnabled: Boolean(config.get('csv.streamingEnabled', false)),
		postProcessOpenInNewFile: Boolean(
			config.get('postProcess.openInNewFile', true),
		),
		analysisEnabled: Boolean(config.get('analysis.enabled', true)),
		analysisIncludeStats: Boolean(config.get('analysis.includeStats', true)),
		performanceEnabled: Boolean(config.get('performance.enabled', true)),
		performanceMaxDuration: getMinValue(
			config.get('performance.maxDuration', 5000),
			1000,
		),
		performanceMaxMemoryUsage: getMinValue(
			config.get('performance.maxMemoryUsage', 104857600),
			1048576,
		),
		performanceMaxCpuUsage: getMinValue(
			config.get('performance.maxCpuUsage', 1000000),
			100000,
		),
		performanceMinThroughput: getMinValue(
			config.get('performance.minThroughput', 1000),
			100,
		),
		performanceMaxCacheSize: getMinValue(
			config.get('performance.maxCacheSize', 1000),
			100,
		),
		keyboardShortcutsEnabled: Boolean(
			config.get('keyboard.shortcuts.enabled', true),
		),
		keyboardExtractShortcut: String(
			config.get('keyboard.extractShortcut', 'ctrl+alt+d'),
		),
		keyboardDedupeShortcut: String(
			config.get('keyboard.dedupeShortcut', 'ctrl+alt+e'),
		),
		keyboardSortShortcut: String(
			config.get('keyboard.sortShortcut', 'ctrl+alt+s'),
		),
		presetsEnabled: Boolean(config.get('presets.enabled', true)),
		presetsDefaultPreset: getPreset(config),
	});
}

function getNotificationLevel(
	config: vscode.WorkspaceConfiguration,
): NotificationLevel {
	const notifRaw = config.get(
		'notificationLevel',
		config.get('notificationsLevel', 'silent'),
	) as unknown;

	if (isValidNotificationLevel(notifRaw)) {
		return notifRaw;
	}

	return 'silent';
}

function getPreset(config: vscode.WorkspaceConfiguration): Preset {
	const presetRaw = config.get('presets.defaultPreset', 'balanced');

	if (isValidPreset(presetRaw)) {
		return presetRaw;
	}

	return 'balanced';
}

function getMinValue(value: unknown, minValue: number): number {
	const numValue = Number(value);

	if (Number.isNaN(numValue)) {
		return minValue;
	}

	return Math.max(minValue, numValue);
}

function isValidNotificationLevel(v: unknown): v is NotificationLevel {
	return v === 'all' || v === 'important' || v === 'silent';
}

function isValidPreset(v: unknown): v is Preset {
	return (
		v === 'minimal' ||
		v === 'balanced' ||
		v === 'comprehensive' ||
		v === 'performance' ||
		v === 'dates'
	);
}
