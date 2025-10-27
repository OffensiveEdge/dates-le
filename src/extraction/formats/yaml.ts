import type { DateValue } from '../../types';
import { extractDatesFromLines } from '../dateExtractor';

export function extractFromYaml(content: string): DateValue[] {
	return extractDatesFromLines(content);
}
