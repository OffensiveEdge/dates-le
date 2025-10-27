import type { DateValue } from '../../types';
import { extractDatesFromLines } from '../dateExtractor';

export function extractFromCsv(content: string): DateValue[] {
	return extractDatesFromLines(content);
}
