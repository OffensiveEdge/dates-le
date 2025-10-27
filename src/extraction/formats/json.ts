import type { DateValue } from '../../types';
import { extractDatesFromLines } from '../dateExtractor';

export function extractFromJson(content: string): DateValue[] {
	return extractDatesFromLines(content);
}
