import { describe, it, expect } from 'vitest';
import { formatDate } from '@/application/utils/formatDate';

// formatDate(value, lang, variant) renders an ISO date string in the locale
// derived from the active i18n language ('en' -> en-US, anything else -> ro-RO),
// using the format options for the requested variant.
describe('formatDate', () => {
  const ISO = '2026-06-10';

  it('given English, when long variant, then uses the English month name', () => {
    // Arrange + Act
    const result = formatDate(ISO, 'en', 'long');

    // Assert
    expect(result).toBe('June 10, 2026');
  });

  it('given Romanian, when long variant, then uses the Romanian month name', () => {
    const result = formatDate(ISO, 'ro', 'long');
    expect(result).toBe('10 iunie 2026');
  });

  it('given an en-US regional code, when formatting, then still resolves to English', () => {
    const result = formatDate(ISO, 'en-US', 'long');
    expect(result).toBe('June 10, 2026');
  });

  it('given an unknown language, when formatting, then falls back to Romanian', () => {
    const result = formatDate(ISO, 'fr', 'long');
    expect(result).toBe('10 iunie 2026');
  });

  it('given the short variant, when English, then abbreviates the month with a year', () => {
    const result = formatDate(ISO, 'en', 'short');
    expect(result).toBe('Jun 10, 2026');
  });

  it('given the dayMonth variant, when English, then omits the year', () => {
    const result = formatDate(ISO, 'en', 'dayMonth');
    expect(result).toBe('Jun 10');
  });

  it('given no variant, then defaults to long', () => {
    expect(formatDate(ISO, 'en')).toBe(formatDate(ISO, 'en', 'long'));
  });
});
