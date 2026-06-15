export type DateVariant = 'long' | 'short' | 'dayMonth';

const OPTIONS: Record<DateVariant, Intl.DateTimeFormatOptions> = {
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  short: { day: 'numeric', month: 'short', year: 'numeric' },
  dayMonth: { day: 'numeric', month: 'short' },
};

export function formatDate(value: string, lang: string, variant: DateVariant = 'long'): string {
  const locale = lang.startsWith('en') ? 'en-US' : 'ro-RO';
  return new Date(value).toLocaleDateString(locale, OPTIONS[variant]);
}
