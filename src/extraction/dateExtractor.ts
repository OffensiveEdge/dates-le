import type { DateFormat, DateValue } from '../types';

const ISO_PATTERN =
	/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/g;
const RFC2822_PATTERN =
	/([A-Za-z]{3},\s\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}:\d{2}\s[A-Za-z]{3,4})/g;
const UNIX_PATTERN = /(\d{10,13})/g;
const UTC_PATTERN =
	/([A-Za-z]{3}\s[A-Za-z]{3}\s\d{2}\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT[+-]\d{4})/g;
const LOCAL_PATTERN = /(\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}:\d{2})/g;
const SIMPLE_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/g;

export function extractDatesFromLines(content: string): DateValue[] {
	const lines = content.split('\n');
	const dates: DateValue[] = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (!line) {
			continue;
		}

		extractFromLine(line, lineIndex, dates);
	}

	return deduplicateDates(dates);
}

function extractFromLine(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	extractIsoDate(line, lineIndex, dates);
	extractRfc2822Date(line, lineIndex, dates);
	extractUnixTimestamp(line, lineIndex, dates);
	extractUtcDate(line, lineIndex, dates);
	extractLocalDate(line, lineIndex, dates);
	extractSimpleDate(line, lineIndex, dates);
}

function extractIsoDate(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = ISO_PATTERN.exec(line)) !== null) {
		dates.push(
			createDateValue(match[0], 'iso', lineIndex, match.index, line.trim()),
		);
	}
}

function extractRfc2822Date(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = RFC2822_PATTERN.exec(line)) !== null) {
		dates.push(
			createDateValue(match[0], 'rfc2822', lineIndex, match.index, line.trim()),
		);
	}
}

function extractUnixTimestamp(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = UNIX_PATTERN.exec(line)) !== null) {
		const timestamp = parseInt(match[0], 10);

		if (!isValidUnixTimestamp(timestamp)) {
			continue;
		}

		const timestampMs = convertToMilliseconds(match[0], timestamp);
		dates.push({
			value: match[0],
			format: 'unix',
			timestamp: timestampMs,
			position: { line: lineIndex + 1, column: match.index + 1 },
			context: line.trim(),
		});
	}
}

function extractUtcDate(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = UTC_PATTERN.exec(line)) !== null) {
		dates.push(
			createDateValue(match[0], 'utc', lineIndex, match.index, line.trim()),
		);
	}
}

function extractLocalDate(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = LOCAL_PATTERN.exec(line)) !== null) {
		dates.push(
			createDateValue(match[0], 'local', lineIndex, match.index, line.trim()),
		);
	}
}

function extractSimpleDate(
	line: string,
	lineIndex: number,
	dates: DateValue[],
): void {
	let match: RegExpExecArray | null;
	while ((match = SIMPLE_DATE_PATTERN.exec(line)) !== null) {
		dates.push(
			createDateValue(match[0], 'simple', lineIndex, match.index, line.trim()),
		);
	}
}

function createDateValue(
	value: string,
	format: DateFormat,
	lineIndex: number,
	columnIndex: number,
	context: string,
): DateValue {
	return {
		value,
		format,
		timestamp: Date.parse(value),
		position: { line: lineIndex + 1, column: columnIndex + 1 },
		context,
	};
}

function isValidUnixTimestamp(timestamp: number): boolean {
	const isValidSeconds = timestamp > 1000000000 && timestamp < 9999999999;
	const isValidMilliseconds =
		timestamp > 1000000000000 && timestamp < 9999999999999;

	return isValidSeconds || isValidMilliseconds;
}

function convertToMilliseconds(value: string, timestamp: number): number {
	if (value.length === 10) {
		return timestamp * 1000;
	}

	return timestamp;
}

function deduplicateDates(dates: DateValue[]): DateValue[] {
	const filtered = filterOverlappingDates(dates);
	return deduplicateByValueAndLine(filtered);
}

function filterOverlappingDates(dates: DateValue[]): DateValue[] {
	return dates.filter((date) => {
		if (date.format !== 'simple' || !date.position) {
			return true;
		}

		const hasMoreSpecificDate = dates.some(
			(other) =>
				other.format === 'iso' &&
				other.position &&
				other.position.line === date.position?.line &&
				other.value.includes(date.value),
		);

		return !hasMoreSpecificDate;
	});
}

function deduplicateByValueAndLine(dates: DateValue[]): DateValue[] {
	const uniqueMap = new Map<string, DateValue>();

	for (const date of dates) {
		const key = `${date.value}-${date.position?.line ?? 0}`;
		uniqueMap.set(key, date);
	}

	return Array.from(uniqueMap.values());
}
