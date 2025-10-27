import type { DateValue } from '../../types';
import { extractDatesFromLines } from '../dateExtractor';

export function extractFromXml(content: string): DateValue[] {
	const filteredContent = filterXmlComments(content);
	return extractDatesFromLines(filteredContent);
}

function filterXmlComments(content: string): string {
	return content
		.split('\n')
		.filter((line) => !line.trim().startsWith('<!--'))
		.join('\n');
}
