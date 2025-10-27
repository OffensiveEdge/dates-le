import type { DateValue } from '../../types';
import { extractDatesFromLines } from '../dateExtractor';

const LOG_PATTERN = /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/g;
const SYSLOG_PATTERN = /([A-Za-z]{3}\s+\d{1,2}\s\d{2}:\d{2}:\d{2})/g;
const APACHE_PATTERN =
	/(\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4}\])/g;

export function extractFromLog(content: string): DateValue[] {
	const standardDates = extractDatesFromLines(content);
	const logSpecificDates = extractLogSpecificDates(content);

	return [...standardDates, ...logSpecificDates];
}

function extractLogSpecificDates(content: string): DateValue[] {
	const lines = content.split('\n');
	const dates: DateValue[] = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (!line) {
			continue;
		}

		extractLogFormat(line, lineIndex, dates);
		extractSyslogFormat(line, lineIndex, dates);
		extractApacheFormat(line, lineIndex, dates);
	}

	return dates;
}

function extractLogFormat(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = LOG_PATTERN.exec(line)) !== null) {
		dates.push({
			value: match[0],
			format: 'iso',
			timestamp: Date.parse(match[0]),
			position: { line: lineIndex + 1, column: match.index + 1 },
			context: line.trim(),
		});
	}
}

function extractSyslogFormat(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = SYSLOG_PATTERN.exec(line)) !== null) {
		const currentYear = new Date().getFullYear();
		const fullDate = `${match[0]} ${currentYear}`;
		const parsed = Date.parse(fullDate);

		if (Number.isNaN(parsed)) {
			continue;
		}

		dates.push({
			value: match[0],
			format: 'custom',
			timestamp: parsed,
			position: { line: lineIndex + 1, column: match.index + 1 },
			context: line.trim(),
		});
	}
}

function extractApacheFormat(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = APACHE_PATTERN.exec(line)) !== null) {
		const cleanDate = match[0].replace(/[[\]]/g, '');
		dates.push({
			value: match[0],
			format: 'custom',
			timestamp: Date.parse(cleanDate),
			position: { line: lineIndex + 1, column: match.index + 1 },
			context: line.trim(),
		});
	}
}
